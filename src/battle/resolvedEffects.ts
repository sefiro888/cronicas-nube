import { CARD_BY_ID, COMMANDER_BY_ID, type AnimationEvent, type MatchState } from '../game'

export type ProtectionEffect = 'absorb' | 'grant' | 'vitality'
export const protectionEffect = (event: Pick<AnimationEvent, 'effectId'>): ProtectionEffect => {
  if (event.effectId === 'water-shield' || event.effectId === 'commander-order-shield') return 'absorb'
  if (event.effectId === 'commander-nature-aura' || event.effectId === 'nature-ally-aura') return 'vitality'
  return 'grant'
}

export const periodicEffect = (event: Pick<AnimationEvent, 'effectId'>): string | undefined => {
  const id = event.effectId ?? ''
  if (/contagion-drain|poison-tick|poison-drain|venom-tick/.test(id)) return 'Contagio'
  if (/curse-drain|curse-tick/.test(id)) return 'Maldición'
  if (/scorch|burn-tick|burn-drain|upkeep-burn|lava-tick/.test(id)) return 'Quemadura'
  return undefined
}

export interface ResolvedEffect {
  readonly id: string
  readonly turn: number
  readonly source: string
  readonly target: string
  readonly text: string
  readonly tone: 'damage' | 'periodic' | 'protection' | 'change'
  /** Lecturas de la acción completa, no reconstrucciones aproximadas de sus efectos. */
  readonly before?: number
  readonly after?: number
}

const pieceName = (before: MatchState, after: MatchState, id?: string): string | undefined => {
  if (id === 'player-nexus' || id === 'ai-nexus') {
    const owner = id === 'player-nexus' ? 'player' : 'ai'
    return `Nexo de ${COMMANDER_BY_ID[before.players[owner].commanderId]?.name ?? owner}`
  }
  const piece = before.board.find((item) => item.instanceId === id) ?? after.board.find((item) => item.instanceId === id)
  return piece && CARD_BY_ID[piece.cardId]?.name
}

const healthOf = (state: MatchState, id?: string): number | undefined =>
  id === 'player-nexus' ? state.players.player.nexusHealth : id === 'ai-nexus' ? state.players.ai.nexusHealth : state.board.find((piece) => piece.instanceId === id)?.currentHealth

export const resolvedEffectsFor = (before: MatchState, after: MatchState, events: readonly AnimationEvent[]): readonly ResolvedEffect[] =>
  events.flatMap((event): ResolvedEffect[] => {
    const periodic = periodicEffect(event)
    const amount = event.amount ?? 0
    const protection = protectionEffect(event)
    const text = event.type === 'damage' || event.type === 'nexus-damage' ? `${periodic ? `${periodic} · ` : ''}−${amount} Vida`
      : event.type === 'shield' ? protection === 'absorb' ? `Protección absorbe ${amount}` : protection === 'vitality' ? `Aura · +${amount} Vida` : `+${amount} Escudo`
      : event.type === 'destroy' ? 'Destruida' : event.type === 'freeze' ? 'Congelada' : undefined
    if (!text) return []
    const origin = event.from && before.board.find((piece) => piece.position.x === event.from?.x && piece.position.y === event.from?.y)
    const source = periodic ?? (event.cardId && CARD_BY_ID[event.cardId]?.name) ?? pieceName(before, after, event.actorId) ?? (origin && CARD_BY_ID[origin.cardId]?.name) ?? 'Efecto de batalla'
    const target = pieceName(before, after, event.targetId) ?? (event.targetCardId && CARD_BY_ID[event.targetCardId]?.name) ?? 'Tablero'
    return [{ id: event.id, turn: before.turn, source, target, text,
      tone: event.type === 'shield' ? 'protection' : periodic ? 'periodic' : event.type === 'damage' || event.type === 'nexus-damage' ? 'damage' : 'change',
      before: healthOf(before, event.targetId),
      after: healthOf(after, event.targetId) ?? (events.some((item) => item.type === 'destroy' && item.targetId === event.targetId) ? 0 : undefined),
    }]
  })
