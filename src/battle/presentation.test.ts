import { describe, expect, it } from 'vitest'
import {
  CARDS,
  COMMANDER_BY_ID,
  STARTER_DECKS,
  applyAction,
  createMatch,
  type AnimationEvent,
  type BoardPiece,
  type CardDefinition,
  type MatchState,
  type PlayerId,
} from '../game'
import { eventDuration } from './eventTiming'
import { clashExchange, combatTraits, duelIntroDuration, endsExchange, foldExchange, openExchange, pushRecentPlay, recentPlayFor, spotlightFor, spotlightHeading } from './presentation'

const freshMatch = (): MatchState => ({ ...createMatch(STARTER_DECKS[0]!, STARTER_DECKS[1]!, 42), terrain: [] })

/** Esencia de sobra de todas las facciones: aquí no se prueba el pago. */
const richPlayer = (state: MatchState, playerId: PlayerId, hand: readonly string[]): MatchState => {
  const resources = Array.from({ length: 12 }, (_, index) => ({
    instanceId: `essence-${index}`, cardId: 'fuente-furia', faction: STARTER_DECKS[0]!.faction, exhausted: false,
  }))
  return {
    ...state,
    activePlayer: playerId,
    phase: 'main',
    players: {
      ...state.players,
      [playerId]: {
        ...state.players[playerId],
        mulliganTaken: true,
        resources,
        hand: hand.map((cardId, index) => ({ cardId, instanceId: `hand-${index}` })),
      },
    },
  }
}

const enemyUnit = (cardId: string): BoardPiece => ({
  instanceId: 'diana', cardId, owner: 'ai', position: { x: 3, y: 2 }, currentHealth: 9,
  attackModifier: 0, movedThisTurn: false, attackedThisTurn: false, enteredOnTurn: 0, statuses: [],
})

const factionCards = (type: CardDefinition['type']) =>
  CARDS.filter((card) => card.faction === STARTER_DECKS[0]!.faction && card.type === type)

describe('el motor marca las jugadas que merecen presentarse', () => {
  it('un hechizo inmediato abre su resolución con un evento «cast» que nombra la carta', () => {
    const victim = CARDS.find((card) => card.type === 'unit' && card.faction === STARTER_DECKS[1]!.faction)!
    let checked = 0
    for (const spell of factionCards('instant')) {
      const base = { ...richPlayer(freshMatch(), 'player', [spell.id]), board: [enemyUnit(victim.id)] }
      const attempts = [undefined, { kind: 'piece' as const, pieceId: 'diana' }, { kind: 'nexus' as const, playerId: 'ai' as const }]
      for (const target of attempts) {
        const result = applyAction(base, { type: 'play-card', playerId: 'player', cardInstanceId: 'hand-0', target })
        if (!result.ok) continue
        const cast = result.state.animations.find((event) => event.cast)
        expect(cast?.cast).toEqual({ kind: 'spell', sourceId: spell.id })
        expect(cast?.actorId).toBe('player')
        // Va antes que cualquier daño: la carta se ve antes que su efecto.
        const castIndex = result.state.animations.indexOf(cast!)
        const firstDamage = result.state.animations.findIndex((event) => event.type === 'damage')
        if (firstDamage >= 0) expect(castIndex).toBeLessThan(firstDamage)
        if (target?.kind === 'piece') expect(cast?.targetCardId).toBe(victim.id)
        checked += 1
        break
      }
    }
    expect(checked).toBeGreaterThan(0)
  })

  it('una estructura se presenta y una unidad no', () => {
    const structure = factionCards('structure')[0]
    const unit = factionCards('unit')[0]!
    const place = (cardId: string) => {
      const base = richPlayer(freshMatch(), 'player', [cardId])
      const result = applyAction(base, { type: 'play-card', playerId: 'player', cardInstanceId: 'hand-0', position: { x: 3, y: 7 } })
      expect(result.ok).toBe(true)
      return result.state.animations
    }
    expect(place(unit.id).some((event) => event.cast)).toBe(false)
    if (structure) {
      expect(place(structure.id).find((event) => event.cast)?.cast).toEqual({ kind: 'structure', sourceId: structure.id })
    }
  })

  it('el poder de comandante se presenta con el id del comandante', () => {
    const base = richPlayer(freshMatch(), 'player', [])
    const commanderId = base.players.player.commanderId
    const power = COMMANDER_BY_ID[commanderId]!.power
    const victim = CARDS.find((card) => card.type === 'unit' && card.faction === STARTER_DECKS[1]!.faction)!
    const withTarget = { ...base, board: [enemyUnit(victim.id)] }
    const result = applyAction(withTarget, {
      type: 'commander-power', playerId: 'player',
      target: power.needsEnemyTarget ? { kind: 'piece', pieceId: 'diana' } : undefined,
    })
    expect(result.ok).toBe(true)
    expect(result.state.animations.find((event) => event.cast)?.cast).toEqual({ kind: 'power', sourceId: commanderId })
  })
})

