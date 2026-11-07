import { useEffect, useRef, useState } from 'react'
import { createMatch, mulliganOpeningHand, reorderTopCards, STARTER_DECKS, type GameAction, type MatchState } from '../game'
import { useMatchStore } from '../store/match'
import { useNetworkStore } from '../store/network'
import { usePreferences, type ScenarioId } from '../store/preferences'
import { SCENARIO_OPTIONS } from '../battle/scenarioCatalog'
import type { Room, RoomRole } from './room'

type NetworkIntent =
  | { kind: 'action'; action: GameAction }
  | { kind: 'mulligan'; ids: readonly string[] }
  | { kind: 'scry'; order: readonly string[] }

interface StatePayload {
  match: MatchState
  message?: string
  scenario?: ScenarioId
  presentation?: Pick<ReturnType<typeof useMatchStore.getState>, 'lastPlay' | 'castImpacts' | 'bestPlay' | 'matchLog' | 'history'>
}

/**
 * El anfitrión (engine seat 'player') es la única autoridad: crea la partida,
 * aplica cualquier jugada —propia o del invitado— con el motor de siempre y
 * retransmite el MatchState resultante. El invitado (engine seat 'ai') nunca
 * muta su copia local: solo la reemplaza con lo que llega del anfitrión, y
 * envía sus jugadas como "intenciones" para que el anfitrión las aplique.
 */
export type LinkStatus = 'ok' | 'reconnecting' | 'lost'

/**
 * Cuánto se aguanta con el rival ausente antes de dar la partida por perdida.
 * Un F5, un túnel o un móvil que bloquea la pantalla tardan segundos en
 * volver; con el corte anterior (5 s y a la calle) cualquiera de esas cosas
 * mataba la partida de los dos.
 */
const RECONNECT_WINDOW_MS = 60_000

/**
 * Presentación de un jugador: con qué mazo juega y a quién pone al mando.
 *
 * Se acepta también el formato antiguo (solo el id del mazo, como cadena)
 * porque los dos lados pueden estar en versiones distintas del juego: quien
 * aún no conozca a los comandantes alternativos manda una cadena a secas.
 */
interface PeerDeck {
  readonly deckId: string
  readonly commanderId?: string
}

const readPeerDeck = (payload: unknown): PeerDeck | undefined => {
  if (typeof payload === 'string') return { deckId: payload }
  if (payload && typeof payload === 'object' && 'deckId' in payload) {
    const { deckId, commanderId } = payload as PeerDeck
    if (typeof deckId === 'string') {
      return { deckId, commanderId: typeof commanderId === 'string' ? commanderId : undefined }
    }
  }
  return undefined
}

const presentationFor = (state: ReturnType<typeof useMatchStore.getState>) => ({
  lastPlay: state.lastPlay,
  castImpacts: state.castImpacts,
  bestPlay: state.bestPlay,
  matchLog: state.matchLog,
  history: state.history,
})

