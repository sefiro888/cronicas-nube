import { writeFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { eventDuration } from './eventTiming'
import { AI_GAP_SCALE, duelIntroDuration, isFinisher, openExchange, PRESENTATION_PACES, spotlightFor } from './presentation'
import { applyAction, CARD_BY_ID, chooseBaselineAiAction, chooseNextAiAction, createMatch, STARTER_DECKS, type BoardPiece, type FactionId, type MatchState, type PlayerId } from '../game'

const deck = (faction: FactionId) => STARTER_DECKS.find((item) => item.faction === faction)!
const seeds = [13, 42, 712, 1987]
const seats = ['player', 'ai'] as const
const pairs = [['samsara', 'goblins'], ['tercios', 'samsara'], ['marea', 'fury'], ['duna', 'order']] as const
const summary = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b)
  const quantile = (q: number) => +((sorted[Math.max(0, Math.ceil(q * sorted.length) - 1)] ?? 0).toFixed(2))
  return { n: sorted.length, p50: quantile(.5), p95: quantile(.95), p99: quantile(.99), max: quantile(1) }
}

function battle(faction: FactionId, rival: FactionId, seat: PlayerId, seed: number, tactical: boolean) {
  let state = createMatch(deck(seat === 'player' ? faction : rival), deck(seat === 'ai' ? faction : rival), seed)
  let skips = new Set<string>()
  let rejected = 0
  const wait = PRESENTATION_PACES.map((pace) => ({ pace, events: 0, spells: 0, duels: 0, rivalGap: 0 }))
  for (let step = 0; step < 1800 && state.turn <= 150 && !state.winner; step++) {
    const active = state.activePlayer
    const action = tactical ? chooseNextAiAction(state, skips, 'normal', active, { maxSimulations: 54 }) : chooseBaselineAiAction(state, skips, 'normal', active)
    let result = applyAction(state, action)
    if (!result.ok) {
      rejected++
      if (action.type === 'play-card' || action.type === 'play-resource') { skips.add(action.cardInstanceId); continue }
      result = applyAction(state, { type: 'end-turn', playerId: active })
      if (!result.ok) break
    }
    const events = result.state.animations
    for (const profile of wait) {
      if (active === 'ai') profile.rivalGap += Math.max(140, 520 * AI_GAP_SCALE[profile.pace] / 3)
      events.forEach((event, index) => {
        profile.events += eventDuration(event, { animationSpeed: 1, reducedMotion: false, presentationPace: profile.pace })
        const spot = spotlightFor(event, result.state, 'player', { pace: profile.pace })
        if (spot) profile.spells += spot.durationMs
        if (event.type === 'attack' && openExchange(event, active, result.state.board)) {
          profile.duels += duelIntroDuration(profile.pace) * (isFinisher(event, events.slice(index), result.state) ? 1.35 : 1)
        }
      })
    }
    if (result.state.activePlayer !== active) skips = new Set()
    state = { ...result.state, animations: [] }
  }
  return { winner: state.winner === seat ? faction : state.winner ? rival : null, turns: state.turn, rejected, wait }
}

function dense(faction: FactionId, seed: number, occupied: number): MatchState {
  const base = createMatch(deck('samsara'), deck(faction), seed)
  const cardsFor = (owner: PlayerId) => Object.values(CARD_BY_ID).filter((card) => card.type === 'unit' && card.faction === (owner === 'ai' ? faction : 'samsara'))
  const own = cardsFor('ai')
  const other = cardsFor('player')
  const board = Array.from({ length: occupied }, (_, index): BoardPiece => {
    const cell = (index * 13 + seed) % 64
    const owner = cell < 32 ? 'ai' : 'player'
    const choices = owner === 'ai' ? own : other
    const card = choices[(index + seed) % choices.length]!
    return { instanceId: `pieza-${index}`, cardId: card.id, owner, position: { x: cell % 8, y: Math.floor(cell / 8) },
      currentHealth: card.health!, attackModifier: 0, movedThisTurn: false, attackedThisTurn: false, enteredOnTurn: 3, statuses: [] }
  })
  return { ...base, activePlayer: 'ai', phase: 'main', turn: 10, terrain: [], animations: [], board,
    players: { ...base.players, ai: { ...base.players.ai, resourcePlayedThisTurn: true,
      hand: faction === 'duna' ? [{ instanceId: 'plegaria', cardId: 'plegaria-al-sol' }] : [],
      resources: faction === 'duna' ? Array.from({ length: 6 }, (_, index) => ({
        instanceId: `fuente-${index}`, cardId: 'fuente-duna', faction: 'duna' as const, exhausted: false,
      })) : [],
      commanderPowerUsed: true } } }
}

it.skipIf(process.env.RUN_BATTLE_AUDIT !== '1')('mide ritmo, IA con mesa llena y enfrentamientos con salida alternada', () => {
  const matches = pairs.flatMap(([faction, rival]) => seeds.flatMap((seed) => seats.map((seat) => ({
    faction, rival, seat, seed, baseline: battle(faction, rival, seat, seed, false), tactical: battle(faction, rival, seat, seed, true),
  }))))
  const timings = (['tercios', 'marea', 'duna', 'goblins', 'samsara'] as const).flatMap((faction) => [32, 48, 56].map((occupied) => {
    const baseline: number[] = [], tactical: number[] = []
    let invalid = 0
    const actions: Record<string, number> = {}
    for (let index = 0; index < 20; index++) {
      const state = dense(faction, seeds[index % seeds.length]! + index, occupied)
      for (const [samples, pick] of [[baseline, chooseBaselineAiAction], [tactical, chooseNextAiAction]] as const) {
        const start = performance.now()
        const action = pick(state)
        samples.push(performance.now() - start)
        if (samples === tactical) actions[action.type] = (actions[action.type] ?? 0) + 1
        if (!applyAction(state, action).ok) invalid++
      }
    }
    return { faction, occupied, baseline: summary(baseline), tactical: summary(tactical), invalid, actions }
  }))
  const report = {
    matches: matches.map(({ baseline, tactical, ...match }) => ({ ...match,
      baseline: { winner: baseline.winner, turns: baseline.turns, rejected: baseline.rejected },
      tactical: { winner: tactical.winner, turns: tactical.turns, rejected: tactical.rejected } })),
    pace: PRESENTATION_PACES.map((pace) => {
      const budgets = matches.flatMap(({ tactical }) => tactical.winner ? tactical.wait.filter((profile) => profile.pace === pace) : [])
      return { pace, totalSeconds: summary(budgets.map(({ events, spells, duels, rivalGap }) => (events + spells + duels + rivalGap) / 1000)),
        animationsSeconds: summary(budgets.map(({ events }) => events / 1000)), spotlightSeconds: summary(budgets.map(({ spells }) => spells / 1000)),
        duelsSeconds: summary(budgets.map(({ duels }) => duels / 1000)), rivalGapSeconds: summary(budgets.map(({ rivalGap }) => rivalGap / 1000)) }
    }),
    timings,
  }
  writeFileSync(process.env.BATTLE_AUDIT_OUT ?? '.git-battle-audit.json', JSON.stringify(report, null, 2), 'utf8')
  expect(timings.every(({ invalid }) => invalid === 0)).toBe(true)
  expect(matches.filter(({ tactical }) => tactical.winner).length).toBeGreaterThan(24)
}, 180_000)
