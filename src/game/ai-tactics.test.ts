import { describe, expect, it } from 'vitest'
import { chooseBaselineAiAction, chooseNextAiAction } from './ai'
import { CARD_BY_ID } from './cards'
import { STARTER_DECKS } from './decks'
import { applyAction, createMatch } from './engine'
import type { BoardPiece, FactionId, GameAction, MatchState, PlayerId } from './types'

const tacticalDeck = (faction: FactionId) => STARTER_DECKS.find((deck) => deck.faction === faction)!

const piece = (id: string, cardId: string, owner: PlayerId, x: number, y: number, overrides: Partial<BoardPiece> = {}): BoardPiece => ({
  instanceId: id, cardId, owner, position: { x, y },
  currentHealth: CARD_BY_ID[cardId]!.health ?? CARD_BY_ID[cardId]!.resistance ?? 1,
  attackModifier: 0, movedThisTurn: false, attackedThisTurn: false, enteredOnTurn: 0, statuses: [], ...overrides,
})

const scenario = (faction: FactionId, hand: readonly string[], board: readonly BoardPiece[]): MatchState => {
  const state = createMatch(tacticalDeck(faction), tacticalDeck('fury'), 64)
  return {
    ...state, turn: 4, activePlayer: 'player', phase: 'main', board, terrain: [], animations: [],
    players: {
      player: {
        ...state.players.player, commanderPowerUsed: true, mulliganTaken: true, resourcePlayedThisTurn: true,
        hand: hand.map((cardId) => ({ instanceId: cardId, cardId })),
        resources: hand.length ? Array.from({ length: 5 }, (_, index) => ({
          instanceId: `fuente-${index}`, cardId: CARD_BY_ID[hand[0]!]?.faction === 'duna' ? 'fuente-duna' : 'fuente-marea',
          faction, exhausted: false,
        })) : [],
      },
      ai: { ...state.players.ai, hand: [], commanderPowerUsed: true, mulliganTaken: true },
    },
  }
}

const choose = (state: MatchState) => chooseNextAiAction(state, new Set(), 'normal', 'player', { maxSimulations: 90 })
const resolve = (state: MatchState, action: GameAction): MatchState => {
  const result = applyAction(state, action)
  expect(result.ok, JSON.stringify(action)).toBe(true)
  return { ...result.state, animations: [] }
}