export const useNetworkSync = (
  room: Room | undefined,
  role: RoomRole | undefined,
  localDeckId: string,
  localCommanderId?: string,
) => {
  const peerDeck = useRef<PeerDeck>(undefined)
  const [link, setLink] = useState<LinkStatus>('ok')
  /** Acuerdo de revancha: cada lado marca que la quiere; solo cuando ambos
      lo han pedido el anfitrión siembra una partida nueva. */
  const [rematchSelf, setRematchSelf] = useState(false)
  const [rematchPeer, setRematchPeer] = useState(false)

  // Detecta cuando el rival se desconecta a mitad de partida (cierra la
  // pestaña, pierde la red…): antes de esto, un corte dejaba la pantalla
  // congelada sin ninguna pista de qué había pasado.
  useEffect(() => {
    if (!room) return undefined
    // Diferido: evita anidar el setState de reinicio dentro del cuerpo
    // síncrono del efecto (mismo patrón que el resto de canales laterales).
    const reset = window.setTimeout(() => setLink('ok'), 0)
    const wasConnected = { current: room.getStatus() === 'connected' }
    // El rival ausente no se anuncia como perdido de golpe: primero se pasa a
    // 'reconnecting' (la pantalla avisa de que se está reintentando) y solo
    // al agotarse la ventana se da la partida por rota. La presencia del
    // canal parpadea con normalidad —pestaña en segundo plano, red que salta
    // de wifi a datos, el propio servidor resincronizando— y antes cualquiera
    // de esos parpadeos se convertía en un final irreversible.
    let graceTimer: number | undefined
    const off = room.onStatusChange((status) => {
      if (status === 'connected') {
        wasConnected.current = true
        if (graceTimer !== undefined) window.clearTimeout(graceTimer)
        graceTimer = undefined
        setLink('ok')
        // Al reengancharse hay que ponerse al día: mientras no había canal,
        // las retransmisiones del anfitrión se perdieron sin dejar rastro
        // (el broadcast no guarda historial), así que la copia local puede
        // llevar varios turnos de retraso.
        if (role === 'guest') room.send('resync', {})
      } else if ((status === 'waiting' || status === 'error') && wasConnected.current) {
        setLink('reconnecting')
        if (graceTimer === undefined) {
          graceTimer = window.setTimeout(() => setLink('lost'), RECONNECT_WINDOW_MS)
        }
      }
    })
    return () => {
      window.clearTimeout(reset)
      if (graceTimer !== undefined) window.clearTimeout(graceTimer)
      off()
    }
  }, [room, role])

  // En cuanto llega una partida nueva sin ganador tras una ya terminada
  // (justo lo que produce una revancha aceptada), el acuerdo local se
  // reinicia: si no, un tercer «Jugar otra vez» quedaría ya medio marcado.
  useEffect(() => {
    if (!room) return undefined
    return useMatchStore.subscribe((state, previous) => {
      if (state.match && state.match !== previous.match && !state.match.winner && previous.match?.winner) {
        setRematchSelf(false)
        setRematchPeer(false)
      }
    })
  }, [room])

  useEffect(() => {
    if (!room || !role) return undefined

    // Aviso de "ya estoy listo": si el mazo propio se envía antes de que el
    // otro lado haya montado esta pantalla (y por tanto antes de que esté
    // escuchando), ese mensaje se pierde sin más — el canal no guarda
    // mensajes pasados. Este segundo aviso, más el reenvío del mazo al
    // recibirlo, cierra esa carrera sin importar quién llegue primero.
    const presentacion: PeerDeck = { deckId: localDeckId, commanderId: localCommanderId }
    room.send('deck', presentacion)
    room.send('ready', {})
    // Un invitado que acaba de entrar puede estar reenganchándose a una
    // partida ya empezada: pedir el estado no cuesta nada y evita quedarse
    // mirando un tablero de hace tres turnos.
    if (role === 'guest') room.send('resync', {})

    const offDeck = room.onMessage('deck', (payload) => {
      const recibido = readPeerDeck(payload)
      if (!recibido) return
      peerDeck.current = recibido
      if (role !== 'host') return
      if (useMatchStore.getState().match) return
      const hostDeck = STARTER_DECKS.find((deck) => deck.id === localDeckId)
      const guestDeck = STARTER_DECKS.find((deck) => deck.id === recibido.deckId)
      if (!hostDeck || !guestDeck) return
      const match = createMatch(hostDeck, guestDeck, Date.now() >>> 0, {
        playerCommanderId: localCommanderId,
        aiCommanderId: recibido.commanderId,
      })
      useMatchStore.getState().startFromMatch(match)
    })

    const offReady = room.onMessage('ready', () => room.send('deck', presentacion))

    const receivedEvents = new Set<string>()
    let receivedSeed = useMatchStore.getState().match?.seed
    const offState = room.onMessage('state', (payload) => {
      if (role !== 'guest') return
      const { match, message, scenario, presentation } = payload as StatePayload
      if (SCENARIO_OPTIONS.some((option) => option.value === scenario)) useNetworkStore.getState().setScenario(scenario!)
      const store = useMatchStore.getState()
      if (receivedSeed !== match.seed) {
        receivedEvents.clear()
        receivedSeed = match.seed
      }
      const events = match.animations.filter((event) => !receivedEvents.has(event.id))
      events.forEach((event) => receivedEvents.add(event.id))
      if (!store.match || store.match.seed !== match.seed) store.startFromMatch(match)
      else store.replaceMatch({ ...match, animations: events }, message)
      if (presentation) useMatchStore.setState(presentation)
    })

    const offRematch = room.onMessage('rematch', () => setRematchPeer(true))

    // El anfitrión es la autoridad: cuando el invitado vuelve de un corte (o
    // de recargar la página) pide el estado y aquí se le manda el actual, sin
    // reconstruir nada. También reenvía el mazo, por si el que vuelve es un
    // invitado recién arrancado que aún no sabe contra quién juega.
    const offResync = room.onMessage('resync', () => {
      if (role !== 'host') return
      const store = useMatchStore.getState()
      room.send('deck', presentacion)
      if (store.match) room.send('state', { match: store.match, presentation: presentationFor(store), scenario: useNetworkStore.getState().scenario ?? usePreferences.getState().scenario })
    })

    // Si el anfitrión rechaza la jugada del invitado (turno equivocado, ya
    // jugó su Esencia este turno…), la retransmisión normal de `state` no se
    // dispara — el motor no cambió nada, así que no hay nada que reenviar —
    // y sin este aviso el invitado no se entera de por qué "no pasó nada".
    const offError = room.onMessage('error', (payload) => {
      if (role !== 'guest') return
      useMatchStore.getState().setMessage(payload as string)
    })

    const offIntent = room.onMessage('intent', (payload) => {
      if (role !== 'host') return
      const store = useMatchStore.getState()
      const match = store.match
      if (!match) return
      const intent = payload as NetworkIntent
      if (intent.kind === 'action') {
        if (!store.dispatch(intent.action)) {
          room.send('error', useMatchStore.getState().message ?? 'La acción no es válida.')
        }
        return
      }
      if (intent.kind === 'mulligan') {
        const result = mulliganOpeningHand(match, 'ai', intent.ids)
        if (result.ok) {
          store.replaceMatch(result.state, intent.ids.length > 0 ? 'Se ajusta la mano inicial.' : 'Se conserva la mano inicial.')
        } else {
          // Sin este aviso, un mulligan rechazado (p. ej. por una petición
          // duplicada tras un reintento) dejaba al invitado con el modal
          // abierto para siempre y sin ninguna pista de qué había pasado —
          // la única rama de las tres que no avisaba del rechazo.
          room.send('error', result.error?.message ?? 'No se pudo completar el mulligan.')
        }
        return
      }
      if (intent.kind === 'scry') {
        const result = reorderTopCards(match, 'ai', intent.order)
        if (result.ok) {
          store.replaceMatch(result.state, 'Se resuelve el escrutinio del mazo.')
        } else {
          room.send('error', result.error?.message ?? 'No se pudo reordenar el mazo.')
        }
      }
    })

    // Solo el anfitrión retransmite: cada cambio de `match` (propio o ya
    // aplicado a partir de una intención del invitado) se reenvía tal cual.
    const offBroadcast = role === 'host'
      ? useMatchStore.subscribe((state, previous) => {
          if (state.match && state.match !== previous.match) {
            const previousIds = new Set(previous.pendingAnimations.map((event) => event.id))
            // dispatch ya extrajo los eventos del motor para la presentación local.
            // Transportamos únicamente los nuevos para que el invitado los presente también.
            const events = state.pendingAnimations.filter((event) => !previousIds.has(event.id))
            room.send('state', { match: { ...state.match, animations: events }, presentation: presentationFor(state), message: state.history[state.history.length - 1], scenario: useNetworkStore.getState().scenario ?? usePreferences.getState().scenario })
          }
        })
      : undefined

    return () => {
      offDeck()
      offReady()
      offState()
      offRematch()
      offResync()
      offError()
      offIntent()
      offBroadcast?.()
    }
  }, [room, role, localDeckId, localCommanderId])

  // Solo el anfitrión tiene autoridad para sembrar la partida: en cuanto
  // los dos lados han pedido revancha, crea un MatchState nuevo con los
  // mismos mazos; la retransmisión habitual (offBroadcast) se lo envía al invitado.
  useEffect(() => {
    if (!rematchSelf || !rematchPeer || role !== 'host') return
    const hostDeck = STARTER_DECKS.find((deck) => deck.id === localDeckId)
    const guestDeck = STARTER_DECKS.find((deck) => deck.id === peerDeck.current?.deckId)
    if (!hostDeck || !guestDeck) return
    // La revancha conserva los comandantes: cambiarlos a mitad de sesión sin
    // avisar sería otra partida distinta de la que se acaba de aceptar.
    const match = createMatch(hostDeck, guestDeck, Date.now() >>> 0, {
      playerCommanderId: localCommanderId,
      aiCommanderId: peerDeck.current?.commanderId,
    })
    useMatchStore.getState().startFromMatch(match)
  }, [rematchSelf, rematchPeer, role, localDeckId, localCommanderId])

  const sendIntent = (intent: NetworkIntent) => room?.send('intent', intent)
  const requestRematch = () => {
    room?.send('rematch', {})
    setRematchSelf(true)
  }
  return { sendIntent, link, peerLeft: link === 'lost', requestRematch, rematchSelf, rematchPeer }
}
