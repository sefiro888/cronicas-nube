import { CARD_BY_ID, COMMANDER_BY_ID, type AnimationEvent, type FactionId, type MatchState } from '../game'

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
  readonly cueId?: string
  readonly turn: number
  readonly source: string
  readonly target: string
  readonly text: string
  readonly label?: string
  readonly keyword?: string
  readonly metric?: string
  readonly faction?: FactionId
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

interface PlateResult {
  readonly label: string
  readonly keyword: string
  readonly text: string
  readonly metric?: string
}

const statusEffects: Readonly<Record<string, readonly [string, string]>> = {
  'stun-daze': ['Aturdida', 'aturdir'],
  'kalevala-canto': ['Canto · unidad hundida', 'canto'],
  'goblins-spark-roll': ['Chispa · tirada', 'chispa'],
  'scry-top-cards': ['Escrutinio', 'escrutar'],
  'astral-refresh': ['Unidad reactivada', 'agotar'],
}

const eventResult = (event: AnimationEvent): PlateResult | undefined => {
  const amount = event.amount ?? 0
  const id = event.effectId ?? ''
  const periodic = periodicEffect(event)
  switch (event.type) {
    case 'damage':
    case 'nexus-damage': {
      const mechanic = id === 'goblin-petardazo' ? ['Petardazo', 'petardazo']
        : id === 'duna-offering' ? ['Ofrenda', 'ofrenda']
          : id === 'olimpo-hybris-backlash' ? ['Castigo de Hybris', 'hybris']
            : periodic ? [periodic, periodic === 'Contagio' ? 'contagio' : periodic === 'Quemadura' ? 'abrasar' : 'maldicion']
              : [event.retaliation ? 'Contraataque' : 'Impacto', 'impacto']
      return { label: mechanic[0]!, keyword: mechanic[1]!, metric: `−${amount}`, text: `${periodic ? `${periodic} · ` : ''}−${amount} Vida` }
    }
    case 'shield': {
      const protection = protectionEffect(event)
      if (protection === 'absorb') return { label: 'Protección', keyword: 'escudo', metric: String(amount), text: `Protección absorbe ${amount}` }
      if (protection === 'vitality') return { label: 'Aura vital', keyword: 'curacion', metric: `+${amount}`, text: `Aura · +${amount} Vida` }
      return { label: 'Escudo concedido', keyword: 'escudo', metric: `+${amount}`, text: `+${amount} Escudo` }
    }
    case 'destroy': return event.renacerBonus !== undefined
      ? { label: 'Renacer', keyword: 'renacer', text: `Vuelve a la mano · +${event.renacerBonus}/+${event.renacerBonus}` }
      : { label: 'Destruida', keyword: 'baja', text: 'Destruida' }
    case 'freeze': {
      const stunned = id === 'stun-daze'
      const label = stunned ? 'Aturdida' : 'Congelada'
      return { label, keyword: stunned ? 'aturdir' : 'congelar', text: event.statusTurns ? `${label} · ${event.statusTurns} ${event.statusTurns === 1 ? 'turno' : 'turnos'}` : label }
    }
    case 'move': return { label: id === 'card-slide' ? 'Desplazamiento' : 'Movimiento', keyword: 'movimiento',
      text: event.to ? `Destino · ${String.fromCharCode(65 + event.to.x)}${event.to.y + 1}` : 'Cambia de casilla' }
    case 'draw': return { label: 'Robo de carta', keyword: 'robo', text: 'Una carta va a la mano', metric: '+1' }
    case 'resource': return { label: 'Esencia', keyword: 'esencia', text: 'Fuente disponible en la reserva', metric: `+${amount || 1}` }
    case 'mana-flow': return { label: 'Esencia gastada', keyword: 'esencia', text: 'Pago de la jugada', metric: `−${amount}` }
    case 'summon': return { label: 'Despliegue', keyword: 'invocacion', text: 'Entra en el tablero' }
    case 'spell': {
      if (id === 'nexo-curacion' || id === 'vinculo-vital') return {
        label: id === 'vinculo-vital' ? 'Vínculo vital' : 'Curación',
        keyword: id === 'vinculo-vital' ? 'vinculo-vital' : 'curacion', text: `+${amount} Vida al Nexo`, metric: `+${amount}`,
      }
      const entry = statusEffects[id]
      if (entry) return { label: entry[0], keyword: entry[1], text: entry[0] }
      if (event.cast) return { label: event.cast.kind === 'power' ? 'Poder de comandante' : 'Hechizo', keyword: 'conjuro', text: 'Resuelve su efecto' }
      return undefined
    }
    default: return undefined
  }
}