describe('presentación de la carta lanzada', () => {
  const match = freshMatch()
  const spell = CARDS.find((card) => card.type === 'instant' && card.rarity !== 'mythic' && card.rules.length < 130)!
  const castEvent: AnimationEvent = {
    id: 'event-1', type: 'spell', actorId: 'ai', targetId: 'player-nexus', cardId: spell.id,
    cast: { kind: 'spell', sourceId: spell.id }, durationMs: 420,
  }

  it('en cinemático una carta breve dura 3,2 s y una Chispa conserva 5 s', () => {
    const rival = spotlightFor(castEvent, match, 'player', { pace: 'cinematic' })!
    const own = spotlightFor({ ...castEvent, actorId: 'player' }, match, 'player', { pace: 'cinematic' })!
    expect(rival.card.id).toBe(spell.id)
    expect(rival.durationMs).toBe(3200)
    expect(own.durationMs).toBe(3200)
    expect(spotlightFor({ ...castEvent, sparkFace: 'cruz' }, match, 'player', { pace: 'cinematic' })?.durationMs).toBe(5000)
    expect(rival.target?.label).toBe('tu Nexo')
  })

  it('en ritmo rápido solo se presentan las cartas del rival', () => {
    expect(spotlightFor({ ...castEvent, actorId: 'player' }, match, 'player', { pace: 'fast' })).toBeUndefined()
    expect(spotlightFor(castEvent, match, 'player', { pace: 'fast' })).toBeDefined()
  })

  it('ignora los «spell» secundarios y los lanzados por una pieza', () => {
    expect(spotlightFor({ ...castEvent, cast: undefined }, match, 'player', { pace: 'cinematic' })).toBeUndefined()
    expect(spotlightFor({ ...castEvent, actorId: 'pieza-7' }, match, 'player', { pace: 'cinematic' })).toBeUndefined()
  })

  it('un poder sin objetivo no se anuncia como ataque al propio Nexo', () => {
    const commanderId = match.players.ai.commanderId
    const shown = spotlightFor({ ...castEvent, cardId: undefined, cast: { kind: 'power', sourceId: commanderId }, targetId: 'ai-nexus' }, match, 'player', { pace: 'normal' })!
    expect(shown.card.name).toBe(COMMANDER_BY_ID[commanderId]!.power.name)
    expect(shown.card.art).toEqual(COMMANDER_BY_ID[commanderId]!.art)
    expect(shown.target).toBeUndefined()
    expect(spotlightHeading(shown, 'player')).toBe('El rival usa su poder de comandante')
  })

  it('la velocidad de animación acorta sin bajar del tiempo de leer un nombre', () => {
    const fast = spotlightFor(castEvent, match, 'player', { pace: 'normal', animationSpeed: 2 })!
    expect(fast.durationMs).toBeGreaterThanOrEqual(800)
  })
})

describe('ritmo de los golpes', () => {
  const attack: AnimationEvent = { id: 'a', type: 'attack', durationMs: 400 }
  it('el ritmo cinemático estira el combate y no la contabilidad', () => {
    const prefs = { animationSpeed: 1, reducedMotion: false }
    expect(eventDuration(attack, { ...prefs, presentationPace: 'cinematic' })).toBeGreaterThan(eventDuration(attack, prefs))
    const draw = { ...attack, type: 'draw' as const }
    expect(eventDuration(draw, { ...prefs, presentationPace: 'cinematic' })).toBe(eventDuration(draw, prefs))
  })
  it('movimiento reducido manda sobre el ritmo', () => {
    expect(eventDuration(attack, { animationSpeed: 1, reducedMotion: true, presentationPace: 'cinematic' })).toBe(40)
  })
})

