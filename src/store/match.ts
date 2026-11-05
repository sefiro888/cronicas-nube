import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  applyAction,
  CARD_BY_ID,
  clearAnimationQueue,
  COMMANDER_BY_ID,
  createMatch,
  nextRandom,
  STARTER_DECKS,
  type AnimationEvent,
  type GameAction,
  type MatchSetup,
  type MatchState,
  type Position,
  type SpellTarget,
} from '../game'
import { castImpact, type CastImpact } from '../battle/castImpact'
import { resolveAdventureAction } from './adventure'
import { resolvedEffectsFor, type ResolvedEffect } from '../battle/resolvedEffects'

/**
 * Entrada compacta del registro de partida (para el botón "Descargar
 * registro" de la pantalla de resultado, ver MatchExport en BattlePage.tsx).
 * Deliberadamente reducida a IDs y campos cortos, no texto libre repetido
 * como en `history`: el objetivo es que el archivo exportado sea barato de
 * pegar en un chat sin perder ninguna información reconstruible.
 */
export interface MatchLogEntry {
  readonly turn: number
  readonly by?: 'player' | 'ai'
  readonly type: GameAction['type'] | 'info' | 'js-error'
  readonly card?: string
  readonly from?: string
  readonly to?: string
  readonly target?: string
  readonly ok: boolean
  readonly note?: string
}

/** Una lectura de la Vida de los dos Nexos en un momento dado, para la gráfica del resumen final. */
export interface HealthSnapshot {
  readonly turn: number
  readonly player: number
  readonly ai: number
}

/** La jugada de un solo golpe más dañina de toda la partida, para el resumen final. */
export interface BestPlay {
  readonly turn: number
  readonly amount: number
  readonly cardId?: string
  readonly by: 'player' | 'ai'
}

const posKey = (position: Position): string => `${position.x},${position.y}`

/** cardId de una pieza en el tablero (no el nombre legible: más compacto y sin ambigüedad de idioma). */
const pieceCardId = (state: MatchState, pieceId: string): string | undefined =>
  state.board.find((candidate) => candidate.instanceId === pieceId)?.cardId

const spellTargetKey = (state: MatchState, target: SpellTarget | undefined): string | undefined => {
  if (!target) return undefined
  if (target.kind === 'piece') return pieceCardId(state, target.pieceId) ?? target.pieceId
  if (target.kind === 'nexus') return `nexus:${target.playerId}`
  return undefined
}

/** Igual que actionDescription pero en campos compactos, para el registro exportable. */
const compactAction = (state: MatchState, action: GameAction): Pick<MatchLogEntry, 'card' | 'from' | 'to' | 'target'> => {
  if (action.type === 'play-resource' || action.type === 'play-card') {
    const player = state.players[action.playerId]
    const instance = player.hand.find((card) => card.instanceId === action.cardInstanceId)
    return {
      card: instance?.cardId,
      to: action.type === 'play-card' ? (action.position ? posKey(action.position) : undefined) : undefined,
      target: action.type === 'play-card' ? spellTargetKey(state, action.target) : undefined,
    }
  }
  if (action.type === 'move') return { card: pieceCardId(state, action.pieceId), to: posKey(action.to) }
  if (action.type === 'attack-piece') {
    return { card: pieceCardId(state, action.attackerId), target: pieceCardId(state, action.defenderId) ?? action.defenderId }
  }
  if (action.type === 'attack-nexus') return { card: pieceCardId(state, action.attackerId) }
  return {}
}

