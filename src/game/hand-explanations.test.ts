import { describe, expect, it } from 'vitest'
import { CARD_BY_ID, CARDS } from './cards'
import { STARTER_DECKS } from './decks'
import { applyAction, canPlayHandCard, createMatch, getValidDeploymentPositions, handCardBlockReason, handCardCostDetails, validSpellTargets } from './engine'
import type { BoardPiece, CardInstance, FactionId, MatchState, PlayerState, ResourceState } from './types'

const piece = (instanceId: string, owner: 'player' | 'ai', x: number, y: number, currentHealth = 2): BoardPiece => ({ instanceId, cardId: 'sabueso-brasa', owner, position: { x, y }, currentHealth, attackModifier: 0, movedThisTurn: false, attackedThisTurn: false, enteredOnTurn: 0, statuses: [] })
const resources = (faction: FactionId, count = 12): ResourceState[] => Array.from({ length: count }, (_, index) => ({ instanceId: `fuente-${index}`, cardId: CARDS.find((card) => card.type === 'mana' && card.faction === faction)!.id, faction, exhausted: false }))
const scenario = (cardId: string, player: Partial<PlayerState> = {}, extra: Partial<MatchState> = {}, copy: Partial<CardInstance> = {}): MatchState => {
  const base = createMatch(STARTER_DECKS[0]!, STARTER_DECKS[1]!, 42)
  const card = CARD_BY_ID[cardId]!
  return { ...base, terrain: [], phase: 'main', activePlayer: 'player', turn: 5, board: [], players: { ...base.players, player: { ...base.players.player, mulliganTaken: true, hand: [{ instanceId: 'copia', cardId, ...copy }], resources: resources(card.faction), ...player } }, ...extra }
}
const explain = (state: MatchState, cardId: string) => handCardBlockReason(state, 'player', CARD_BY_ID[cardId]!, state.players.player.hand[0]!)

