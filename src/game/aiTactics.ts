import { distanceToEnemyNexusRow } from './board'
import { CARD_BY_ID } from './cards'
import { canPayOffering, isUnderJudgement, offeringOf } from './duna'
import {
  applyAction, canPlayHandCard, getValidAttacks, getValidDeploymentPositions, getValidMoves,
  previewAttackNexus, spellNeedsPiece, validSpellTargets,
} from './engine'
import { formationAttackBonus } from './tercios'
import type { FactionId, GameAction, MatchState, PlayerId } from './types'

export interface TacticalBudget {
  readonly maxSimulations: number
  readonly maxMs?: number
}

export const BATTLE_TACTICAL_BUDGET: TacticalBudget = { maxSimulations: 54, maxMs: 28 }
const WIDTH = 3
const DEPTH = 3

const opponent = (seat: PlayerId): PlayerId => seat === 'player' ? 'ai' : 'player'
const isMove = (action: GameAction): action is Extract<GameAction, { type: 'move' }> => action.type === 'move'
const isCard = (action: GameAction): action is Extract<GameAction, { type: 'play-card' }> => action.type === 'play-card'

/** Valora material y posición sin leer cartas ni semillas del rival. */
export const tacticalValue = (state: MatchState, me: PlayerId): number => {
  if (state.winner) return state.winner === me ? 100_000 : -100_000
  const rival = opponent(me)
  const own = state.players[me]
  const enemy = state.players[rival]
  let value = own.nexusHealth * 1.55 - enemy.nexusHealth * 1.35
    + (own.hand.length - enemy.hand.length) * 1.9
    + (own.resources.length - enemy.resources.length) * 2.2
  for (const piece of state.board) {
    const card = CARD_BY_ID[piece.cardId]
    if (!card) continue
    const distance = distanceToEnemyNexusRow(piece.owner, piece.position.y)
    const blast = piece.grantedPetardazo || card.effects.some((effect) => effect.kind === 'passive' && effect.id === 'petardazo')
    const silenced = piece.statuses.some((status) => status.kind === 'silenced')
    const blastValue = blast && !silenced ? state.board.filter((target) => target.owner !== piece.owner
      && Math.abs(target.position.x - piece.position.x) + Math.abs(target.position.y - piece.position.y) === 1).length * 1.6 : 0
    const shield = piece.statuses.find((status) => status.kind === 'shielded')?.amount ?? 0
    const material = 3 + (card.attack ?? 0) * 1.6 + piece.attackModifier + piece.currentHealth * 1.15
      + formationAttackBonus(state, piece) * 1.25 + blastValue + shield * .6
      + (!silenced && card.keywords.includes('guard') ? 1.5 : 0)
    const position = card.type === 'unit' ? (7 - distance) * .28 : 0
    const control = piece.statuses.some((status) => status.kind === 'frozen' || status.kind === 'stunned') ? 1.5 : 0
    value += (piece.owner === me ? 1 : -1) * (material + position - control)
  }
  return value
}

const canPlanCard = (cardId: string, faction: FactionId): boolean => {
  const card = CARD_BY_ID[cardId]
  if (!card || card.effects.some((effect) => effect.kind === 'spark')) return false
  if (faction === 'duna') return offeringOf(card) !== undefined || card.effects.some((effect) => effect.kind === 'judgement')
  if (faction === 'marea') return card.effects.some((effect) => effect.kind === 'push-target' || effect.kind === 'push-all-enemies')
  if (faction === 'tercios') return card.type !== 'instant'
  return faction === 'goblins' && card.effects.some((effect) => effect.kind === 'passive' && effect.id.includes('petardazo'))
}

