import { describe, expect, it } from 'vitest'
import { STARTER_DECKS } from './decks'
import { createMatch } from './engine'
import { FACTION_IDS, type MatchState } from './types'
import {
  ADVENTURE_BOSSES,
  bossById,
  campaignChapters,
  createAdventureMatch,
  resolveBossAction,
} from './adventure'

const setup = (bossId = 'corazon-caldera') => {
  const boss = bossById(bossId)!
  const opponent = STARTER_DECKS.find((deck) => deck.faction === boss.faction)!
  return {
    boss,
    match: createAdventureMatch({
      playerDeckId: STARTER_DECKS[1]!.id,
      opponentDeckId: opponent.id,
      bossId: boss.id,
      seed: 77,
    }),
  }
}
const health = (state: MatchState, ai: number): MatchState => ({
  ...state,
  players: { ...state.players, ai: { ...state.players.ai, nexusHealth: ai } },
})

describe('crónicas y guardianes aislados', () => {
  it('ofrece tres capítulos jugables y narración propia en cada facción', () => {
    const introductions = new Set<string>()
    for (const faction of FACTION_IDS) {
      const chapters = campaignChapters(faction)
      expect(chapters).toHaveLength(3)
      expect(chapters[2]!.bossId).toBeDefined()
      for (const chapter of chapters) {
        expect(STARTER_DECKS.some((deck) => deck.id === chapter.opponentDeckId)).toBe(true)
        expect(chapter.dialogue.length).toBeGreaterThan(35)
        expect(chapter.objective.length).toBeGreaterThan(25)
      }
      introductions.add(chapters[0]!.introduction)
    }
    expect(introductions.size).toBe(19)
  })
  it('aplica la Vida especial únicamente al preparar el desafío', () => {
    for (const boss of ADVENTURE_BOSSES) {
      const { match } = setup(boss.id)
      expect(match.players.ai.nexusHealth).toBe(boss.health)
    }
    const standard = createMatch(STARTER_DECKS[0]!, STARTER_DECKS[1]!, 77)
    expect(standard.players.ai.nexusHealth).toBe(35)
  })
  it('un golpe letal en primera fase despierta al jefe antes de la victoria', () => {
    const { boss, match } = setup()
    const lethal: MatchState = {
      ...health(match, 0),
      winner: 'player',
      phase: 'finished',
      animations: [{ id: 'event-1', type: 'victory', actorId: 'player', durationMs: 900 }],
      nextId: 2,
    }
    const result = resolveBossAction(match, lethal, boss, 1)
    expect(result.phase).toBe(2)
    expect(result.state.winner).toBeUndefined()
    expect(result.state.phase).toBe('main')
    expect(result.state.players.ai.nexusHealth).toBe(boss.secondWind)
    expect(result.state.animations.some((event) => event.type === 'victory')).toBe(false)
    expect(result.state.animations.at(-1)?.effectId).toContain('boss-awaken')
    expect(resolveBossAction(result.state, lethal, boss, 2).state.winner).toBe('player')
  })
  it('la segunda fase no se cura otra vez al recibir otro golpe', () => {
    const { boss, match } = setup()
    const first = resolveBossAction(match, health(match, 20), boss, 1)
    expect(first.state.players.ai.nexusHealth).toBe(32)
    const wounded = health(first.state, 8)
    const repeated = resolveBossAction(first.state, wounded, boss, first.phase)
    expect(repeated.changed).toBe(false)
    expect(repeated.state.players.ai.nexusHealth).toBe(8)
  })
  it('la erupción pulsa una vez al empezar el turno del jefe, sin repetir en otras acciones', () => {
    const { boss, match } = setup()
    const entered = { ...match, activePlayer: 'ai' as const, turn: 2 }
    const pulse = resolveBossAction(match, entered, boss, 2)
    expect(pulse.state.players.player.nexusHealth).toBe(match.players.player.nexusHealth - 2)
    const notAgain = resolveBossAction(
      pulse.state,
      { ...pulse.state, nextId: pulse.state.nextId + 1 },
      boss,
      2,
    )
    expect(notAgain.changed).toBe(false)
  })
  it('un pulso letal termina la partida y nunca resucita a un jugador derrotado', () => {
    const { boss, match } = setup()
    const before = {
      ...match,
      players: { ...match.players, player: { ...match.players.player, nexusHealth: 1 } },
    }
    const pulse = resolveBossAction(before, { ...before, activePlayer: 'ai' }, boss, 2)
    expect(pulse.state.winner).toBe('ai')
    expect(pulse.state.phase).toBe('finished')
    expect(pulse.state.animations.at(-1)?.type).toBe('victory')
    expect(
      resolveBossAction(before, { ...health(before, 1), winner: 'ai', phase: 'finished' }, boss, 1)
        .phase,
    ).toBe(1)
  })
  it('la singularidad añade fuentes únicas y el drenaje respeta el máximo de Vida', () => {
    const { boss, match } = setup('hambre-vacio')
    const awakened = resolveBossAction(match, health(match, 20), boss, 1)
    expect(awakened.state.players.ai.resources).toHaveLength(2)
    expect(
      new Set(awakened.state.players.ai.resources.map((source) => source.instanceId)).size,
    ).toBe(2)
    const full = health(awakened.state, boss.health)
    const pulse = resolveBossAction(full, { ...full, activePlayer: 'ai' }, boss, 2)
    expect(pulse.state.players.ai.nexusHealth).toBe(boss.health)
    expect(pulse.state.players.player.nexusHealth).toBe(full.players.player.nexusHealth - 1)
  })
  it('el bastión protege a sus unidades sin rebajar un escudo mayor existente', () => {
    const { boss, match } = setup('centinela-alba')
    const piece = {
      instanceId: 'guardian',
      cardId: 'pegaso-celestial',
      owner: 'ai' as const,
      position: { x: 3, y: 0 },
      currentHealth: 3,
      attackModifier: 0,
      movedThisTurn: false,
      attackedThisTurn: false,
      enteredOnTurn: 1,
      statuses: [{ kind: 'shielded' as const, amount: 5 }],
    }
    const first = resolveBossAction(match, { ...health(match, 20), board: [piece] }, boss, 1)
    expect(first.state.board[0]!.statuses).toEqual([{ kind: 'shielded', amount: 5 }])
    expect(first.state.animations.some((event) => event.type === 'shield')).toBe(true)
  })
})