describe('IA de facción en posiciones reproducibles', () => {
  it('Tercios conserva la unidad que perdería su último apoyo y acepta el fin de turno', () => {
    const state = scenario('tercios', [], [
      piece('apoyo', 'sabueso-brasa', 'player', 3, 4),
      piece('formada', 'sabueso-brasa', 'player', 4, 4, { currentHealth: 1, grantedFormation: true, formationHealthApplied: 1, movedThisTurn: true, attackedThisTurn: true }),
    ])
    const baseline = resolve(state, chooseBaselineAiAction(state, new Set(), 'normal', 'player'))
    expect(baseline.board.some((unit) => unit.instanceId === 'formada')).toBe(false)
    const tactical = resolve(state, choose(state))
    expect(tactical.board.some((unit) => unit.instanceId === 'formada')).toBe(true)
  })

  it('Marea desplaza la guardia, avanza y remata en tres decisiones reales', () => {
    const base = scenario('marea', ['canto-de-la-sirena'], [
      piece('atacante', 'sabueso-brasa', 'player', 3, 1),
      piece('guardia', 'guardia-de-terracota', 'ai', 4, 0),
      piece('cebo', 'gigante-magma', 'ai', 6, 4, { statuses: [{ kind: 'frozen', expiresOnTurn: 10 }] }),
    ])
    const state: MatchState = { ...base, terrain: [2].map((x) => ({ kind: 'rubble', position: { x, y: 0 } })), players: { ...base.players, ai: { ...base.players.ai, nexusHealth: 2 } } }
    const forced = resolve(state, { type: 'play-card', playerId: 'player', cardInstanceId: 'canto-de-la-sirena', target: { kind: 'piece', pieceId: 'guardia' } })
    const walked = resolve(forced, { type: 'move', playerId: 'player', pieceId: 'atacante', to: { x: 3, y: 0 } })
    expect(resolve(walked, { type: 'attack-nexus', playerId: 'player', attackerId: 'atacante' }).winner).toBe('player')
    const first = choose(state)
    expect(first).toMatchObject({ type: 'play-card', target: { kind: 'piece', pieceId: 'guardia' } })
    const opened = resolve(state, first)
    const second = choose(opened)
    expect(second).toMatchObject({ type: 'move', pieceId: 'atacante', to: { y: 0 } })
    const advanced = resolve(opened, second)
    const third = choose(advanced)
    expect(third.type).toBe('attack-nexus')
    expect(resolve(advanced, third).winner).toBe('player')
  })

  it('Duna paga por debajo del umbral antiguo si eso elimina un remate inmediato', () => {
    const base = scenario('duna', ['plegaria-al-sol'], [
      piece('amenaza', 'gigante-magma', 'ai', 3, 7, { attackModifier: 10, currentHealth: 5 }),
    ])
    const state = { ...base, players: { ...base.players, player: { ...base.players.player, nexusHealth: 11 } } }
    expect(chooseBaselineAiAction(state, new Set(), 'normal', 'player')).not.toMatchObject({ offering: true })
    const action = choose(state)
    expect(action).toMatchObject({ type: 'play-card', offering: true })
    const after = resolve(state, action)
    expect(after.board).toHaveLength(0)
    expect(after.players.player.nexusHealth).toBe(9)
  })

  it('Duna encadena una Ofrenda con el Juicio de una carta que ya conocía', () => {
    const base = scenario('duna', ['plegaria-al-sol', 'balanza-de-maat'], [
      piece('amenaza', 'gigante-magma', 'ai', 3, 7, { attackModifier: 8, currentHealth: 11 }),
      piece('segunda', 'oso-forestal', 'ai', 4, 7, { currentHealth: 5 }),
    ])
    const state = { ...base, players: {
      player: { ...base.players.player, nexusHealth: 13 },
      ai: { ...base.players.ai, nexusHealth: 12 },
    } }
    const first = choose(state)
    expect(first).toMatchObject({ type: 'play-card', cardInstanceId: 'plegaria-al-sol', offering: true })
    const offered = resolve(state, first)
    const second = choose(offered)
    expect(second).toMatchObject({ type: 'play-card', cardInstanceId: 'balanza-de-maat' })
    expect(resolve(offered, second).board.some((unit) => unit.instanceId === 'amenaza')).toBe(false)
  })

  it('Duna conserva Vida si el efecto extra no cambia qué amenaza elimina', () => {
    const state = scenario('duna', ['plegaria-al-sol'], [
      piece('amenaza', 'gigante-magma', 'ai', 3, 7, { currentHealth: 3 }),
    ])
    expect(chooseBaselineAiAction(state, new Set(), 'normal', 'player')).toMatchObject({ offering: true })
    expect(choose(state)).toMatchObject({ type: 'play-card', offering: false })
  })

  it('Goblins resuelve la cara sin blanco si la tirada no tiene objetivos legales', () => {
    const base = scenario('goblins', ['chispazo'], [])
    const state: MatchState = {
      ...base,
      players: { ...base.players, player: {
        ...base.players.player,
        resources: [{ instanceId: 'chispeante', cardId: 'fuente-goblin', faction: 'goblins', exhausted: false }],
      } },
      pendingSpark: { owner: 'player', cardInstanceId: 'chispazo', offering: false, faces: ['cara'] },
    }
    const action = choose(state)
    expect(action).toMatchObject({ type: 'choose-spark', face: 'cara' })
    expect(resolve(state, action).pendingSpark).toBeUndefined()
  })

  it('Goblins elige Petardazo cuando perder una pieza elimina dos amenazas', () => {
    const state = scenario('goblins', [], [
      piece('bomba', 'pinche-de-polvora', 'player', 3, 4),
      piece('rival-a', 'berserker-ignivoro', 'ai', 3, 3, { currentHealth: 2 }),
      piece('rival-b', 'berserker-ignivoro', 'ai', 4, 4, { currentHealth: 2 }),
    ])
    const action = choose(state)
    expect(action).toMatchObject({ type: 'attack-piece', attackerId: 'bomba' })
    const after = resolve(state, action)
    expect(after.board).toHaveLength(0)
  })

  it('en un tablero de 48 piezas devuelve una acción legal con el presupuesto de batalla', () => {
    const board = Array.from({ length: 48 }, (_, index) => {
      const x = index % 8
      const y = Math.floor(index / 8) + 1
      return piece(`lleno-${index}`, y <= 3 ? 'oso-forestal' : 'piquero-de-flandes', y <= 3 ? 'ai' : 'player', x, y)
    })
    const state = scenario('tercios', [], board)
    const snapshot = structuredClone(state)
    const durations = Array.from({ length: 24 }, () => {
      const start = performance.now()
      const action = chooseNextAiAction(state, new Set(), 'normal', 'player')
      const duration = performance.now() - start
      resolve(state, action)
      return duration
    })
    expect(Math.max(...durations)).toBeLessThan(300)
    expect(state).toEqual(snapshot)
    console.info('Mesa de 48 piezas, ms por decisión:', durations.map((value) => value.toFixed(2)).join(', '))
  })

  it('con un presupuesto agotado conserva una jugada legal y el estado de entrada', () => {
    const state = scenario('marea', ['resaca-subita'], [piece('rival', 'sabueso-brasa', 'ai', 3, 4)])
    const snapshot = structuredClone(state)
    const action = chooseNextAiAction(state, new Set(), 'normal', 'player', { maxSimulations: 0, maxMs: 0 })
    resolve(state, action)
    expect(state).toEqual(snapshot)
  })
})