interface MatchStore {
  mode: 'skirmish' | 'adventure'
  resolvedEffects: readonly ResolvedEffect[]
  match?: MatchState
  selectedHandId?: string
  selectedPieceId?: string
  /**
   * Ficha del tablero que se está "consultando" con un clic normal — propia
   * o rival, sin desencadenar ninguna acción. Deliberadamente independiente
   * de `selectedPieceId` (esa sí implica "mi ficha, quiero moverla o
   * atacar con ella"): así se puede consultar una ficha rival sin perder de
   * vista la propia que ya tenías seleccionada para actuar.
   */
  viewedPieceId?: string
  inspectedCardId?: string
  inspectedPieceId?: string
  message?: string
  history: readonly string[]
  /** Registro compacto de toda la partida, para exportar (ver MatchLogEntry). Nunca se recorta. */
  matchLog: readonly MatchLogEntry[]
  /** Vida de los dos Nexos tras cada acción, para la gráfica del resumen final. */
  healthHistory: readonly HealthSnapshot[]
  /** El golpe más dañino de la partida hasta ahora, para el resumen final. */
  bestPlay?: BestPlay
  aiThinking: boolean
  startedAtMs: number
  elapsedSeconds: number
  /** Cola de presentación: eventos ya resueltos por el motor pendientes de reproducirse. */
  pendingAnimations: readonly AnimationEvent[]
  /** Evento visual en reproducción en este instante. */
  currentEvent?: AnimationEvent
  /**
   * A quién afectó cada carta o poder lanzado, por id de su evento. Se calcula
   * al despachar, que es el único momento en que existen el tablero de antes
   * y el de después; la presentación lo lee al enseñar la carta.
   */
  castImpacts: Readonly<Record<string, CastImpact>>
  /**
   * Eventos de la última jugada que mereció la pena ver (un ataque, una carta
   * o un poder), para el botón «Repetir jugada». No se guarda en disco.
   */
  lastPlay?: readonly AnimationEvent[]
  /** Vuelve a reproducir la última jugada. Solo presentación: el estado no cambia. */
  replayLastPlay: () => void
  /**
   * Arranca una escaramuza contra la IA. `opponentDeckId` fija el rival; sin
   * él lo elige la semilla, como siempre. `setup` permite entrar con la Vida
   * ya mermada, que es como encadena combates la Torre del Nexo.
   */
  startMatch: (playerDeckId: string, seed?: number, opponentDeckId?: string, setup?: MatchSetup) => void
  /** Arranca la partida a partir de un MatchState ya construido (multijugador: lo crea el anfitrión y lo recibe el invitado). */
  startFromMatch: (match: MatchState, mode?: 'skirmish' | 'adventure') => void
  dispatch: (action: GameAction) => boolean
  replaceMatch: (match: MatchState, message?: string) => void
  advanceEvent: () => void
  finishEvent: () => void
  skipAnimations: () => void
  selectHand: (instanceId?: string) => void
  selectPiece: (instanceId?: string) => void
  /** Consulta (o deja de consultar) una ficha del tablero, propia o rival. */
  viewPiece: (instanceId?: string) => void
  inspect: (cardId?: string, pieceId?: string) => void
  setMessage: (message?: string) => void
  setAiThinking: (thinking: boolean) => void
  /** Registra un error de JS atrapado durante la partida en el registro exportable. */
  logError: (message: string) => void
  reset: () => void
}

/** Nombre de la carta en una casilla, tal como estaba justo antes de aplicar la acción. */
const pieceName = (state: MatchState, pieceId: string): string => {
  const piece = state.board.find((candidate) => candidate.instanceId === pieceId)
  return (piece && CARD_BY_ID[piece.cardId]?.name) ?? 'Una unidad'
}

const spellTargetName = (state: MatchState, target: SpellTarget | undefined): string | undefined => {
  if (!target) return undefined
  if (target.kind === 'piece') return pieceName(state, target.pieceId)
  if (target.kind === 'nexus') return 'el Nexo'
  return undefined
}

/** Suma el daño de los eventos de animación que produjo la acción, filtrando por objetivo si se da. */
const damageDealt = (events: readonly AnimationEvent[], targetId?: string): number =>
  events
    .filter((event) => (event.type === 'damage' || event.type === 'nexus-damage') && (!targetId || event.targetId === targetId))
    .reduce((sum, event) => sum + (event.amount ?? 0), 0)

/**
 * Descripción legible de la acción, para el registro «Crónica de batalla» y
 * el aviso central de eventos. Los nombres se leen del estado ANTERIOR a
 * aplicar la acción (así las piezas que el efecto destruye o mueve aún están
 * donde el jugador las vio), pero las cifras de daño vienen de los eventos
 * de animación YA resueltos — antes de esto no había forma de saber cuánto
 * había dolido un golpe sin abrir la Crónica y aun así no se veía la cifra.
 */
