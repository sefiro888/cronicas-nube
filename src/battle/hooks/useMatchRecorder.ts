import { useEffect, useRef, useState } from 'react'
import { COMMANDER_BY_ID, STARTER_DECKS, type MatchState, type PlayerId } from '../../game'
import { evaluateAchievements, type Achievement } from '../../store/achievements'
import { useMatchStore } from '../../store/match'
import { useCollection } from '../../store/collection'
import { useRecords, type MatchRecord } from '../../store/records'

interface RecordOutcome {
  readonly won: boolean
  readonly seconds: number
  readonly mode: 'ai' | 'pvp'
}

/**
 * Rellena los datos comunes de un registro de partida (mazos, comandante,
 * daño, semilla) a partir del estado del motor.
 *
 * Existe porque una partida se anota desde tres sitios distintos —al terminar,
 * al abandonar y cuando el rival se desconecta— y antes cada uno repetía las
 * mismas seis búsquedas, con el riesgo de que se fueran separando entre sí.
 */
export const buildMatchRecord = (
  match: MatchState,
  me: PlayerId,
  rival: PlayerId,
  fallbackDeckId: string,
  outcome: RecordOutcome,
): Omit<MatchRecord, 'id'> => {
  const playerState = match.players[me]
  const playerDeck = STARTER_DECKS.find((deck) => deck.commanderId === playerState.commanderId)
  const opponentDeck = STARTER_DECKS.find((deck) => deck.commanderId === match.players[rival].commanderId)
  return {
    finishedAt: Date.now(),
    deckId: playerDeck?.id ?? fallbackDeckId,
    deckName: playerDeck?.name ?? 'Mazo desconocido',
    commanderName: COMMANDER_BY_ID[playerState.commanderId]?.name ?? '—',
    opponentDeckName: opponentDeck?.name ?? 'Rival desconocido',
    won: outcome.won,
    turns: match.turn,
    seconds: outcome.seconds,
    damageDealt: playerState.stats.damageDealt,
    seed: match.seed,
    mode: outcome.mode,
  }
}

export interface MatchRecorderOptions {
  me: PlayerId
  rival: PlayerId
  /** Mazo elegido en preferencias: sirve de respaldo si el comandante no casa con ningún mazo inicial. */
  fallbackDeckId: string
  /** True en partidas PvP: cambia el modo del registro y desactiva los logros. */
  isPvp: boolean
  /** El rival cerró la pestaña sin abandonar: cuenta como victoria propia. */
  peerLeft: boolean
  /** Hay animaciones pendientes: se espera a que acaben antes de anotar nada. */
  queueBusy: boolean
}

export interface MatchRecorder {
  /** Logros que este resultado concreto acaba de desbloquear, para celebrarlos en la pantalla final. */
  achievements: readonly Achievement[]
  /** Anota una derrota por abandono voluntario. */
  recordAbandon: (match: MatchState) => void
  /** Olvida lo anotado para que una revancha con la misma semilla se registre igual. */
  reset: () => void
}

/**
 * Anota la partida en el historial local una sola vez y calcula qué logros
 * desbloqueó. También se registran las escaramuzas PvP (mode:'pvp'), pero
 * aparte: los logros y el coach de campaña siguen pensados solo para la IA.
 */
export const useMatchRecorder = (options: MatchRecorderOptions): MatchRecorder => {
  const { me, rival, fallbackDeckId, isPvp, peerLeft, queueBusy } = options
  const match = useMatchStore((state) => state.match)
  const elapsedSeconds = useMatchStore((state) => state.elapsedSeconds)
  const startedAtMs = useMatchStore((state) => state.startedAtMs)
  const [achievements, setAchievements] = useState<readonly Achievement[]>([])
  /** Semilla de la última partida ya anotada, para no duplicar el registro entre renders. */
  const recordedSeed = useRef<number | undefined>(undefined)
  /** Semilla de la última desconexión del rival ya anotada como victoria propia. */
  const peerLeftRecordedSeed = useRef<number | undefined>(undefined)

  // ── Historial: anota la partida una sola vez, al terminar de reproducirse ──
  useEffect(() => {
    if (!match?.winner || queueBusy) return
    if (recordedSeed.current === match.seed) return
    recordedSeed.current = match.seed
    const unlockedBefore = new Set(
      evaluateAchievements(useRecords.getState().records).filter((a) => a.unlocked).map((a) => a.id),
    )
    useRecords.getState().addRecord(
      buildMatchRecord(match, me, rival, fallbackDeckId, {
        won: match.winner === me,
        seconds: elapsedSeconds,
        mode: isPvp ? 'pvp' : 'ai',
      }),
    )
    // Cada victoria da un sobre para el álbum (ver store/collection.ts).
    if (match.winner === me) useCollection.getState().grantPack()
    if (!isPvp) {
      // Diferido: evita anidar el setState dentro de un bloque condicional
      // del cuerpo síncrono del efecto (mismo patrón que otros canales
      // laterales de esta pantalla).
      window.setTimeout(() => {
        setAchievements(
          evaluateAchievements(useRecords.getState().records).filter((a) => a.unlocked && !unlockedBefore.has(a.id)),
        )
      }, 0)
    }
  }, [match, queueBusy, elapsedSeconds, fallbackDeckId, isPvp, me, rival])

  // Si el rival se desconecta a mitad de partida (cierra la pestaña sin
  // pulsar «Abandonar»), el motor nunca llega a poner un ganador: sin este
  // efecto, quien se queda no veía ninguna victoria anotada en su historial,
  // aunque la desconexión ajena es en la práctica un abandono del rival.
  useEffect(() => {
    if (!peerLeft || !match || match.winner) return
    if (peerLeftRecordedSeed.current === match.seed) return
    peerLeftRecordedSeed.current = match.seed
    useRecords.getState().addRecord(
      buildMatchRecord(match, me, rival, fallbackDeckId, {
        won: true,
        seconds: Math.max(1, Math.round((Date.now() - startedAtMs) / 1000)),
        mode: 'pvp',
      }),
    )
  }, [peerLeft, match, startedAtMs, fallbackDeckId, me, rival])

  const recordAbandon = (current: MatchState) => {
    // Abandonar cuenta como derrota: sin esto se podía esquivar una derrota
    // segura saliendo a mitad de partida, y el historial quedaba mintiendo.
    // Se anota también en PvP, cada jugador en su propio historial local.
    if (current.winner) return
    useRecords.getState().addRecord(
      buildMatchRecord(current, me, rival, fallbackDeckId, {
        won: false,
        seconds: Math.max(1, Math.round((Date.now() - startedAtMs) / 1000)),
        mode: isPvp ? 'pvp' : 'ai',
      }),
    )
  }

  const reset = () => {
    // Con «?seed=N» la revancha repite semilla: sin esto la nueva partida no se anotaría.
    recordedSeed.current = undefined
    setAchievements([])
  }

  return { achievements, recordAbandon, reset }
}