const candidates = (state: MatchState, me: PlayerId, faction: FactionId, skipped: ReadonlySet<string>, fallback?: GameAction): GameAction[] => {
  const spells: GameAction[] = []
  const deploys: GameAction[] = []
  const attacks: GameAction[] = []
  const moveGroups: GameAction[][] = []
  const pieces = state.board.filter((piece) => piece.owner === me).sort((a, b) => a.instanceId.localeCompare(b.instanceId))
  for (const instance of state.players[me].hand) {
    if (skipped.has(instance.instanceId) || !canPlanCard(instance.cardId, faction)) continue
    const card = CARD_BY_ID[instance.cardId]!
    if (!canPlayHandCard(state, me, card, instance)) continue
    const offering = offeringOf(card)
    const variants = offering !== undefined && canPayOffering(state, me, offering) ? [false, true] : [false]
    for (const paid of variants) {
      const action: Extract<GameAction, { type: 'play-card' }> = { type: 'play-card', playerId: me, cardInstanceId: instance.instanceId, ...(paid ? { offering: true } : {}) }
      if (card.type === 'instant') {
        const targets = spellNeedsPiece(card) ? validSpellTargets(state, me, card) : []
        if (!spellNeedsPiece(card)) spells.push({ ...action, target: { kind: 'none' as const } })
        for (const target of targets) spells.push({ ...action, target: { kind: 'piece' as const, pieceId: target.instanceId } })
      } else {
        for (const position of getValidDeploymentPositions(state, me).slice(0, 6)) deploys.push({ ...action, position })
      }
    }
  }
  for (const piece of pieces) {
    const valid = getValidAttacks(state, piece.instanceId)
    if (valid.canAttackNexus) attacks.unshift({ type: 'attack-nexus', playerId: me, attackerId: piece.instanceId })
    for (const defenderId of valid.pieceIds) attacks.push({ type: 'attack-piece', playerId: me, attackerId: piece.instanceId, defenderId })
    const destinations = [...getValidMoves(state, piece.instanceId)].sort((a, b) =>
      distanceToEnemyNexusRow(me, a.y) - distanceToEnemyNexusRow(me, b.y) || a.x - b.x)
    moveGroups.push(destinations.slice(0, 5).map((to) => ({ type: 'move', playerId: me, pieceId: piece.instanceId, to })))
  }
  const moves = Array.from({ length: 5 }, (_, index) => moveGroups.flatMap((group) => group[index] ?? [])).flat()
  const unique = new Map<string, GameAction>()
  // Reparte el presupuesto entre clases: una mesa llena de ataques no puede
  // impedir que se pruebe un movimiento de apoyo o un empuje.
  for (const group of [spells.slice(0, 10), attacks.slice(0, 7), moves.slice(0, 9), deploys.slice(0, 5)]) {
    for (const action of group) unique.set(JSON.stringify(action), action)
  }
  if (fallback && fallback.type !== 'end-turn') unique.set(JSON.stringify(fallback), fallback)
  return [...unique.values()]
}

interface Node {
  readonly state: MatchState
  readonly first: GameAction
  readonly score: number
}