export const resolvedEffectsFor = (before: MatchState, after: MatchState, events: readonly AnimationEvent[]): readonly ResolvedEffect[] => {
  let caster: AnimationEvent | undefined
  const plates = events.flatMap((event): ResolvedEffect[] => {
    if (event.cast || event.type === 'attack' || event.type === 'summon') caster = event
    const result = event.piercing
      ? { label: 'Perforar', keyword: 'perforar', metric: `−${event.amount ?? 0}`, text: `${event.amount ?? 0} de daño al Nexo` }
      : eventResult(event)
    if (!result) return []
    const periodic = periodicEffect(event)
    const origin = event.from && before.board.find((piece) => piece.position.x === event.from?.x && piece.position.y === event.from?.y)
    const actor = event.actorId === 'player' || event.actorId === 'ai' ? COMMANDER_BY_ID[before.players[event.actorId].commanderId] : undefined
    // El evento de robo puede identificar una carta privada. Solo se muestra el bando.
    const card = event.type === 'draw' ? undefined : CARD_BY_ID[event.cardId ?? '']
    const castCard = CARD_BY_ID[caster?.cardId ?? '']
    const source = periodic ?? card?.name ?? pieceName(before, after, event.actorId) ?? (origin && CARD_BY_ID[origin.cardId]?.name)
      ?? (event.type === 'draw' ? actor?.name : castCard?.name ?? actor?.name) ?? 'Efecto de batalla'
    const targetId = event.targetId ?? (event.type === 'move' ? event.actorId : undefined)
    const target = event.type === 'draw' ? 'Mano' : pieceName(before, after, targetId)
      ?? CARD_BY_ID[event.targetCardId ?? '']?.name ?? 'Tablero'
    return [{ id: event.id, turn: before.turn, source, target, ...result,
      faction: event.faction ?? card?.faction ?? (origin && CARD_BY_ID[origin.cardId]?.faction) ?? castCard?.faction ?? actor?.faction,
      tone: event.type === 'shield' ? 'protection' : periodic ? 'periodic' : event.type === 'damage' || event.type === 'nexus-damage' ? 'damage' : 'change',
      before: healthOf(before, targetId),
      after: healthOf(after, targetId) ?? (events.some((item) => item.type === 'destroy' && item.targetId === targetId) ? 0 : undefined),
    }]
  })
  // Estos estados no siempre tienen un evento propio. El saldo se anuncia
  // al acabar la acción y se conserva como entrada separada de la crónica.
  const last = events.at(-1)
  const cue = last?.id
  if (!cue) return plates
  const actionCast = events.find((event) => event.cast)?.cast
  const actionOrigin = actionCast?.kind === 'power' ? COMMANDER_BY_ID[actionCast.sourceId]?.power.name
    : CARD_BY_ID[actionCast?.sourceId ?? '']?.name
  const append = (label: string, keyword: string, text: string, target: string, faction?: FactionId, metric?: string) => {
    plates.push({ id: `${cue}-estado-${plates.length}`, cueId: cue, turn: before.turn, label, keyword, text,
      source: actionOrigin ?? 'Estado al resolver', target, faction, metric, tone: 'change' })
  }
  if (before.mandate !== after.mandate) {
    const name = after.mandate ? COMMANDER_BY_ID[after.players[after.mandate].commanderId]?.name : undefined
    append('Mandato Celestial', 'mandato', name ? 'Reclama el Mandato' : 'El Mandato queda libre', name ?? 'Ambos bandos', 'jade')
  }
  for (const seat of ['player', 'ai'] as const) {
    const name = COMMANDER_BY_ID[after.players[seat].commanderId]?.name ?? 'Nexo'
    for (const [key, label, keyword, faction] of [
      ['sunCount', 'Cuenta del Sol', 'cuenta-del-sol', 'sol'],
      ['hybris', 'Hybris', 'hybris', 'olimpo'],
      ['runo', 'Runo', 'runo', 'kalevala'],
    ] as const) {
      const old = before.players[seat][key] ?? 0
      const current = after.players[seat][key] ?? 0
      if (old !== current) append(label, keyword, `${old} → ${current}`, name, faction)
    }
  }
  const boardBefore = new Map(before.board.map((piece) => [piece.instanceId, piece]))
  for (const piece of after.board) {
    const old = boardBefore.get(piece.instanceId)
    const card = CARD_BY_ID[piece.cardId]
    if (!old || !card) continue
    const attack = piece.attackModifier - old.attackModifier
    if (attack) append('Cambio de Ataque', 'impacto', 'Modificador al resolver', card.name, card.faction, `${attack > 0 ? '+' : '−'}${Math.abs(attack)}`)
    const support = (piece.formationHealthApplied ?? 0) - (old.formationHealthApplied ?? 0)
    if (support) append('Apoyo de Formación', 'formacion', support > 0 ? 'Gana Vida de apoyo' : 'Pierde Vida de apoyo', card.name, card.faction, `${support > 0 ? '+' : '−'}${Math.abs(support)}`)
    for (const [kind, label, keyword, faction] of [
      ['infected', 'Contagio', 'contagio', 'plaga'], ['silenced', 'Silencio', 'silencio', undefined],
      ['anchored', 'Anclaje', 'movimiento', undefined], ['cursed', 'Maldición', 'maldicion', undefined],
      ['frozen', 'Congelación', 'congelar', undefined], ['stunned', 'Aturdimiento', 'aturdir', undefined],
    ] as const) {
      const was = old.statuses.some((status) => status.kind === kind)
      const now = piece.statuses.some((status) => status.kind === kind)
      if (now !== was && (!now || kind !== 'frozen' && kind !== 'stunned')) {
        append(label, keyword, now ? 'Estado aplicado' : 'Estado retirado', card.name, faction ?? card.faction)
      }
    }
  }
  return plates

}
