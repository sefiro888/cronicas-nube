import { useEffect, useRef, useState } from 'react'
import { CARD_BY_ID, COMMANDER_BY_ID, type AnimationEvent, type PlayerId } from '../../game'
import { HURT_QUOTE_DAMAGE, quoteFor, type QuoteMoment } from '../commanderQuotes'
import { attackKindFor } from '../attackStyle'
import { REPLAY_MARK } from '../../store/match'
import { playSynthCue, type SoundCue } from '../../services/audio'
import { useMatchStore } from '../../store/match'
import type { PreferencesState } from '../../store/preferences'
import { ARRIVAL_LANDING } from '../arrivalMotion'
import { eventDuration } from '../eventTiming'
import { clashExchange, duelIntroDuration, endsExchange, foldExchange, isFinisher, openExchange, pushRecentPlay, recentPlayFor, spotlightFor, type CombatExchange, type RecentPlay, type Spotlight } from '../presentation'

/** Traduce un evento del motor a su señal sonora. `me` es el bando que controla este navegador. */
export interface Reaction {
  readonly key: string
  readonly kind: 'block' | 'burst' | 'silence'
  readonly title: string
  readonly detail: string
}

/** Daños que salen de una muerte o una explosión y pueden encadenar más muertes. */
const CHAIN_EFFECT = /petardazo|mine|splash|explos|deathburst/

const cueForEvent = (event: AnimationEvent, me: PlayerId): SoundCue | undefined => {
  switch (event.type) {
    case 'draw': return 'draw'
    case 'resource': return 'resource'
    case 'mana-flow': return undefined
    case 'summon': return 'summon'
    case 'spell': return 'spell'
    case 'move': return 'move'
    case 'attack': {
      // Cada tipo de criatura suena a su manera (acero, zarpa, pólvora...).
      const card = event.cardId ? CARD_BY_ID[event.cardId] : undefined
      const kind = attackKindFor(card, (card?.range ?? 1) <= 1)
      return kind === 'orb' ? 'attack' : kind === 'barbs' ? 'attack-claw' : `attack-${kind}`
    }
    case 'damage': return 'impact'
    case 'nexus-damage': return 'impact'
    case 'shield': return 'shield'
    case 'destroy': return 'destroy'
    case 'freeze': return 'freeze'
    case 'reveal': return 'reveal'
    case 'turn': return 'turn'
    case 'victory': return event.actorId === me ? 'victory' : 'defeat'
    default: return undefined
  }
}

/**
 * Ritmo de reproducción por tipo de evento: la contabilidad (robos, fuentes,
 * flujo de maná) corre más deprisa que los golpes para que los turnos fluyan
 * sin perder la lectura de las acciones importantes.
 */

/**
 * Categoría visual del aviso central, para colorearlo y darle un icono según
 * lo que de verdad ocurrió (el usuario pedía que un hechizo o un golpe se
 * notaran de un vistazo, no solo leyendo el texto). Se deriva del propio
 * texto ya redactado por `actionDescription` en vez de duplicar esa lógica
 * aquí — barato y no exige tocar la forma del store.
 */
export type EventBannerKind = 'damage' | 'spell' | 'power' | 'summon' | 'nexus' | 'info'

const bannerKindFor = (text: string): EventBannerKind => {
  if (text.startsWith('¡Hechizo!')) return 'spell'
  // Cualquier otro aviso que empiece con «¡» es un poder de comandante (ver
  // `actionDescription` en store/match.ts) — antes esto ni siquiera se
  // anunciaba bien, caía en el texto genérico de "cede el turno".
  if (text.startsWith('¡')) return 'power'
  if (text.includes('golpea el Nexo')) return 'nexus'
  if (text.includes('inflige') || /\(−\d+\)/.test(text)) return 'damage'
  if (text.includes('entra en juego')) return 'summon'
  return 'info'
}