/** Devuelve solo la primera acción. La siguiente consulta parte del estado real. */
export const planTacticalAction = (
  state: MatchState, me: PlayerId, faction: FactionId, skipped: ReadonlySet<string>,
  fallback: GameAction, budget: TacticalBudget,
): GameAction => {
  const start = budget.maxMs === undefined ? 0 : performance.now()
  let remaining = budget.maxSimulations
  const exhausted = () => remaining <= 0 || (budget.maxMs !== undefined && performance.now() - start >= budget.maxMs)
  const simulate = (from: MatchState, action: GameAction) => {
    if (exhausted()) return undefined
    remaining -= 1
    const result = applyAction(from, action)
    return result.ok ? { ...result.state, animations: [] } : undefined
  }

  // Amenazas de tablero tras el cierre real. Los golpes directos son legales
  // desde esa posición. Para aproximaciones se valora el mejor avance de una
  // sola pieza, sin sumar movimientos que podrían disputarse la misma casilla.
  const danger = (from: MatchState): number => {
    const next = simulate(from, { type: 'end-turn', playerId: me })
    if (!next) return 0
    if (next.winner) return next.winner === me ? -100_000 : 100_000
    let direct = 0
    let approach = 0
    const enemy = opponent(me)
    for (const piece of next.board) {
      if (piece.owner !== enemy || CARD_BY_ID[piece.cardId]?.type !== 'unit') continue
      if (getValidAttacks(next, piece.instanceId).canAttackNexus) {
        direct += previewAttackNexus(next, piece.instanceId)?.damage ?? 0
        continue
      }
      if (distanceToEnemyNexusRow(enemy, piece.position.y) > (CARD_BY_ID[piece.cardId]?.movement ?? 0) + (CARD_BY_ID[piece.cardId]?.range ?? 1)) continue
      const moves = getValidMoves(next, piece.instanceId)
      for (const to of moves.slice(0, 5)) {
        const moved = simulate(next, { type: 'move', playerId: enemy, pieceId: piece.instanceId, to })
        if (moved && getValidAttacks(moved, piece.instanceId).canAttackNexus) {
          approach = Math.max(approach, previewAttackNexus(moved, piece.instanceId)?.damage ?? 0)
        }
      }
    }
    const total = direct + approach
    return total * 1.2 + (total >= next.players[me].nexusHealth ? 350 : 0)
  }

  // Una Ofrenda puede valer por la carta siguiente. Solo se exploran
  // cartas que ya estaban en la mano antes de la primera jugada.
  if (faction === 'duna' && isCard(fallback)) {
    const known = new Set(state.players[me].hand.map((card) => card.instanceId))
    const cardFor = (action: Extract<GameAction, { type: 'play-card' }>) =>
      CARD_BY_ID[state.players[me].hand.find((item) => item.instanceId === action.cardInstanceId)?.cardId ?? '']
    const card = cardFor(fallback)
    const cost = card && offeringOf(card)
    const paidOptions = !isUnderJudgement(state, me) ? candidates(state, me, faction, skipped)
      .filter(isCard).filter((action) => action.offering).slice(0, 5) : []
    const options = cost !== undefined && canPayOffering(state, me, cost)
      ? [{ ...fallback, offering: false }, { ...fallback, offering: true }, ...paidOptions]
      : [fallback, ...paidOptions]
    const unique = new Map(options.map((action) => [JSON.stringify(action), action]))
    let best: { action: GameAction; value: number } | undefined
    for (const action of unique.values()) {
      const resolved = simulate(state, action)
      if (!resolved) continue
      let score = tacticalValue(resolved, me) - danger(resolved)
      if (exhausted()) break
      if (!resolved.winner && !resolved.pendingDecisions?.length && isUnderJudgement(resolved, me)) {
        const continuations = candidates(resolved, me, faction, skipped)
          .filter(isCard).filter((next) => known.has(next.cardInstanceId)
            && cardFor(next)?.effects.some((effect) => effect.kind === 'judgement'))
          .slice(0, 4)
        for (const continuation of continuations) {
          const follow = simulate(resolved, continuation)
          if (!follow) continue
          const followScore = tacticalValue(follow, me) - danger(follow) - .12
          if (exhausted()) break
          score = Math.max(score, followScore)
        }
      }
      if (!best || score > best.value) best = { action, value: score }
    }
    return best?.action ?? fallback
  }

  const base = { ...state, animations: [] }
  const baseScore = tacticalValue(base, me)
  let best: Node | undefined
  let bestScore = baseScore - .01
  let frontier: readonly { state: MatchState; first?: GameAction }[] = [{ state: base }]
  for (let depth = 0; depth < DEPTH && frontier.length && !exhausted(); depth += 1) {
    const next: Node[] = []
    // Deja simulaciones para la segunda y la tercera acción.
    const levelLimit = Math.max(0, remaining - (DEPTH - depth - 1) * 8)
    const levelStart = remaining
    for (const node of frontier) {
      for (const action of candidates(node.state, me, faction, skipped, node.first ? undefined : fallback)) {
        if (levelStart - remaining >= levelLimit || exhausted()) break
        const resolved = simulate(node.state, action)
        if (!resolved || resolved.combatRandomState !== node.state.combatRandomState) continue
        const first = node.first ?? action
        if (resolved.winner === me) return first
        const played = isCard(action) ? CARD_BY_ID[node.state.players[me].hand.find((item) => item.instanceId === action.cardInstanceId)?.cardId ?? ''] : undefined
        // Detenerse antes de usar información de cartas robadas, decisiones
        // pendientes o tiradas todavía sin revelar.
        const hiddenChange = Boolean(resolved.pendingSpark || resolved.pendingDecisions?.length
          || resolved.players[me].deck !== node.state.players[me].deck
          || (played && played.effects.some((effect) => effect.kind === 'spark')))
        if (resolved.pendingSpark) continue
        const score = tacticalValue(resolved, me) - (depth + 1) * .12
        if (score > bestScore) {
          best = { state: resolved, first, score }
          bestScore = score
        }
        if (!hiddenChange && !resolved.winner) next.push({ state: resolved, first, score })
      }
    }
    next.sort((a, b) => b.score - a.score)
    const distinct = [...new Map(next.slice().reverse().map((node) => [JSON.stringify(node.first), node])).values()]
      .sort((a, b) => b.score - a.score)
    const setup = distinct.find((node) => isCard(node.first))
    frontier = setup ? [setup, ...distinct.filter((node) => node !== setup).slice(0, WIDTH - 1)] : distinct.slice(0, WIDTH)
  }
  if (best) return best.first
  if (faction === 'tercios' && isMove(fallback)) {
    const result = simulate(base, fallback)
    if (result && base.board.some((piece) => piece.owner === me && !result.board.some((after) => after.instanceId === piece.instanceId))) {
      return { type: 'end-turn', playerId: me }
    }
  }
  return fallback
}