describe('explicaciones de las cartas de la mano', () => {
  it('explica el turno, la fase y las elecciones pendientes igual que el rechazo real', () => {
    const id = 'sabueso-brasa'
    for (const overrides of [{ activePlayer: 'ai' as const }, { phase: 'draw' as const }, { phase: 'finished' as const }, { pendingSpark: { owner: 'player' as const, cardInstanceId: 'chispa', offering: false, faces: ['cara' as const] } }]) {
      const state = scenario(id, {}, overrides)
      const result = applyAction(state, { type: 'play-card', playerId: 'player', cardInstanceId: 'copia', position: { x: 3, y: 7 } })
      expect(result.ok).toBe(false)
      expect(explain(state, id)).toBe(result.error?.message)
      expect(canPlayHandCard(state, 'player', CARD_BY_ID[id]!, state.players.player.hand[0]!)).toBe(false)
    }
  })

  it('explica una fuente ya utilizada y permite la del turno siguiente', () => {
    const state = scenario('fuente-furia', { resourcePlayedThisTurn: true })
    expect(explain(state, 'fuente-furia')).toMatch(/fuente.*turno/)
    const blocked = applyAction(state, { type: 'play-resource', playerId: 'player', cardInstanceId: 'copia' })
    expect(blocked.error?.code).toBe('resource-already-played')
    const next = { ...state, players: { ...state.players, player: { ...state.players.player, resourcePlayedThisTurn: false } } }
    expect(explain(next, 'fuente-furia')).toBeUndefined()
    expect(applyAction(next, { type: 'play-resource', playerId: 'player', cardInstanceId: 'copia' }).ok).toBe(true)
  })

  it('distingue falta de Esencia de color aunque sobre Esencia de otra facción', () => {
    const state = scenario('dragon-caldera', { resources: resources('nature', 20) })
    expect(explain(state, 'dragon-caldera')).toMatch(/Esencia.*tipo/)
    expect(applyAction(state, { type: 'play-card', playerId: 'player', cardInstanceId: 'copia', position: { x: 3, y: 7 } }).error?.code).toBe('insufficient-mana')
  })

  it('distingue falta de sacrificio y no ilumina una carta que el motor rechazará', () => {
    const card = CARDS.find((candidate) => candidate.type === 'unit' && candidate.effects.some((effect) => effect.kind === 'sacrifice'))!
    const state = scenario(card.id)
    expect(explain(state, card.id)).toMatch(/sacrificar/)
    const rejected = applyAction(state, { type: 'play-card', playerId: 'player', cardInstanceId: 'copia', position: { x: 3, y: 7 } })
    expect(rejected.ok).toBe(false)
    expect(rejected.error?.message).toMatch(/sacrificar/)
    const available = { ...state, board: [piece('ofrenda', 'player', 3, 6)] }
    expect(explain(available, card.id)).toBeUndefined()
    expect(applyAction(available, { type: 'play-card', playerId: 'player', cardInstanceId: 'copia', position: { x: 3, y: 7 } }).ok).toBe(true)
  })

  it('explica un despliegue completamente ocupado', () => {
    const state = scenario('sabueso-brasa', {}, { board: Array.from({ length: 8 }, (_, x) => piece(`rival-${x}`, 'ai', x, 7)) })
    expect(getValidDeploymentPositions(state, 'player')).toHaveLength(0)
    expect(explain(state, 'sabueso-brasa')).toMatch(/casillas.*despliegue/)
  })

  it('no confunde tener enemigo con tener objetivo legal para Juicio Divino', () => {
    const state = scenario('juicio-divino', {}, { board: [piece('rival', 'ai', 3, 3, 3)] })
    expect(explain(state, 'juicio-divino')).toMatch(/objetivo válido/)
    const ready = { ...state, board: [piece('rival', 'ai', 3, 3, 2)] }
    expect(explain(ready, 'juicio-divino')).toBeUndefined()
    expect(applyAction(ready, { type: 'play-card', playerId: 'player', cardInstanceId: 'copia', target: { kind: 'piece', pieceId: 'rival' } }).ok).toBe(true)
  })

  it('el coste explicado de Renacer y Mandato coincide con la Esencia que se cobra', () => {
    const state = scenario('dragon-caldera', { commanderId: 'xiwangmu-la-reina-madre', firstCardDiscountUsedThisTurn: false, resources: resources('fury', 4) }, { mandate: 'player' }, { costDiscount: 2 })
    const instance = state.players.player.hand[0]!
    const details = handCardCostDetails(state, 'player', CARD_BY_ID['dragon-caldera']!, instance)
    expect(details.baseCost).toEqual({ generic: 5, colored: { fury: 2 } })
    expect(details.cost).toEqual({ generic: 2, colored: { fury: 2 } })
    expect(details.reasons.join(' · ')).toMatch(/Renacer.*Mandato/)
    expect(explain(state, 'dragon-caldera')).toBeUndefined()
    const result = applyAction(state, { type: 'play-card', playerId: 'player', cardInstanceId: 'copia', position: { x: 3, y: 7 } })
    expect(result.ok).toBe(true)
    expect(result.state.players.player.resources.filter((resource) => resource.exhausted)).toHaveLength(4)
  })

  it('no atribuye a Renacer un descuento que ya había agotado la pasiva de unidad', () => {
    const card = CARDS.find((candidate) => candidate.type === 'unit' && candidate.cost.generic === 1)!
    const state = scenario(card.id, { unitDiscountPending: true }, {}, { costDiscount: 3 })
    const details = handCardCostDetails(state, 'player', card, state.players.player.hand[0]!)
    expect(details.cost.generic).toBe(0)
    expect(details.reasons.join(' · ')).not.toMatch(/Renacer|Pira/)
    expect(details.reasons).toHaveLength(1)
  })

  it('no atribuye al Mandato una rebaja cuando Renacer ya dejó el genérico en cero', () => {
    const state = scenario('dragon-caldera', { commanderId: 'xiwangmu-la-reina-madre', firstCardDiscountUsedThisTurn: false }, { mandate: 'player' }, { costDiscount: 8 })
    const details = handCardCostDetails(state, 'player', CARD_BY_ID['dragon-caldera']!, state.players.player.hand[0]!)
    expect(details.cost.generic).toBe(0)
    expect(details.reasons).toEqual(['Renacer · Pira del Ghat'])
  })

  it('cada carta señalada como lista tiene una acción real aceptada por el motor', () => {
    const failures: string[] = []
    for (const card of CARDS) {
      const state = scenario(card.id, {}, { board: [piece('aliado', 'player', 1, 6), piece('rival', 'ai', 3, 3)] })
      const instance = state.players.player.hand[0]!
      if (!canPlayHandCard(state, 'player', card, instance)) continue
      const target = validSpellTargets(state, 'player', card)[0]
      const result = card.type === 'mana'
        ? applyAction(state, { type: 'play-resource', playerId: 'player', cardInstanceId: instance.instanceId })
        : applyAction(state, { type: 'play-card', playerId: 'player', cardInstanceId: instance.instanceId, position: card.type !== 'instant' ? getValidDeploymentPositions(state, 'player')[0] : undefined, target: target ? { kind: 'piece', pieceId: target.instanceId } : undefined })
      if (!result.ok) failures.push(`${card.id}: ${result.error?.message}`)
    }
    expect(failures).toEqual([])
  })
})
