import { useEffect, useRef } from 'react'
import { chooseNextAiAction, type GameAction } from '../../game'
import { useMatchStore } from '../../store/match'
import type { AiDifficulty } from '../../store/preferences'

/**
 * Tope de acciones por turno de la IA: si una heurística entrara en bucle
 * (jugar y deshacer la misma carta), el turno se cierra por la fuerza en vez
 * de colgar la partida.
 */
const MAX_AI_STEPS = 72

export interface AiTurnOptions {
  /** En multijugador el bando 'ai' del motor es un humano: el bot no debe jugar por él. */
  enabled: boolean
  difficulty: AiDifficulty
  delayMs: number
  /** No pensar mientras se reproducen animaciones o hay un escrutinio abierto. */
  blocked: boolean
}

/**
 * Turno de la IA paso a paso: cada tick pide una acción a la heurística y la
 * despacha, hasta que decide ceder el turno.
 *
 * Devuelve `reset`, que hay que llamar al empezar una partida nueva para que
 * el contador de pasos y la lista de cartas descartadas no se arrastren.
 */
export const useAiTurn = (options: AiTurnOptions): { reset: () => void } => {
  const { enabled, difficulty, delayMs, blocked } = options
  const activePlayer = useMatchStore((state) => state.match?.activePlayer)
  const turn = useMatchStore((state) => state.match?.turn)
  const winner = useMatchStore((state) => state.match?.winner)
  const pendingSpark = useMatchStore((state) => state.match?.pendingSpark)
  const pendingDecisions = useMatchStore((state) => state.match?.pendingDecisions)
  const pendingCount = useMatchStore((state) => state.pendingAnimations.length)
  const steps = useRef(0)
  /** Cartas que la IA ya intentó jugar sin éxito este turno: no se reintentan. */
  const skipped = useRef(new Set<string>())

  useEffect(() => {
    if (!enabled) return
    const current = useMatchStore.getState().match
    if (!current || current.activePlayer !== 'ai' || current.winner || blocked) return
    const delay = Math.max(140, delayMs / 3)
    let timer: number
    const step = () => {
      const stateNow = useMatchStore.getState()
      const matchNow = stateNow.match
      if (!matchNow || matchNow.activePlayer !== 'ai' || matchNow.winner) return
      if (stateNow.currentEvent || stateNow.pendingAnimations.length > 0) return
      stateNow.setAiThinking(true)
      const action: GameAction =
        steps.current >= MAX_AI_STEPS
          ? { type: 'end-turn', playerId: 'ai' }
          : chooseNextAiAction(matchNow, skipped.current, difficulty)
      const ok = stateNow.dispatch(action)
      if (!ok) {
        stateNow.setMessage(undefined)
        if (action.type === 'play-card' || action.type === 'play-resource') {
          skipped.current.add(action.cardInstanceId)
          // Al rechazarse una carta no llegan eventos ni cambia el turno.
          // La siguiente consulta necesita su propio tick para poder probar otra.
          timer = window.setTimeout(step, delay)
        } else {
          const forced = stateNow.dispatch({ type: 'end-turn', playerId: 'ai' })
          if (!forced) stateNow.setMessage(undefined)
        }
      }
      steps.current += 1
      if (action.type === 'end-turn') {
        steps.current = 0
        skipped.current = new Set()
      }
      stateNow.setAiThinking(false)
    }
    timer = window.setTimeout(step, delay)
    return () => window.clearTimeout(timer)
  }, [activePlayer, turn, winner, blocked, delayMs, difficulty, pendingCount, enabled, pendingSpark, pendingDecisions])

  const reset = () => {
    steps.current = 0
    skipped.current = new Set()
  }

  return { reset }
}
