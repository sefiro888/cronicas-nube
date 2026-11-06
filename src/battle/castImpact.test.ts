import { describe, expect, it } from 'vitest'
import { STARTER_DECKS, createMatch, type AnimationEvent, type BoardPiece, type MatchState } from '../game'
import { gridToWorld } from './grid/gridCoordinates'
import { spellChoreography } from './spellScene'
import { castImpact, durationLabel, impactHeadline } from './castImpact'

const piece = (instanceId: string, owner: 'player' | 'ai', extra: Partial<BoardPiece> = {}): BoardPiece => ({
  instanceId,
  cardId: 'sabueso-brasa',
  owner,
  position: { x: 3, y: owner === 'player' ? 5 : 2 },
  currentHealth: 3,
  attackModifier: 0,
  movedThisTurn: false,
  attackedThisTurn: false,
  enteredOnTurn: 1,
  statuses: [],
  ...extra,
})

const withBoard = (board: readonly BoardPiece[], nexus?: { player?: number; ai?: number }): MatchState => {
  const base = createMatch(STARTER_DECKS[0]!, STARTER_DECKS[1]!, 7)
  return {
    ...base,
    board,
    players: {
      player: { ...base.players.player, nexusHealth: nexus?.player ?? base.players.player.nexusHealth },
      ai: { ...base.players.ai, nexusHealth: nexus?.ai ?? base.players.ai.nexusHealth },
    },
  }
}

describe('castImpact', () => {
  it('detecta un Petardazo prestado, que el motor no anuncia con ningún evento', () => {
    const before = withBoard([piece('a', 'player'), piece('b', 'player'), piece('c', 'ai')])
    const after = withBoard([
      piece('a', 'player', { grantedPetardazo: 'turn' }),
      piece('b', 'player', { grantedPetardazo: 'turn' }),
      piece('c', 'ai'),
    ])
    const impact = castImpact(before, after)
    expect(impact.pieces.map((entry) => entry.instanceId)).toEqual(['a', 'b'])
    expect(impact.pieces[0]!.changes).toEqual([{ label: '+Petardazo', tone: 'boon', glossaryId: 'petardazo' }])
    expect(impactHeadline(impact, 'player')).toBe('Afecta a 2 unidades tuyas')
  })

  it('distingue daño, estados, muertes, hundidas y Vida del Nexo', () => {
    const before = withBoard([piece('a', 'ai'), piece('b', 'ai'), piece('c', 'ai'), piece('d', 'ai')], { ai: 30 })
    const after = {
      ...withBoard([
        piece('a', 'ai', { currentHealth: 1 }),
        piece('b', 'ai', { statuses: [{ kind: 'frozen', expiresOnTurn: 4 }] }),
      ], { ai: 27 }),
      sunkenUnits: [{ instanceId: 'd', cardId: 'sabueso-brasa', owner: 'ai' as const, origin: { x: 3, y: 2 }, returnTurn: 5 }],
    }
    const impact = castImpact(before, after)
    const labels = Object.fromEntries(impact.pieces.map((entry) => [entry.instanceId, entry.changes.map((change) => change.label)]))
    expect(labels).toEqual({ a: ['−2 Vida'], b: ['Congelada'], c: ['Destruida'], d: ['Hundida'] })
    expect(impact.nexus).toEqual({ ai: -3 })
    expect(impactHeadline(impact, 'player')).toBe('Afecta a 4 unidades rivales · el Nexo rival −3')
  })

  it('conserva el origen y el destino del empuje y no marca una unidad intacta', () => {
    const start = { x: 3, y: 4 }
    const end = { x: 3, y: 2 }
    const target = piece('objetivo', 'ai', { position: start })
    const bystander = piece('intacta', 'player')
    const cast: AnimationEvent = {
      id: 'resaca', type: 'spell', actorId: 'player', to: start, durationMs: 420,
    }
    const before = withBoard([target, bystander])
    const impact = castImpact(before, withBoard([{ ...target, position: end }, bystander]))
    expect(spellChoreography(cast, impact)).toMatchObject({
      sites: [{ at: gridToWorld(start), tone: 'neutral' }],
      routes: [{ from: gridToWorld(start), to: gridToWorld(end) }],
    })
    expect(spellChoreography(cast, castImpact(before, before))?.sites).toEqual([])
  })

  it('no cuenta nada cuando el tablero no cambia', () => {
    const board = [piece('a', 'player')]
    const impact = castImpact(withBoard(board), withBoard(board))
    expect(impact.pieces).toEqual([])
    expect(impactHeadline(impact, 'player')).toBeUndefined()
  })
})

describe('durationLabel', () => {
  it('lee la duración del texto de reglas', () => {
    expect(durationLabel('Todas tus unidades ganan Petardazo hasta el final del turno.')).toBe('Hasta el final del turno')
    expect(durationLabel('Gana +1 de Ataque permanente.')).toBe('Permanente')
    expect(durationLabel('Inflige 3 de daño.')).toBeUndefined()
  })
})
