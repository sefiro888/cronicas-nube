import { beforeEach, describe, expect, it } from 'vitest'
import { STARTER_DECKS } from '../game/decks'
import { useAdventure, resolveAdventureAction } from './adventure'

describe('progresión de aventuras', () => {
  beforeEach(() =>
    useAdventure.setState({ run: undefined, campaignProgress: {}, sessionCounter: 0 }),
  )
  it('no permite saltar capítulos bloqueados y guarda los completados una sola vez', () => {
    const deck = STARTER_DECKS[0]!
    useAdventure.getState().startCampaign(deck.id, 2, 8)
    expect(useAdventure.getState().run?.chapter).toBe(0)
    const match = useAdventure.getState().prepareBattle()!
    useAdventure.getState().reportResult(match.seed, 'player')
    useAdventure.getState().reportResult(match.seed, 'player')
    expect(useAdventure.getState().campaignProgress[deck.faction]).toBe(1)
    expect(useAdventure.getState().run?.wins).toBe(1)
    useAdventure.getState().advance()
    expect(useAdventure.getState().run?.chapter).toBe(1)
    expect(useAdventure.getState().prepareBattle()?.seed).not.toBe(match.seed)
  })
  it('una derrota no desbloquea capítulos y reintentar usa una semilla distinta', () => {
    useAdventure.getState().startCampaign(STARTER_DECKS[0]!.id, 0, 9)
    const first = useAdventure.getState().prepareBattle()!
    useAdventure.getState().reportResult(first.seed, 'ai')
    expect(useAdventure.getState().campaignProgress).toEqual({})
    useAdventure.getState().retry()
    expect(useAdventure.getState().prepareBattle()?.seed).not.toBe(first.seed)
  })
  it('una serie termina al ganar dos combates y no cambia los mazos', () => {
    const first = STARTER_DECKS[0]!.id
    const second = STARTER_DECKS[1]!.id
    useAdventure.getState().startSeries(first, second, 12)
    const seeds: number[] = []
    for (const winner of ['player', 'ai', 'player'] as const) {
      const match = useAdventure.getState().prepareBattle()!
      seeds.push(match.seed)
      useAdventure.getState().reportResult(match.seed, winner)
      useAdventure.getState().advance()
    }
    expect(new Set(seeds).size).toBe(3)
    expect(useAdventure.getState().run).toMatchObject({
      playerDeckId: first,
      opponentDeckId: second,
      wins: 2,
      losses: 1,
      status: 'complete',
    })
    expect(useAdventure.getState().prepareBattle()).toBeUndefined()
  })
  it.each(['baluarte-tercios', 'jade-court'] as const)('la ruta guarda la victoria y permite elegir %s una vez', (node) => {
    const deck = STARTER_DECKS[0]!
    useAdventure.getState().startRoute(deck.id, 57)
    useAdventure.getState().chooseRoute(node)
    expect(useAdventure.getState().run?.routeNode).toBe('fimbul')
    const first = useAdventure.getState().prepareBattle()!
    expect(first.players.ai.nexusHealth).toBe(28)
    useAdventure.getState().reportResult(first.seed, 'player')
    useAdventure.getState().chooseRoute(node)
    useAdventure.getState().chooseRoute(node === 'jade-court' ? 'baluarte-tercios' : 'jade-court')
    expect(useAdventure.getState().run).toMatchObject({ routeNode: node, wins: 1, playerDeckId: deck.id })
    const branch = useAdventure.getState().prepareBattle()!
    expect(branch.seed).not.toBe(first.seed)
    expect(branch.players.ai.nexusHealth).toBe(node === 'jade-court' ? 30 : 38)
    if (node === 'jade-court') expect(branch.mandate).toBe('ai')
    useAdventure.getState().reportResult(branch.seed, 'player')
    expect(useAdventure.getState().run).toMatchObject({ status: 'complete', wins: 2 })
    expect(useAdventure.getState().campaignProgress).toEqual({})
  })
  it('ignora resultados de una partida ajena y no transforma acciones sin aventura activa', () => {
    useAdventure.getState().startBoss(STARTER_DECKS[1]!.id, 'corazon-caldera', 1)
    const match = useAdventure.getState().prepareBattle()!
    useAdventure.getState().reportResult(match.seed + 1, 'player')
    expect(useAdventure.getState().run?.status).toBe('fighting')
    const wounded = {
      ...match,
      seed: match.seed + 1,
      players: { ...match.players, ai: { ...match.players.ai, nexusHealth: 1 } },
    }
    expect(resolveAdventureAction(wounded, wounded)).toBe(wounded)
    useAdventure.getState().abandon()
    expect(resolveAdventureAction(match, match)).toBe(match)
  })
})
