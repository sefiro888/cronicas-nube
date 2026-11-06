import { writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { chooseBaselineAiAction, chooseNextAiAction } from './ai'
import { BATTLE_TACTICAL_BUDGET } from './aiTactics'
import { STARTER_DECKS } from './decks'
import { applyAction, createMatch } from './engine'
import type { FactionId, MatchState, PlayerId } from './types'

const seats = ['player', 'ai'] as const
const treatments = ['tercios', 'marea', 'duna', 'goblins'] as const
const opponents = ['samsara', 'fury', 'arcane', 'order', 'marea', 'goblins'] as const
const deck = (faction: FactionId) => STARTER_DECKS.find((entry) => entry.faction === faction)!

type Outcome = 'victory' | 'defeat' | 'limit'

function play(
  faction: FactionId, rival: FactionId, seat: PlayerId, seed: number, tactical: boolean, timings: number[],
  suppressSamsaraDeathDraw = false,
) {
  let state: MatchState = createMatch(deck(seat === 'player' ? faction : rival), deck(seat === 'ai' ? faction : rival), seed)
  let skipped = new Set<string>()
  let rejected = 0
  const rejectionCodes: Record<string, number> = {}
  for (let step = 0; step < 2400 && state.turn <= 200 && !state.winner; step += 1) {
    // Ensayo diagnóstico: marcar la pasiva como usada equivale a retirarla
    // solo en esta simulación. Las cartas, Renacer y el motor siguen iguales.
    if (suppressSamsaraDeathDraw && !state.players[seat].firstUnitDeathDrawUsedThisTurn) {
      state = { ...state, players: { ...state.players, [seat]: { ...state.players[seat], firstUnitDeathDrawUsedThisTurn: true } } }
    }
    const active = state.activePlayer
    const upgraded = tactical && active === seat
    const start = upgraded ? performance.now() : 0
    const action = upgraded
      ? chooseNextAiAction(state, skipped, 'normal', active, { maxSimulations: BATTLE_TACTICAL_BUDGET.maxSimulations })
      : chooseBaselineAiAction(state, skipped, 'normal', active)
    if (upgraded) timings.push(performance.now() - start)
    let result = applyAction(state, action)
    if (!result.ok) {
      rejected += 1
      const key = `${action.type}/${result.error?.code ?? 'desconocido'}`
      rejectionCodes[key] = (rejectionCodes[key] ?? 0) + 1
      if (action.type === 'play-card' || action.type === 'play-resource') {
        skipped.add(action.cardInstanceId)
        continue
      }
      result = applyAction(state, { type: 'end-turn', playerId: active })
      if (!result.ok) break
    }
    if (result.state.activePlayer !== active) skipped = new Set()
    state = { ...result.state, animations: [] }
  }
  const outcome: Outcome = state.winner === seat ? 'victory' : state.winner ? 'defeat' : 'limit'
  return { outcome, turns: state.turn, rejected, rejectionCodes }
}

describe.skipIf(process.env.RUN_TACTICAL_AB !== '1')('comparación emparejada de IA', () => {
  it('mantiene mazo, semilla, asiento y rival al cambiar la IA', () => {
    const count = Number(process.env.TACTICAL_AB_SEEDS ?? 4)
    const timings: number[] = []
    const rows: { faction: FactionId; rival: FactionId; seat: PlayerId; seed: number; baseline: ReturnType<typeof play>; tactical: ReturnType<typeof play> }[] = []
    for (const faction of treatments) for (const rival of opponents) {
      if (faction === rival) continue
      for (const seat of seats) for (let index = 0; index < count; index += 1) {
        const seed = (0x9e3779b9 + index * 0x85ebca6b) >>> 0
        rows.push({ faction, rival, seat, seed,
          baseline: play(faction, rival, seat, seed, false, timings),
          tactical: play(faction, rival, seat, seed, true, timings),
        })
      }
    }
    timings.sort((a, b) => a - b)
    const time = (percentile: number) => Number((timings[Math.floor((timings.length - 1) * percentile)] ?? 0).toFixed(2))
    const summary = treatments.map((faction) => {
      const selected = rows.filter((row) => row.faction === faction)
      return { faction, pairs: selected.length,
        baselineWins: selected.filter(({ baseline }) => baseline.outcome === 'victory').length,
        tacticalWins: selected.filter(({ tactical }) => tactical.outcome === 'victory').length,
        baselineLimits: selected.filter(({ baseline }) => baseline.outcome === 'limit').length,
        tacticalLimits: selected.filter(({ tactical }) => tactical.outcome === 'limit').length,
        baselineRejected: selected.reduce((total, { baseline }) => total + baseline.rejected, 0),
        tacticalRejected: selected.reduce((total, { tactical }) => total + tactical.rejected, 0),
      }
    })
    const isolation = []
    for (const rival of ['fury', 'arcane', 'order', 'goblins'] as const) {
      let controlWins = 0
      let trialWins = 0
      let limits = 0
      for (const seat of seats) for (let index = 0; index < count; index += 1) {
        const seed = (0x9e3779b9 + index * 0x85ebca6b) >>> 0
        const control = play('samsara', rival, seat, seed, false, [])
        const trial = play('samsara', rival, seat, seed, false, [], true)
        if (control.outcome === 'victory') controlWins += 1
        if (trial.outcome === 'victory') trialWins += 1
        if (control.outcome === 'limit' || trial.outcome === 'limit') limits += 1
      }
      isolation.push({ rival, pairs: count * seats.length, controlWins, trialWins, limits })
    }
    const report = { summary, isolation, timings: { actions: timings.length, p50: time(.5), p95: time(.95), p99: time(.99), max: time(1) } }
    console.info(JSON.stringify(report, null, 2))
    if (process.env.TACTICAL_AB_OUT) writeFileSync(process.env.TACTICAL_AB_OUT, JSON.stringify({ ...report, rows }, null, 2))
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.filter((row) => row.tactical.outcome === 'limit').length).toBeLessThan(rows.length * .2)
  }, 600_000)
})