export interface EventDirector {
  /** Aviso grande de cambio de turno («Tu turno» / «Turno rival»). */
  banner?: string
  /** Aviso central de la última acción ocurrida, tomado de la crónica de batalla. */
  eventBanner: string | undefined
  /** Categoría del aviso central actual, para colorearlo (ver `bannerKindFor`). */
  eventBannerKind: EventBannerKind
  /** Destello de pantalla al golpear un Nexo: 'self' si es el propio (aviso de peligro), 'rival' si es el enemigo. */
  nexusFlash?: 'self' | 'rival'
  /** Carta que el escrutinio acaba de revelar, para el aviso flotante. */
  revealedCardId?: string
  /** Cuántas cartas hay que ordenar ahora mismo (0 = no hay escrutinio abierto). */
  scryAmount: number
  scryOrder: readonly string[]
  setScryAmount: (amount: number) => void
  setScryOrder: React.Dispatch<React.SetStateAction<readonly string[]>>
  /** Carta lanzada que se presenta en grande antes de resolverse. */
  spotlight?: Spotlight
  /** Cierra la presentación antes de tiempo (clic, Espacio o Escape). */
  dismissSpotlight: () => void
  /** Si el duelo está detenido enseñando las cartas antes del golpe. */
  duelHolding: boolean
  /** Deja caer el golpe sin esperar a que acabe la presentación del duelo. */
  dismissDuel: () => void
  /** Quién golpea a quién en el intercambio que se está reproduciendo. */
  exchange?: CombatExchange
  /** Frase del comandante que habla ahora. */
  quote?: { readonly key: string; readonly owner: PlayerId; readonly text: string }
  /** Respuesta del tablero a la jugada en curso (Escudo, Petardazo, silencio). */
  reaction?: Reaction
  /** Reacción en cadena en curso (desde la segunda muerte encadenada). */
  chain?: { readonly key: string; readonly count: number }
  /** Racha de ataques del mismo bando en este turno (desde el segundo). */
  combo?: { readonly key: string; readonly count: number; readonly owner: PlayerId }
  /** Sacudida de pantalla: clave nueva por golpe y su fuerza. */
  impact?: { readonly key: string; readonly strength: 'light' | 'heavy' }
  /** Últimas jugadas de ambos bandos, la más reciente primero. */
  recentPlays: readonly RecentPlay[]
  /** Limpia los avisos al empezar una partida nueva (revancha o repetición). */
  resetBanners: () => void
}

/**
 * Reproduce la cola de animaciones del motor: sonido, temporización y los
 * canales laterales que abren interfaz (escrutinio, revelaciones, avisos).
 *
 * Vive fuera de BattlePage porque no depende de nada del render de la
 * pantalla: solo del store de partida, de las preferencias y de qué bando
 * controla este navegador.
 */
