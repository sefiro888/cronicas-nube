import { describe, expect, it } from 'vitest'
import { CARD_BY_ID, STARTER_DECKS, createMatch, type BoardPiece, type MatchState, type PlayerId, type Position } from '../game'
import { threatLinks } from './threats'

const melee = Object.values(CARD_BY_ID).find((card) => card.type === 'unit' && (card.range ?? 1) === 1 && !card.keywords.includes('guard') && card.effects.length === 0)!

const piece = (instanceId: string, owner: PlayerId, position: Position): BoardPiece => ({
  instanceId, cardId: melee.id, owner, position, currentHealth: melee.health ?? 2,
  attackModifier: 0, movedThisTurn: false, attackedThisTurn: false, enteredOnTurn: 0, statuses: [],
})

const scene = (board: readonly BoardPiece[]): MatchState => ({
  ...createMatch(STARTER_DECKS[0]!, STARTER_DECKS[1]!, 3), terrain: [], turn: 5, phase: 'main', activePlayer: 'player', board,
})

describe('amenazas', () => {
  it('dos unidades pegadas se amenazan mutuamente', () => {
    const state = scene([piece('mia', 'player', { x: 3, y: 4 }), piece('suya', 'ai', { x: 3, y: 3 })])
    const links = threatLinks(state, 'mia')
    expect(links.targets).toEqual(['suya'])
    expect(links.attackers).toEqual(['suya'])
  })

  it('una unidad lejana no amenaza', () => {
    const state = scene([piece('mia', 'player', { x: 0, y: 7 }), piece('suya', 'ai', { x: 7, y: 0 })])
    expect(threatLinks(state, 'mia').attackers).toEqual([])
  })
})