const actionDescription = (state: MatchState, action: GameAction, events: readonly AnimationEvent[] = []): string => {
  const player = state.players[action.playerId ?? state.activePlayer]
  if (action.type === 'play-resource') {
    const instance = player.hand.find((card) => card.instanceId === action.cardInstanceId)
    const name = instance ? CARD_BY_ID[instance.cardId]?.name : undefined
    return `${name ?? 'Una fuente'} entra en la reserva.`
  }
  if (action.type === 'play-card') {
    const instance = player.hand.find((card) => card.instanceId === action.cardInstanceId)
    const card = instance ? CARD_BY_ID[instance.cardId] : undefined
    const name = card?.name ?? 'Una carta'
    if (card?.effects.some((effect) => effect.kind === 'spark')) return `${name}: se lanza la Chispa.`
    if (card && (card.type === 'unit' || card.type === 'structure')) return `${name} entra en juego.`
    // Hechizo inmediato: se anuncia como tal (el usuario pedía que quedara
    // claro que ES un hechizo, no solo "se resuelve") y con la cifra real de
    // daño si la tuvo, sumando TODOS los objetivos (cubre efectos de área).
    const prefix = card?.type === 'instant' ? '¡Hechizo! ' : ''
    const target = spellTargetName(state, action.target)
    const dealt = damageDealt(events)
    if (dealt > 0) return `${prefix}${name} inflige ${dealt} de daño${target ? ` a ${target}` : ''}.`
    return target ? `${prefix}${name} alcanza a ${target}.` : `${prefix}${name} se resuelve.`
  }
  if (action.type === 'resolve-choice') {
    const decision = state.pendingDecisions?.[0]
    const name = decision ? CARD_BY_ID[decision.sourceCardId]?.name ?? COMMANDER_BY_ID[decision.sourceCardId]?.name : undefined
    return action.skip ? `${name ?? 'Elección'}: se continúa sin otra selección.` : `${name ?? 'Elección'}: se confirma la selección.`
  }
  if (action.type === 'choose-spark') {
    const pending = state.pendingSpark
    const instance = player.hand.find((card) => card.instanceId === pending?.cardInstanceId)
    const name = instance ? CARD_BY_ID[instance.cardId]?.name : 'Chispa'
    const dealt = damageDealt(events)
    return `${name}: ${action.face}${dealt > 0 ? `, ${dealt} de daño` : ''}.`
  }
  if (action.type === 'move') return `${pieceName(state, action.pieceId)} se reposiciona.`
  if (action.type === 'attack-piece') {
    const dealt = damageDealt(events, action.defenderId)
    const base = `${pieceName(state, action.attackerId)} ataca a ${pieceName(state, action.defenderId)}`
    return dealt > 0 ? `${base} (−${dealt}).` : `${base}.`
  }
  if (action.type === 'attack-nexus') {
    const dealt = damageDealt(events)
    const base = `${pieceName(state, action.attackerId)} golpea el Nexo enemigo`
    return dealt > 0 ? `${base} (−${dealt}).` : `${base}.`
  }
  if (action.type === 'commander-power') {
    // Antes caía al «default» de más abajo y anunciaba "Has cedido el
    // turno." — un poder de comandante quedaba indistinguible de pasar el
    // turno, tanto en la Crónica como en el aviso central.
    const power = COMMANDER_BY_ID[player.commanderId]?.power
    const name = power?.name ?? 'Poder de mando'
    const target = spellTargetName(state, action.target)
    const dealt = damageDealt(events)
    if (dealt > 0) return `¡${name}! Inflige ${dealt} de daño${target ? ` a ${target}` : ''}.`
    return target ? `¡${name}! Alcanza a ${target}.` : `¡${name}!`
  }
  if (action.type === 'draw') return 'Se roba una carta.'
  // Fraseo neutro para el bando no-'player': en solitario es la IA, pero en
  // multijugador es un rival humano de verdad, así que no se le llama «IA».
  return action.playerId === 'player' ? 'Has cedido el turno.' : 'Se cede el turno.'
}