export const useEventDirector = (me: PlayerId, preferences: PreferencesState): EventDirector => {
  const currentEvent = useMatchStore((state) => state.currentEvent)
  const pendingCount = useMatchStore((state) => state.pendingAnimations.length)
  const history = useMatchStore((state) => state.history)
  const [banner, setBanner] = useState<string>()
  const [eventBanner, setEventBanner] = useState<string>()
  const [eventBannerKind, setEventBannerKind] = useState<EventBannerKind>('info')
  const [nexusFlash, setNexusFlash] = useState<'self' | 'rival'>()
  const [revealedCardId, setRevealedCardId] = useState<string>()
  const [scryAmount, setScryAmount] = useState(0)
  const [scryOrder, setScryOrder] = useState<readonly string[]>([])
  /** Última referencia de `history` ya anunciada: evita reanunciar entradas viejas al recargar una partida guardada. */
  const lastHistoryRef = useRef(history)
  const [spotlight, setSpotlight] = useState<Spotlight>()
  /** Resultado de la jugada presentada; se anuncia cuando su efecto ya se ha visto. */
  const pendingResultRef = useRef<string | undefined>(undefined)
  /** Eventos ya presentados: al cerrar la carta, la cola debe avanzar y no volver a enseñarla. */
  const presentedRef = useRef(new Set<string>())
  const [exchange, setExchange] = useState<CombatExchange>()
  const [impact, setImpact] = useState<{ readonly key: string; readonly strength: 'light' | 'heavy' }>()
  const [duelHold, setDuelHold] = useState<{ readonly key: string; readonly durationMs: number }>()
  const [recentPlays, setRecentPlays] = useState<readonly RecentPlay[]>([])
  /**
   * Ataques encadenados por el mismo bando en un turno. A partir del segundo
   * se enseña «Combo ×N» y los efectos del duelo crecen: el propietario quería
   * que encadenar golpes se sintiera como una racha.
   */
  const [combo, setCombo] = useState<{ readonly key: string; readonly count: number; readonly owner: PlayerId }>()
  const comboRef = useRef<{ owner?: PlayerId; count: number }>({ count: 0 })
  /**
   * Reacción en cadena: una muerte que provoca otra (el Petardazo de una
   * unidad que cae mata a su vecina, que a su vez estalla...). Se cuenta
   * cada destrucción que llega justo detrás de un daño de explosión.
   */
  const [chain, setChain] = useState<{ readonly key: string; readonly count: number }>()
  /**
   * Respuesta: algo del tablero reacciona a la jugada (un Escudo absorbe el
   * golpe, una unidad estalla al morir, una carta deja a otra sin
   * habilidades). En las reglas no hay contrahechizos que anulen cartas;
   * estas son las reacciones que sí existen y que antes pasaban sin aviso.
   */
  const [reaction, setReaction] = useState<Reaction>()
  /** Bocadillo del comandante que habla ahora (poder, golpe fuerte o victoria). */
  const [quote, setQuote] = useState<{ readonly key: string; readonly owner: PlayerId; readonly text: string }>()
  const reactedRef = useRef(new Set<string>())
  /** Evento que abrió la jugada en curso: agrupa las respuestas de una misma jugada. */
  const playRootRef = useRef('')
  const chainRef = useRef({ count: 0, splash: false })

  // 1) Si no hay evento en reproducción, avanza la cola. Antes de una carta
  // lanzada se detiene a presentarla: es el único momento en que ambos bandos
  // pueden leer qué se ha jugado antes de que el tablero cambie.
  useEffect(() => {
    if (currentEvent || pendingCount === 0 || spotlight || duelHold) return
    const state = useMatchStore.getState()
    const next = state.pendingAnimations[0]
    // Antes de un ataque, las dos cartas se presentan frente a frente; el
    // golpe cae al terminar. Sin esta pausa la embestida duraba menos de lo
    // que se tarda en encontrar las dos fichas en el tablero.
    const introMs = duelIntroDuration(preferences.presentationPace, preferences.animationSpeed)
    if (next?.type === 'attack' && introMs > 0 && !preferences.reducedMotion && !presentedRef.current.has(next.id)) {
      const attacker = state.match?.board.find((piece) => piece.instanceId === next.actorId)
      const base = openExchange(next, attacker?.owner ?? state.match?.activePlayer ?? me, state.match?.board)
      const finisher = base ? isFinisher(next, state.pendingAnimations, state.match) : false
      const opened = base && finisher ? { ...base, finisher } : base
      if (opened) {
        const deferred = window.setTimeout(() => {
          presentedRef.current.add(next.id)
          setExchange(opened)
          // El golpe decisivo se queda un poco más en pantalla antes de caer.
          setDuelHold({ key: next.id, durationMs: finisher ? introMs * 1.35 : introMs })
        }, 0)
        return () => window.clearTimeout(deferred)
      }
    }
    if (next?.cast && !presentedRef.current.has(next.id)) {
      const shown = spotlightFor(next, state.match, me, {
        pace: preferences.presentationPace, animationSpeed: preferences.animationSpeed,
        impact: state.castImpacts[next.id],
      })
      if (shown) {
        const latest = state.history[state.history.length - 1]
        // Se marca como presentado al mostrarse, no antes: si el efecto se
        // relanza en este mismo tic, el temporizador cancelado no debe dejar
        // la carta por presentada sin haberse visto.
        const deferred = window.setTimeout(() => {
          presentedRef.current.add(next.id)
          setSpotlight(shown)
          pendingResultRef.current = latest
          setExchange(undefined)
        }, 0)
        return () => window.clearTimeout(deferred)
      }
    }
    state.advanceEvent()
    return undefined
  }, [currentEvent, pendingCount, spotlight, duelHold, me, preferences.presentationPace, preferences.animationSpeed, preferences.reducedMotion])

  useEffect(() => {
    if (!duelHold) return
    const timer = window.setTimeout(() => setDuelHold(undefined), duelHold.durationMs)
    return () => window.clearTimeout(timer)
  }, [duelHold])

  useEffect(() => {
    if (!spotlight) return
    if (!preferences.muted) playSynthCue('spotlight')
    const timer = window.setTimeout(() => setSpotlight(undefined), spotlight.durationMs)
    return () => window.clearTimeout(timer)
  }, [spotlight, preferences.muted])

  // 2) Reproduce el evento actual: sonido, canales laterales y temporización.
  useEffect(() => {
    if (!currentEvent) return
    const state = useMatchStore.getState()
    const cue = cueForEvent(currentEvent, me)
    if (cue && !preferences.muted) {
      playSynthCue(cue)
    }
    // Los canales laterales actualizan estado de React fuera del cuerpo del
    // efecto para no encadenar renders síncronos.
    const sideChannel = window.setTimeout(() => {
      // Respuestas (ver `reaction`). Una por jugada y tipo para no repetirlas.
      if (currentEvent.type === 'attack' || currentEvent.cast || currentEvent.type === 'turn') playRootRef.current = currentEvent.id
      const rootKey = playRootRef.current
      const respond = (next: Reaction) => {
        const id = `${rootKey}-${next.kind}`
        if (reactedRef.current.has(id)) return
        reactedRef.current.add(id)
        setReaction({ ...next, key: currentEvent.id })
      }
      if (currentEvent.type === 'shield' && (currentEvent.amount ?? 0) > 0) {
        respond({ key: '', kind: 'block', title: '¡Bloqueado!', detail: `El Escudo absorbe ${currentEvent.amount}` })
      } else if (currentEvent.type === 'damage' && /petardazo/.test(currentEvent.effectId ?? '')) {
        respond({ key: '', kind: 'burst', title: '¡Petardazo!', detail: 'Estalla al morir y daña a sus vecinas' })
      } else if (currentEvent.cast && state.castImpacts[currentEvent.id]?.pieces.some((piece) => piece.changes.some((change) => change.label === 'Silenciada'))) {
        respond({ key: '', kind: 'silence', title: '¡Anulada!', detail: 'Sus habilidades dejan de actuar' })
      }
      // Frases de los comandantes (ver commanderQuotes).
      const speak = (owner: PlayerId, moment: QuoteMoment) => {
        const commanderId = state.match?.players[owner].commanderId
        const faction = commanderId ? COMMANDER_BY_ID[commanderId]?.faction : undefined
        if (faction) setQuote({ key: currentEvent.id, owner, text: quoteFor(faction, moment, currentEvent.id) })
      }
      if (currentEvent.cast?.kind === 'power' && (currentEvent.actorId === 'player' || currentEvent.actorId === 'ai')) speak(currentEvent.actorId, 'power')
      else if (currentEvent.type === 'nexus-damage' && (currentEvent.amount ?? 0) >= HURT_QUOTE_DAMAGE && currentEvent.targetId?.endsWith('-nexus') && !currentEvent.id.includes(REPLAY_MARK)) {
        speak(currentEvent.targetId.replace('-nexus', '') as PlayerId, 'hurt')
      } else if (currentEvent.type === 'victory' && (currentEvent.actorId === 'player' || currentEvent.actorId === 'ai')) speak(currentEvent.actorId, 'win')
      // Reacción en cadena (ver chainRef): se reinicia con cada jugada nueva.
      const run = chainRef.current
      if (currentEvent.type === 'attack' || currentEvent.cast || currentEvent.type === 'turn') {
        chainRef.current = { count: 0, splash: false }
      } else if (currentEvent.type === 'damage' && CHAIN_EFFECT.test(currentEvent.effectId ?? '')) {
        run.splash = true
      } else if (currentEvent.type === 'destroy') {
        run.count = run.splash ? Math.max(1, run.count) + 1 : Math.max(1, run.count)
        if (run.splash && run.count >= 2) setChain({ key: currentEvent.id, count: run.count })
        run.splash = false
      }
      if (currentEvent.type === 'turn') {
        comboRef.current = { count: 0 }
        setCombo(undefined)
        setBanner(currentEvent.actorId === me ? 'Tu turno' : 'Turno rival')
      }
      if (currentEvent.type === 'spell' && currentEvent.effectId === 'scry-top-cards' && currentEvent.actorId === me) {
        const amount = Math.min(currentEvent.amount ?? 1, state.match?.players[me].deck.length ?? 0)
        if (amount > 0) {
          setScryAmount(amount)
          setScryOrder(state.match?.players[me].deck.slice(0, amount).map((card) => card.instanceId) ?? [])
        }
      }
      if (currentEvent.type === 'reveal' && currentEvent.actorId === me) {
        const revealed = state.match?.players[me].deck.find((card) => card.instanceId === currentEvent.targetId)
        if (revealed) setRevealedCardId(revealed.cardId)
      }
      // Destello de pantalla al golpear un Nexo: el propio da un aviso de
      // peligro más urgente (rojo, más fuerte) que el del rival.
      if (currentEvent.type === 'nexus-damage' && (currentEvent.amount ?? 0) > 0) {
        setNexusFlash(currentEvent.targetId === `${me}-nexus` ? 'self' : 'rival')
      }
      // Rótulo de combate: el ataque lo abre y el daño o la muerte que llegan
      // detrás se suman a él, de modo que el contragolpe queda en el mismo
      // intercambio y no parece otro ataque distinto.
      if (currentEvent.type === 'attack') {
        // El dueño se lee de la pieza: el turno activo falla con golpes que
        // ocurren fuera de turno (represalias, efectos al inicio del turno).
        const attacker = state.match?.board.find((piece) => piece.instanceId === currentEvent.actorId)
        const owner = attacker?.owner ?? state.match?.activePlayer ?? me
        const run = comboRef.current
        run.count = run.owner === owner ? run.count + 1 : 1
        run.owner = owner
        if (run.count >= 2) setCombo({ key: currentEvent.id, count: run.count, owner })
        setExchange((open) => {
          if (open?.key === currentEvent.id) return clashExchange(open)
          const opened = openExchange(currentEvent, attacker?.owner ?? state.match?.activePlayer ?? me, state.match?.board)
          return opened ? clashExchange(opened) : undefined
        })
      } else if (endsExchange(currentEvent)) {
        setExchange(undefined)
      } else {
        setExchange((open) => (open ? foldExchange(open, currentEvent) : open))
      }
      // Una jugada repetida no vuelve a entrar en el historial.
      const play = currentEvent.id.includes(REPLAY_MARK) ? undefined : recentPlayFor(currentEvent, state.match?.board ?? [])
      if (play) setRecentPlays((list) => pushRecentPlay(list, play))
      const amount = currentEvent.amount ?? 0
      if (currentEvent.type === 'destroy' || currentEvent.type === 'nexus-damage' || (currentEvent.type === 'damage' && amount > 0)) {
        const heavy = currentEvent.type === 'destroy' || currentEvent.type === 'nexus-damage' || amount >= 4
        setImpact({ key: currentEvent.id, strength: heavy ? 'heavy' : 'light' })
      }
    }, 0)
    const duration = eventDuration(currentEvent, {
      animationSpeed: preferences.animationSpeed, reducedMotion: preferences.reducedMotion,
      presentationPace: preferences.presentationPace,
    })
    // La sacudida de una invocación llega al aterrizar, no al empezar a caer.
    const landing = currentEvent.type === 'summon' && !preferences.reducedMotion
      ? window.setTimeout(() => {
        setImpact({ key: `${currentEvent.id}-land`, strength: currentEvent.cast ? 'heavy' : 'light' })
        if (!preferences.muted) playSynthCue('land')
      }, duration * ARRIVAL_LANDING)
      : undefined
    const timer = window.setTimeout(() => useMatchStore.getState().finishEvent(), duration)
    return () => {
      window.clearTimeout(sideChannel)
      window.clearTimeout(timer)
      window.clearTimeout(landing)
    }
  }, [currentEvent, preferences.animationSpeed, preferences.effectsVolume, preferences.masterVolume, preferences.muted, preferences.reducedMotion, preferences.presentationPace, me])

  useEffect(() => {
    if (!quote) return
    const timer = window.setTimeout(() => setQuote(undefined), 3400)
    return () => window.clearTimeout(timer)
  }, [quote])

  useEffect(() => {
    if (!reaction) return
    const timer = window.setTimeout(() => setReaction(undefined), 1900)
    return () => window.clearTimeout(timer)
  }, [reaction])

  useEffect(() => {
    if (!chain) return
    const timer = window.setTimeout(() => setChain(undefined), 2200)
    return () => window.clearTimeout(timer)
  }, [chain])

  // Cada habilidad que se enciende en el duelo suena una vez: el brillo
  // dorado se ve, pero entre el golpe y el daño se perdía sin un aviso sonoro.
  const triggeredRef = useRef({ key: '', count: 0 })
  useEffect(() => {
    if (!exchange) return
    const count = exchange.attacker.triggered.length + exchange.defender.triggered.length
    const seen = triggeredRef.current
    if (seen.key === exchange.key && count > seen.count && !preferences.muted) playSynthCue('trait')
    triggeredRef.current = { key: exchange.key, count }
  }, [exchange, preferences.muted])

  // El rótulo de combate se apaga poco después de vaciarse la cola: dejarlo
  // fijo ensuciaba el tablero mientras el jugador piensa su turno.
  useEffect(() => {
    if (!exchange || currentEvent || pendingCount > 0) return
    const timer = window.setTimeout(() => setExchange(undefined), 1800)
    return () => window.clearTimeout(timer)
  }, [exchange, currentEvent, pendingCount])

  // Con la cola vacía, el efecto de la carta presentada ya se ha visto en el
  // tablero: ahora sí se cuenta qué ha hecho.
  useEffect(() => {
    if (spotlight || currentEvent || pendingCount > 0 || !pendingResultRef.current) return
    const text = pendingResultRef.current
    const deferred = window.setTimeout(() => {
      pendingResultRef.current = undefined
      setEventBanner(text)
      setEventBannerKind(bannerKindFor(text))
    }, 0)
    return () => window.clearTimeout(deferred)
  }, [spotlight, currentEvent, pendingCount])

  useEffect(() => {
    if (!impact) return
    const timer = window.setTimeout(() => setImpact(undefined), 520)
    return () => window.clearTimeout(timer)
  }, [impact])

  useEffect(() => {
    if (!banner) return
    // 2 s: el telón de facción necesita abrirse, mostrarse y cerrarse.
    const timer = window.setTimeout(() => setBanner(undefined), 2000)
    return () => window.clearTimeout(timer)
  }, [banner])

  // ── Aviso central de eventos: anuncia cada acción según ocurre ────────────
  // Reutiliza el mismo texto que ya se anota en «Crónica de batalla», para no
  // mantener dos redacciones distintas del mismo suceso.
  //
  // BUG arreglado: `history` en el store se recorta a los últimos 10
  // registros (`current.history.slice(-9)` + el nuevo) — antes esto se
  // detectaba comparando LONGITUDES (`history.length`), así que en cuanto la
  // partida acumulaba 10 entradas la longitud se quedaba fija en 10 para
  // siempre y la condición `length <= lastLength` pasaba a ser cierta en
  // TODO dispatch posterior, apagando el aviso central para el resto de la
  // partida (el usuario lo reportó: "solo se vio las dos primeras jugadas").
  // Comparar la REFERENCIA del array, que SIEMPRE cambia en cada dispatch
  // (se reconstruye con spread aunque el tamaño no crezca), no tiene ese
  // techo.
  useEffect(() => {
    if (history === lastHistoryRef.current) return undefined
    const latest = history[history.length - 1]
    lastHistoryRef.current = history
    if (!latest || latest === 'Has cedido el turno.' || latest === 'Se cede el turno.') return undefined
    // Si la jugada se va a presentar en grande, su resultado viaja dentro de
    // la carta; el aviso central contaba el final antes de verse el hechizo.
    const queue = useMatchStore.getState().pendingAnimations
    if (queue.some((event) => event.cast) && preferences.presentationPace !== 'fast') return undefined
    // setState se difiere fuera del cuerpo del efecto: mismo patrón que ya usa
    // el director de animaciones un poco más arriba para sus canales laterales.
    const sideChannel = window.setTimeout(() => {
      setEventBanner(latest)
      setEventBannerKind(bannerKindFor(latest))
    }, 0)
    return () => window.clearTimeout(sideChannel)
  }, [history, preferences.presentationPace])

  useEffect(() => {
    if (!eventBanner) return
    const timer = window.setTimeout(() => setEventBanner(undefined), 1900)
    return () => window.clearTimeout(timer)
  }, [eventBanner])

  useEffect(() => {
    if (!revealedCardId) return
    const timer = window.setTimeout(() => setRevealedCardId(undefined), 2600)
    return () => window.clearTimeout(timer)
  }, [revealedCardId])

  useEffect(() => {
    if (!nexusFlash) return
    const timer = window.setTimeout(() => setNexusFlash(undefined), 480)
    return () => window.clearTimeout(timer)
  }, [nexusFlash])

  const resetBanners = () => {
    lastHistoryRef.current = []
    setEventBanner(undefined)
    setNexusFlash(undefined)
    setSpotlight(undefined)
    setExchange(undefined)
    setDuelHold(undefined)
    pendingResultRef.current = undefined
    setRecentPlays([])
  }

  const dismissSpotlight = () => setSpotlight(undefined)
  const dismissDuel = () => setDuelHold(undefined)

  return {
    banner,
    eventBanner,
    eventBannerKind,
    nexusFlash,
    revealedCardId,
    scryAmount,
    scryOrder,
    setScryAmount,
    setScryOrder,
    spotlight,
    dismissSpotlight,
    duelHolding: Boolean(duelHold),
    dismissDuel,
    exchange,
    combo,
    chain,
    reaction,
    quote,
    impact,
    recentPlays,
    resetBanners,
  }
}