describe('rótulo de combate', () => {
  const unit = CARDS.find((card) => card.type === 'unit')!
  const attack: AnimationEvent = {
    id: 'event-9', type: 'attack', actorId: 'atacante', targetId: 'defensor', cardId: unit.id, targetCardId: unit.id, durationMs: 380,
  }

  it('suma el daño y el contragolpe al mismo intercambio', () => {
    let exchange = openExchange(attack, 'ai')!
    expect(exchange.defender.owner).toBe('player')
    exchange = foldExchange(exchange, { id: 'e2', type: 'damage', targetId: 'defensor', amount: 3, durationMs: 300 })
    exchange = foldExchange(exchange, { id: 'e3', type: 'damage', targetId: 'atacante', amount: 1, durationMs: 300 })
    exchange = foldExchange(exchange, { id: 'e4', type: 'destroy', targetId: 'defensor', durationMs: 420 })
    expect(exchange.defender).toMatchObject({ damage: 3, destroyed: true })
    expect(exchange.attacker).toMatchObject({ damage: 1, destroyed: false })
  })

  it('empieza presentando las cartas y pasa al golpe cuando se reproduce', () => {
    const exchange = openExchange(attack, 'ai')!
    expect(exchange.phase).toBe('intro')
    expect(clashExchange(exchange).phase).toBe('clash')
    expect(duelIntroDuration('cinematic')).toBeGreaterThan(duelIntroDuration('normal'))
    expect(duelIntroDuration('fast')).toBe(0)
  })

  it('el escudo que absorbe el golpe se enciende en el defensor', () => {
    const shielded: BoardPiece = { ...enemyUnit(unit.id), instanceId: 'defensor', statuses: [{ kind: 'shielded', amount: 2 }] }
    let exchange = openExchange(attack, 'ai', [shielded])!
    expect(combatTraits(exchange.defender, 'defender').find((trait) => trait.id === 'shield')?.active).toBe(false)
    exchange = foldExchange(exchange, { id: 's', type: 'shield', targetId: 'defensor', amount: 2, effectId: 'commander-order-shield', durationMs: 260 })
    const shield = combatTraits(exchange.defender, 'defender').find((trait) => trait.id === 'shield')!
    expect(shield).toMatchObject({ active: true, label: 'Escudo 2' })
  })

  it('conserva la Vida de apertura y distingue escudo concedido, absorción y contraataque real', () => {
    let exchange = openExchange({ ...attack, openingHealth: { attacker: 4, defender: 5 } }, 'ai')!
    const shield: AnimationEvent = { id: 'escudo', type: 'shield', targetId: 'defensor', amount: 2, durationMs: 260 }
    expect(foldExchange(exchange, { ...shield, effectId: 'commander-order-aura' })).toBe(exchange)
    exchange = foldExchange(exchange, { ...shield, effectId: 'commander-order-shield' })
    expect(exchange.defender).toMatchObject({ absorbed: 2, health: { before: 5, after: 5 } })
    exchange = foldExchange(exchange, { id: 'golpe', type: 'damage', targetId: 'defensor', amount: 2, pieceHealth: { before: 5, after: 3 }, durationMs: 300 })
    exchange = foldExchange(exchange, { id: 'vuelta', type: 'damage', targetId: 'atacante', amount: 4, retaliation: true, pieceHealth: { before: 4, after: 0 }, durationMs: 300 })
    exchange = foldExchange(exchange, { id: 'renacer', type: 'destroy', targetId: 'atacante', renacerBonus: 2, durationMs: 420 })
    expect(exchange.defender).toMatchObject({ damage: 2, health: { before: 5, after: 3 } })
    expect(exchange.attacker).toMatchObject({ countered: true, health: { before: 4, after: 0 }, destroyed: true, renacer: 2 })
  })

  it('Perforar y Vínculo vital se encienden cuando actúan', () => {
    const piercer = CARDS.find((card) => card.type === 'unit' && card.keywords.includes('pierce'))
    const linker = CARDS.find((card) => card.type === 'unit' && card.keywords.includes('lifelink'))
    if (piercer) {
      let exchange = openExchange({ ...attack, cardId: piercer.id }, 'ai')!
      expect(combatTraits(exchange.attacker, 'attacker').find((trait) => trait.id === 'pierce')?.active).toBe(false)
      exchange = foldExchange(exchange, { id: 'n', type: 'nexus-damage', actorId: 'atacante', targetId: 'player-nexus', amount: 2, durationMs: 1 })
      expect(combatTraits(exchange.attacker, 'attacker').find((trait) => trait.id === 'pierce')?.active).toBe(true)
    }
    if (linker) {
      let exchange = openExchange({ ...attack, cardId: linker.id }, 'ai')!
      exchange = foldExchange(exchange, { id: 'h', type: 'damage', targetId: 'defensor', amount: 3, durationMs: 1 })
      expect(combatTraits(exchange.attacker, 'attacker').find((trait) => trait.id === 'lifelink')?.active).toBe(false)
      exchange = foldExchange(exchange, { id: 'cura', type: 'spell', actorId: 'ai', cardId: linker.id, effectId: 'vinculo-vital', amount: 2, durationMs: 180 })
      expect(combatTraits(exchange.attacker, 'attacker').find((trait) => trait.id === 'lifelink')?.active).toBe(true)
    }
    expect(piercer ?? linker).toBeDefined()
  })

  it('un evento ajeno no crea un objeto nuevo', () => {
    const exchange = openExchange(attack, 'ai')!
    expect(foldExchange(exchange, { id: 'x', type: 'draw', durationMs: 100 })).toBe(exchange)
  })

  it('un ataque al Nexo lo nombra como tal', () => {
    const exchange = openExchange({ ...attack, targetId: 'player-nexus', targetCardId: undefined }, 'ai')!
    expect(exchange.defender).toMatchObject({ name: 'Nexo', nexus: true, owner: 'player' })
  })

  it('otro ataque o una carta lanzada cierran el intercambio', () => {
    expect(endsExchange(attack)).toBe(true)
    expect(endsExchange({ id: 'c', type: 'spell', cast: { kind: 'spell', sourceId: 'x' }, durationMs: 1 })).toBe(true)
    expect(endsExchange({ id: 'd', type: 'damage', durationMs: 1 })).toBe(false)
  })
})