const initialState = {
  mode: 'skirmish' as 'skirmish' | 'adventure',
  resolvedEffects: [] as readonly ResolvedEffect[],
  history: [] as readonly string[],
  matchLog: [] as readonly MatchLogEntry[],
  healthHistory: [] as readonly HealthSnapshot[],
  bestPlay: undefined as BestPlay | undefined,
  aiThinking: false,
  startedAtMs: 0,
  elapsedSeconds: 0,
  pendingAnimations: [] as readonly AnimationEvent[],
  currentEvent: undefined as AnimationEvent | undefined,
  castImpacts: {} as Readonly<Record<string, CastImpact>>,
  lastPlay: undefined as readonly AnimationEvent[] | undefined,
}

/** Sufijo de los eventos repetidos: la presentación los reconoce por él. */
export const REPLAY_MARK = '-repetida-'

/**
 * Lo que se repite de una acción: desde el primer ataque o carta lanzada,
 * sin el cambio de turno, los robos ni la victoria (repetir la victoria
 * volvería a derrumbar el Nexo y a abrir la pantalla final).
 */
const replayable = (events: readonly AnimationEvent[]): readonly AnimationEvent[] | undefined => {
  const start = events.findIndex((event) => event.type === 'attack' || event.cast)
  if (start < 0) return undefined
  const kept = events.slice(start).filter((event) => event.type !== 'turn' && event.type !== 'draw' && event.type !== 'victory' && event.type !== 'resource' && event.type !== 'mana-flow')
  return kept.length > 0 ? kept : undefined
}

let replayCount = 0

/** Cuántos resultados de cartas se guardan: solo hacen falta los que aún esperan en la cola. */
const CAST_IMPACT_LIMIT = 12

const withCastImpact = (
  current: Readonly<Record<string, CastImpact>>,
  before: MatchState,
  after: MatchState,
  events: readonly AnimationEvent[],
): Readonly<Record<string, CastImpact>> => {
  const cast = events.find((event) => event.cast)
  if (!cast) return current
  const entries = [...Object.entries(current), [cast.id, castImpact(before, after)] as const]
  return Object.fromEntries(entries.slice(-CAST_IMPACT_LIMIT))
}

/** Snapshot de Vida de ambos Nexos justo después de resolver una acción. */
const healthSnapshot = (state: MatchState): HealthSnapshot => ({
  turn: state.turn,
  player: state.players.player.nexusHealth,
  ai: state.players.ai.nexusHealth,
})

/**
 * Si alguno de los eventos recién generados supera al mejor golpe registrado
 * hasta ahora, lo sustituye. Solo cuentan `damage`/`nexus-damage`: son los
 * únicos tipos de evento que representan daño de verdad repartido de un
 * golpe (un escudo absorbe, no hace daño).
 */
const updateBestPlay = (
  current: BestPlay | undefined,
  events: readonly AnimationEvent[],
  turn: number,
  by: 'player' | 'ai',
  cardId?: string,
): BestPlay | undefined => {
  let best = current
  for (const event of events) {
    if ((event.type !== 'damage' && event.type !== 'nexus-damage') || !event.amount) continue
    if (!best || event.amount > best.amount) best = { turn, amount: event.amount, cardId, by }
  }
  return best
}

/** Extrae la cola de eventos del estado del motor y la deja limpia para el siguiente paso. */
const drainAnimations = (state: MatchState): { match: MatchState; events: readonly AnimationEvent[] } => ({
  match: clearAnimationQueue(state),
  events: state.animations,
})

/**
 * Sube esta versión siempre que cambie la forma de MatchState/PlayerState.
 * Sin `migrate`, zustand descarta silenciosamente cualquier partida
 * guardada con una versión distinta en vez de arriesgarse a hidratar un
 * estado incompleto.
 */
const MATCH_PERSIST_VERSION = 2

