import { describe, expect, it } from 'vitest'
import { applyAction, CARD_BY_ID, STARTER_DECKS, createMatch, type BoardPiece, type MatchState } from '../game'
import { resolvedEffectsFor } from './resolvedEffects'

const attacker: BoardPiece = {
  instanceId: 'lobo', cardId: 'lobo-salvaje', owner: 'player', position: { x: 3, y: 5 }, currentHealth: 5,
  attackModifier: 4 - (CARD_BY_ID['lobo-salvaje']?.attack ?? 0), movedThisTurn: false, attackedThisTurn: false, enteredOnTurn: 0, statuses: [],
}
const defender: BoardPiece = {
  ...attacker, instanceId: 'sabueso', cardId: 'sabueso-brasa', owner: 'ai', position: { x: 3, y: 4 },
  attackModifier: 0, currentHealth: 5, statuses: [{ kind: 'shielded', amount: 2 }],
}
const boardWith = (board: readonly BoardPiece[]): MatchState => ({
  ...createMatch(STARTER_DECKS[0]!, STARTER_DECKS[1]!, 87), activePlayer: 'player', phase: 'main', turn: 5,
  terrain: [], animations: [], board,
})

describe('crónica de efectos resueltos', () => {
  it('distingue escudo absorbido y Vida perdida en el orden real de un ataque', () => {
    const before = boardWith([attacker, defender])
    const result = applyAction(before, { type: 'attack-piece', playerId: 'player', attackerId: attacker.instanceId, defenderId: defender.instanceId })
    expect(result.ok).toBe(true)
    const effects = resolvedEffectsFor(before, result.state, result.state.animations)
    const target = effects.filter((effect) => effect.target === CARD_BY_ID[defender.cardId]?.name)
    expect(target.map(({ text }) => text)).toEqual(['Protección absorbe 2', '−2 Vida'])
    expect(target[1]).toMatchObject({ source: CARD_BY_ID[attacker.cardId]?.name, before: 5, after: 3 })
  })

  it('registra el contagio del final del turno sin inventar un atacante', () => {
    const before = boardWith([{ ...attacker, statuses: [{ kind: 'infected', infectorId: 'ai' }] }])
    const result = applyAction(before, { type: 'end-turn', playerId: 'player' })
    expect(result.ok).toBe(true)
    expect(resolvedEffectsFor(before, result.state, result.state.animations)).toContainEqual(expect.objectContaining({
      source: 'Contagio', target: CARD_BY_ID[attacker.cardId]?.name, tone: 'periodic', text: 'Contagio · −1 Vida', before: 5, after: 4,
    }))
  })
})