describe('historial de jugadas', () => {
  const unit = CARDS.find((card) => card.type === 'unit')!
  const piece = { ...enemyUnit(unit.id), instanceId: 'nueva' }

  it('registra cartas lanzadas, invocaciones y ataques con su dueño', () => {
    const spell = recentPlayFor({ id: 'a', type: 'spell', actorId: 'ai', cast: { kind: 'spell', sourceId: 'x' }, targetCardId: unit.id, durationMs: 1 }, [])
    expect(spell).toMatchObject({ kind: 'spell', owner: 'ai', cardId: 'x', targetCardId: unit.id })
    expect(recentPlayFor({ id: 'b', type: 'summon', targetId: 'nueva', durationMs: 1 }, [piece])).toMatchObject({ kind: 'summon', owner: 'ai', cardId: unit.id })
    expect(recentPlayFor({ id: 'c', type: 'attack', actorId: 'nueva', cardId: unit.id, targetId: 'player-nexus', durationMs: 1 }, [piece])).toMatchObject({ kind: 'attack', targetLabel: 'Nexo' })
  })

  it('una misma invocación no aparece dos veces', () => {
    const first = recentPlayFor({ id: 'f', type: 'summon', targetId: 'nueva', durationMs: 1 }, [piece])!
    const second = recentPlayFor({ id: 'g', type: 'summon', targetId: 'nueva', effectId: 'otro-sello', durationMs: 1 }, [piece])!
    expect(pushRecentPlay(pushRecentPlay([], first), second)).toHaveLength(1)
  })

  it('ignora consecuencias y auras de comandante', () => {
    expect(recentPlayFor({ id: 'd', type: 'damage', targetId: 'nueva', amount: 2, durationMs: 1 }, [piece])).toBeUndefined()
    expect(recentPlayFor({ id: 'e', type: 'summon', targetId: 'nueva', effectId: 'commander-void-aura', durationMs: 1 }, [piece])).toBeUndefined()
  })
})
