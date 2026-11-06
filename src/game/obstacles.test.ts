import { describe, expect, it } from 'vitest'
import { applyAction, createMatch, getBreakableObstacles, getValidMoves } from './engine'
import { STARTER_DECKS } from './decks'
import type { BoardPiece, MatchState } from './types'

const barrier = { x: 3, y: 4 }
const unit: BoardPiece = {
  instanceId: 'lobo', cardId: 'lobo-salvaje', owner: 'player', position: { x: 3, y: 5 },
  currentHealth: 2, attackModifier: 0, movedThisTurn: false, attackedThisTurn: false,
  enteredOnTurn: 1, statuses: [],
}
const fixture = (piece = unit): MatchState => ({
  ...createMatch(STARTER_DECKS[0]!, STARTER_DECKS[1]!, 42),
  activePlayer: 'player', phase: 'main', turn: 4, animations: [],
  terrain: [{ kind: 'rubble', position: barrier }, { kind: 'cover', position: { x: 4, y: 5 } }, { kind: 'rubble', position: { x: 1, y: 5 } }],
  board: [piece],
})
const action = { type: 'break-obstacle', playerId: 'player', attackerId: unit.instanceId, position: barrier } as const

describe('ruinas destructibles', () => {
  it('rompe una ruina adyacente, conserva la cobertura y abre paso para mover', () => {
    const state = fixture()
    expect(getValidMoves(state, unit.instanceId)).not.toContainEqual(barrier)
    expect(getBreakableObstacles(state, unit.instanceId)).toEqual([barrier])
    const result = applyAction(state, action)
    expect(result.ok).toBe(true)
    expect(result.state.terrain).toEqual(state.terrain.slice(1))
    expect(result.state.board[0]).toMatchObject({ attackedThisTurn: true, movedThisTurn: false })
    expect(result.state.animations).toEqual([expect.objectContaining({ type: 'obstacle-break', from: unit.position, to: barrier })])
    expect(getValidMoves(result.state, unit.instanceId)).toContainEqual(barrier)
    expect(applyAction(result.state, action).ok).toBe(false)
  })

  it('respeta Guardia, ataque gastado, turno de entrada y vuelo', () => {
    const base = fixture()
    const guarded = { ...base, board: [...base.board, { ...unit, instanceId: 'guardia', cardId: 'escudero-del-thing', owner: 'ai' as const, position: { x: 3, y: 6 } }] }
    for (const state of [
      guarded, fixture({ ...unit, attackedThisTurn: true }), fixture({ ...unit, enteredOnTurn: 4 }),
      fixture({ ...unit, grantedKeywords: ['flying'] }), { ...base, activePlayer: 'ai' as const },
    ]) expect(applyAction(state, action).ok).toBe(false)
    expect(applyAction(base, { ...action, position: { x: 4, y: 5 } }).ok).toBe(false)
  })
})
