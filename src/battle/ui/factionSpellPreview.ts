import { pushOne } from '../../game/marea'
import { applyAction, CARD_BY_ID, type MatchState, type PlayerId, type Position } from '../../game'

/** Ensaya el mismo lanzamiento que confirmaría el jugador, sobre una copia del estado. */
export function previewFactionSpell(state: MatchState, playerId: PlayerId, instanceId: string, cardId: string, position?: Position, targetId?: string) {
  if (cardId === 'resaca-subita' && targetId) {
    const before = state.board.find((piece) => piece.instanceId === targetId)
    if (!before) return undefined
    const result = applyAction({ ...state, animations: [] }, {
      type: 'play-card', playerId, cardInstanceId: instanceId, target: { kind: 'piece', pieceId: targetId },
    })
    if (!result.ok) return undefined
    const after = result.state.board.find((piece) => piece.instanceId === targetId)
    const push = CARD_BY_ID[cardId]?.effects.find((effect) => effect.kind === 'push-target')
    // Si el empuje rompe Formación y la unidad cae, su destino ya no figura en el saldo.
    const destination = after?.position ?? (push && pushOne(state, playerId, targetId, push.amount, push.toward)
      .board.find((piece) => piece.instanceId === targetId)?.position)
    const route: Position[] = []
    if (destination) {
      const count = Math.abs(destination.y - before.position.y)
      const step = Math.sign(destination.y - before.position.y)
      for (let i = 1; i <= count; i++) route.push({ x: before.position.x, y: before.position.y + i * step })
    }
    const name = CARD_BY_ID[before.cardId]?.name ?? 'La unidad'
    return { kind: 'push' as const, targetId, name, origin: before.position, route, limit: push?.amount ?? 2, falls: !after }
  }
  if (cardId === 'dragon-del-rio-amarillo' && position && state.mandate === playerId) {
    const result = applyAction({ ...state, animations: [] }, {
      type: 'play-card', playerId, cardInstanceId: instanceId, position, target: { kind: 'none' },
    })
    if (!result.ok) return undefined
    const freeze = result.state.animations.find((event) => event.type === 'freeze' && event.effectId === 'freeze-lock')
    const target = state.board.find((piece) => piece.instanceId === freeze?.targetId)
    return { kind: 'freeze' as const, targetId: target?.instanceId, name: target && CARD_BY_ID[target.cardId]?.name, turns: freeze?.statusTurns }
  }
  return undefined
}