export const useMatchStore = create<MatchStore>()(
  persist(
    (set, get) => ({
  ...initialState,
  startMatch: (playerDeckId, seed, opponentDeckId, setup) => {
    const playerIndex = Math.max(0, STARTER_DECKS.findIndex((deck) => deck.id === playerDeckId))
    const playerDeck = STARTER_DECKS[playerIndex]
    const matchSeed = seed ?? (Date.now() >>> 0)
    // El rival se elige a partir de la semilla entre las demás facciones: varía en
    // cada escaramuza, pero una revancha con la misma semilla repite el emparejamiento.
    // `matchSeed` suele ser Date.now(): dos partidas separadas por un intervalo
    // parecido (p. ej. el tiempo que tarda alguien en volver a jugar) generan
    // deltas de reloj parecidos, y `matchSeed % N` sobre esos deltas produce
    // rachas del mismo rival mucho más largas de lo que parece aleatorio. Se
    // pasa por nextRandom() (el mismo mezclador que ya usa el motor para barajar
    // el mazo) para romper esa correlación antes de elegir el índice.
    const opponents = STARTER_DECKS.filter((_, index) => index !== playerIndex)
    const opponentIndex = Math.floor(nextRandom(matchSeed).value * opponents.length)
    // Rival elegido a mano: manda sobre el sorteo. Si coincide con el mazo del
    // jugador (o no existe) se ignora y se vuelve al sorteo de siempre, para
    // que nunca se pueda acabar peleando contra el propio mazo.
    const chosen = opponentDeckId
      ? opponents.find((deck) => deck.id === opponentDeckId)
      : undefined
    const aiDeck = chosen ?? opponents[opponentIndex] ?? opponents[0]
    if (!playerDeck || !aiDeck) throw new Error('Faltan mazos iniciales para crear la partida.')
    const match = createMatch(playerDeck, aiDeck, matchSeed, setup)
    const cleaned = clearAnimationQueue(match)
    set({
      ...initialState,
      match: cleaned,
      history: ['La escaramuza comienza. Robas diez cartas.'],
      healthHistory: [healthSnapshot(cleaned)],
      selectedHandId: undefined,
      selectedPieceId: undefined,
      viewedPieceId: undefined,
      inspectedCardId: undefined,
      inspectedPieceId: undefined,
      message: undefined,
      startedAtMs: Date.now(),
    })
  },
  startFromMatch: (match, mode = 'skirmish') => {
    const cleaned = clearAnimationQueue(match)
    set({
      ...initialState,
      match: cleaned,
      mode,
      history: ['La escaramuza comienza. Robas diez cartas.'],
      healthHistory: [healthSnapshot(cleaned)],
      selectedHandId: undefined,
      selectedPieceId: undefined,
      viewedPieceId: undefined,
      inspectedCardId: undefined,
      inspectedPieceId: undefined,
      message: undefined,
      startedAtMs: Date.now(),
    })
  },
  dispatch: (action) => {
    const match = get().match
    if (!match) return false
    const result = applyAction(match, action)
    if (!result.ok) {
      const errorEntry: MatchLogEntry = {
        turn: match.turn,
        by: action.playerId,
        type: action.type,
        ...compactAction(match, action),
        ok: false,
        note: result.error?.message,
      }
      set((current) => ({ message: result.error?.message ?? 'La acción no es válida.', matchLog: [...current.matchLog, errorEntry] }))
      return false
    }
    const logEntry: MatchLogEntry = { turn: match.turn, by: action.playerId, type: action.type, ...compactAction(match, action), ok: true }
    const resolved = get().mode === 'adventure' ? resolveAdventureAction(match, result.state) : result.state
    const { match: cleaned, events } = drainAnimations(resolved)
    const description = actionDescription(match, action, events)
    set((current) => ({
      match: cleaned,
      message: undefined,
      history: [...current.history.slice(-9), description],
      matchLog: [...current.matchLog, logEntry],
      resolvedEffects: [...current.resolvedEffects, ...resolvedEffectsFor(match, cleaned, events)].slice(-96),
      healthHistory: [...current.healthHistory, healthSnapshot(cleaned)],
      bestPlay: action.playerId
        ? updateBestPlay(current.bestPlay, events, match.turn, action.playerId, logEntry.card)
        : current.bestPlay,
      pendingAnimations: [...current.pendingAnimations, ...events],
      castImpacts: withCastImpact(current.castImpacts, match, cleaned, events),
      lastPlay: replayable(events) ?? current.lastPlay,
      elapsedSeconds: cleaned.winner ? Math.max(1, Math.round((Date.now() - current.startedAtMs) / 1000)) : current.elapsedSeconds,
    }))
    return true
  },
  replaceMatch: (match, message) => {
    const { match: cleaned, events } = drainAnimations(match)
    set((current) => ({
      match: cleaned,
      resolvedEffects: current.match ? [...current.resolvedEffects, ...resolvedEffectsFor(current.match, cleaned, events)].slice(-96) : current.resolvedEffects,
      message,
      history: message ? [...current.history.slice(-9), message] : current.history,
      healthHistory: [...current.healthHistory, healthSnapshot(cleaned)],
      // `replaceMatch` la usa el sincronizador multijugador: aquí llegan eventos de
      // red (jugada rechazada por el anfitrión, aviso de desconexión...) que no
      // pasan por `dispatch`, así que se registran aparte como entradas 'info'.
      matchLog: message ? [...current.matchLog, { turn: cleaned.turn, type: 'info' as const, ok: true, note: message }] : current.matchLog,
      pendingAnimations: [...current.pendingAnimations, ...events],
      elapsedSeconds: cleaned.winner ? Math.max(1, Math.round((Date.now() - current.startedAtMs) / 1000)) : current.elapsedSeconds,
    }))
  },
  replayLastPlay: () => {
    const play = get().lastPlay
    if (!play || get().pendingAnimations.length > 0 || get().currentEvent) return
    replayCount += 1
    const suffix = `${REPLAY_MARK}${replayCount}`
    // A cámara lenta: cada evento dura un 60 % más que la primera vez.
    const copies = play.map((event) => ({ ...event, id: `${event.id}${suffix}`, durationMs: Math.round(event.durationMs * 1.6) }))
    set((current) => ({
      pendingAnimations: copies,
      // El resultado de la carta se copia con el id nuevo para que el panel
      // «Qué hace» y las marcas del tablero también se repitan.
      castImpacts: Object.fromEntries([
        ...Object.entries(current.castImpacts),
        ...play.filter((event) => current.castImpacts[event.id]).map((event) => [`${event.id}${suffix}`, current.castImpacts[event.id]!] as const),
      ].slice(-CAST_IMPACT_LIMIT)),
    }))
  },
  advanceEvent: () =>
    set((current) => ({
      currentEvent: current.pendingAnimations[0],
      pendingAnimations: current.pendingAnimations.slice(1),
    })),
  finishEvent: () => set({ currentEvent: undefined }),
  skipAnimations: () => set({ pendingAnimations: [], currentEvent: undefined }),
  selectHand: (selectedHandId) => set({ selectedHandId, selectedPieceId: undefined, viewedPieceId: undefined, message: undefined }),
  selectPiece: (selectedPieceId) => set({ selectedPieceId, selectedHandId: undefined, viewedPieceId: undefined, message: undefined }),
  viewPiece: (viewedPieceId) => set({ viewedPieceId }),
  inspect: (inspectedCardId, inspectedPieceId) => set({ inspectedCardId, inspectedPieceId }),
  setMessage: (message) => set({ message }),
  setAiThinking: (aiThinking) => set({ aiThinking }),
  logError: (message) =>
    set((current) => ({
      matchLog: [...current.matchLog, { turn: current.match?.turn ?? 0, type: 'js-error' as const, ok: false, note: message }],
    })),
  reset: () => set({ match: undefined, selectedHandId: undefined, selectedPieceId: undefined, viewedPieceId: undefined, inspectedCardId: undefined, inspectedPieceId: undefined, message: undefined, ...initialState }),
    }),
    {
      name: 'cronicas-nexo-match',
      version: MATCH_PERSIST_VERSION,
      // Solo el estado necesario para retomar la partida: nunca la cola de
      // animaciones ni la selección en curso, que no tienen sentido tras recargar.
      partialize: (state) => ({
        mode: state.mode,
        resolvedEffects: state.resolvedEffects,
        match: state.match,
        history: state.history,
        matchLog: state.matchLog,
        healthHistory: state.healthHistory,
        bestPlay: state.bestPlay,
        startedAtMs: state.startedAtMs,
        elapsedSeconds: state.elapsedSeconds,
      }),
    },
  ),
)
