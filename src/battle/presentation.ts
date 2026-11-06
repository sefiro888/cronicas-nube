import { protectionEffect } from './resolvedEffects'
import type { CastImpact } from './castImpact'
import { CARD_BY_ID, COMMANDER_BY_ID, FACTION_BY_ID, type AnimationEvent, type BoardPiece, type CardDefinition, type Keyword, type MatchState, type PlayerId } from '../game'

/**
 * Ritmo de la presentación. No cambia reglas: solo cuánto se detiene la
 * pantalla en cada suceso. «Cinemático» es el de por defecto porque la queja
 * que lo originó era justo que los hechizos y golpes pasaban sin leerse.
 */
export type PresentationPace = 'cinematic' | 'normal' | 'fast'

export const PRESENTATION_PACES: readonly PresentationPace[] = ['cinematic', 'normal', 'fast']

export const PACE_LABELS: Readonly<Record<PresentationPace, { readonly name: string; readonly hint: string }>> = {
  cinematic: { name: 'Cinemático', hint: 'Cartas en grande, golpes pausados y más tiempo para jugadas decisivas.' },
  normal: { name: 'Normal', hint: 'Cartas en grande más breves y combates a velocidad original.' },
  fast: { name: 'Rápido', hint: 'Solo se presentan las cartas del rival, y por poco tiempo.' },
}

/**
 * Multiplicador por tipo de evento. El combate es lo que más se estira: un
 * golpe a 380 ms se leía como un parpadeo y no se sabía quién pegó a quién.
 * La contabilidad (robos, fuentes) no se toca para que el turno no se haga
 * pesado entre jugadas. La invocación sube a ×2,4 (~1 s) porque ahora es una
 * caída con aterrizaje: con ×1,35 la pieza tocaba suelo en un parpadeo.
 */
const PACE_SCALE: Readonly<Record<PresentationPace, Partial<Record<AnimationEvent['type'], number>>>> = {
  cinematic: {
    attack: 1.7, damage: 1.4, destroy: 1.65, 'nexus-damage': 1.9,
    spell: 1.6, summon: 2.4, move: 1, shield: 1.15, freeze: 1.2,
  },
  normal: {},
  fast: { attack: 0.75, damage: 0.75, destroy: 0.75, spell: 0.75, summon: 0.75, move: 0.8 },
}

export const paceScale = (pace: PresentationPace | undefined, type: AnimationEvent['type']): number =>
  PACE_SCALE[pace ?? 'normal'][type] ?? 1

/**
 * Conservamos los cinco segundos en Cinemático para las jugadas que más
 * necesitan lectura. Los lanzamientos breves devuelven antes el control.
 */
const SPOTLIGHT_MS: Readonly<Record<PresentationPace, { readonly own: number; readonly rival: number }>> = {
  cinematic: { own: 5000, rival: 5000 },
  normal: { own: 2500, rival: 3000 },
  fast: { own: 0, rival: 1500 },
}

export const spotlightDuration = (pace: PresentationPace | undefined, mine: boolean, animationSpeed = 1, extended = true): number => {
  const base = pace === 'cinematic' && !extended ? 3200 : SPOTLIGHT_MS[pace ?? 'normal'][mine ? 'own' : 'rival']
  // La velocidad de animación acorta, pero nunca por debajo de lo que se tarda
  // en leer un nombre: a ×2 la carta rival seguía visible menos de un segundo.
  return base === 0 ? 0 : Math.max(800, base / Math.max(1, animationSpeed))
}

/** Pausa entre acciones de la IA: con más ritmo cinematográfico, más aire. */
export const AI_GAP_SCALE: Readonly<Record<PresentationPace, number>> = { cinematic: 2.2, normal: 1, fast: 0.6 }

export interface SpotlightTarget {
  readonly label: string
  readonly cardId?: string
}

export interface Spotlight {
  /** Id del evento que se presenta: evita presentarlo dos veces. */
  readonly eventId: string
  readonly kind: 'spell' | 'structure' | 'power'
  readonly caster: PlayerId
  /** Carta que se enseña; para un poder, una carta virtual con el retrato del comandante. */
  readonly card: CardDefinition
  readonly commanderName?: string
  readonly target?: SpotlightTarget
  readonly durationMs: number
  /** A quién afectó la jugada (ver castImpact.ts). Falta en partidas en red. */
  readonly impact?: CastImpact
  readonly payment?: AnimationEvent['spellPayment']
  readonly sparkFace?: AnimationEvent['sparkFace']
  readonly tide?: AnimationEvent['spellTide']
}

/**
 * El poder no es una carta, pero presentarlo con el mismo marco hace que se
 * lea igual de importante. Mismo truco que usa el motor para resolverlo.
 */
const powerCard = (commanderId: string): CardDefinition | undefined => {
  const commander = COMMANDER_BY_ID[commanderId]
  if (!commander) return undefined
  const card: CardDefinition = {
    id: `${commander.id}-power`,
    name: commander.power.name,
    faction: commander.faction,
    color: FACTION_BY_ID[commander.faction].accentColor,
    type: 'instant',
    subtype: `Poder de ${commander.name}`,
    rarity: 'mythic',
    cost: commander.power.cost,
    rules: commander.power.description,
    flavor: commander.flavor,
    keywords: [],
    set: 'Comandante',
    collectorNumber: 0,
    artist: 'Atelier del Nexo',
    aiTags: [],
    art: commander.art,
    vfx: commander.vfx,
    sfx: { play: `${commander.faction}-play`, impact: `${commander.faction}-impact` },
    unlocked: true,
    unique: true,
    effects: [],
  }
  return card
}

const targetFor = (event: AnimationEvent, caster: PlayerId, me: PlayerId): SpotlightTarget | undefined => {
  if (event.targetCardId) {
    const name = CARD_BY_ID[event.targetCardId]?.name
    if (name) return { label: name, cardId: event.targetCardId }
  }
  // El motor apunta un poder sin objetivo al Nexo propio de quien lo lanza;
  // anunciarlo como «sobre tu Nexo» confundiría un robo con un ataque.
  if (event.cast?.kind === 'power') return undefined
  if (event.targetId?.endsWith('-nexus')) {
    const owner = event.targetId.replace('-nexus', '') as PlayerId
    if (owner === caster) return { label: owner === me ? 'tu propio Nexo' : 'su propio Nexo' }
    return { label: owner === me ? 'tu Nexo' : 'el Nexo rival' }
  }
  return undefined
}

/**
 * Traduce el evento que abre una jugada a lo que hay que enseñar. Devuelve
 * `undefined` para todo lo que no sea una carta lanzada o un poder, y cuando
 * el ritmo elegido no presenta las jugadas propias.
 */
export const spotlightFor = (
  event: AnimationEvent | undefined,
  match: Pick<MatchState, 'players'> | undefined,
  me: PlayerId,
  options: { readonly pace?: PresentationPace; readonly animationSpeed?: number; readonly impact?: CastImpact },
): Spotlight | undefined => {
  if (!event?.cast || !match) return undefined
  const caster = event.actorId as PlayerId
  if (caster !== 'player' && caster !== 'ai') return undefined
  const mine = caster === me
  const source = CARD_BY_ID[event.cast.sourceId]
  const extended = event.cast.kind === 'power' || source?.rarity === 'mythic' || (source?.rules.length ?? 0) >= 130
    || event.sparkFace !== undefined || Boolean(event.spellPayment?.offering)
  const durationMs = spotlightDuration(options.pace, mine, options.animationSpeed, extended)
  if (durationMs <= 0) return undefined
  if (event.cast.kind === 'power') {
    const card = powerCard(event.cast.sourceId)
    if (!card) return undefined
    return {
      eventId: event.id, kind: 'power', caster, card,
      commanderName: COMMANDER_BY_ID[event.cast.sourceId]?.name,
      target: targetFor(event, caster, me), durationMs, impact: options.impact,
    }
  }
  const card = source
  if (!card) return undefined
  return {
    eventId: event.id, kind: event.cast.kind, caster, card, target: targetFor(event, caster, me),
    durationMs, impact: options.impact, payment: event.spellPayment, sparkFace: event.sparkFace, tide: event.spellTide,
  }
}

/** Título del rótulo: deja claro de un vistazo QUIÉN hace QUÉ. */
export const spotlightHeading = (spotlight: Pick<Spotlight, 'kind' | 'caster'>, me: PlayerId): string => {
  const who = spotlight.caster === me ? 'Lanzas' : 'El rival lanza'
  if (spotlight.kind === 'power') return spotlight.caster === me ? 'Usas tu poder de comandante' : 'El rival usa su poder de comandante'
  if (spotlight.kind === 'structure') return spotlight.caster === me ? 'Levantas una estructura' : 'El rival levanta una estructura'
  return `${who} un hechizo`
}

// ── Combate ──────────────────────────────────────────────────────────────────

/**
 * Cuánto se enseñan las dos cartas antes de que el golpe caiga. Más breve
 * que una carta lanzada: un turno trae varios ataques y cinco segundos por
 * cada uno haría la partida eterna. Lo justo para leer quién contra quién y
 * qué habilidades entran en juego.
 */
const DUEL_INTRO_MS: Readonly<Record<PresentationPace, number>> = { cinematic: 1450, normal: 900, fast: 0 }

export const duelIntroDuration = (pace: PresentationPace | undefined, animationSpeed = 1): number => {
  const base = DUEL_INTRO_MS[pace ?? 'normal']
  return base === 0 ? 0 : Math.max(500, base / Math.max(1, animationSpeed))
}

/** Habilidad que pesa en un intercambio. `active` = acaba de actuar en este golpe. */
export interface CombatTrait {
  readonly id: string
  readonly label: string
  readonly detail: string
  readonly active: boolean
}

export interface CombatSide {
  readonly cardId?: string
  readonly name: string
  readonly owner: PlayerId
  /** Daño recibido en este intercambio (incluye el contragolpe). */
  readonly damage: number
  readonly destroyed: boolean
  readonly nexus?: boolean
  /** Copia de la pieza al abrir el intercambio: estados y palabras prestadas. */
  readonly piece?: BoardPiece
  /** Daño que absorbió un escudo o una reducción en este golpe. */
  readonly absorbed: number
  readonly health?: AnimationEvent['pieceHealth']
  readonly renacer?: number
  readonly excess?: number
  readonly countered?: boolean
  /** Habilidades que ya han actuado: se iluminan con más fuerza. */
  readonly triggered: readonly string[]
}

export interface CombatExchange {
  /** Id del evento de ataque que abrió el intercambio. */
  readonly key: string
  /** 'intro': cartas presentadas, golpe aún sin caer; 'clash': ya se resuelve. */
  readonly phase: 'intro' | 'clash'
  readonly attacker: CombatSide & { readonly id: string }
  readonly defender: CombatSide & { readonly id: string }
  /**
   * Golpe decisivo: la defensora va a caer o el Nexo queda a un cuarto de
   * Vida o menos. Se presenta a cámara lenta. Se sabe de antemano porque el
   * motor ya ha resuelto la jugada y sus consecuencias esperan en la cola.
   */
  readonly finisher?: boolean
  readonly attackAbility?: AnimationEvent['attackAbility']
}

/** Fracción de Vida del Nexo por debajo de la cual un golpe se trata como decisivo. */
export const FINISHER_NEXUS_RATIO = 0.25

/**
 * ¿Es decisivo el intercambio que abre `attack`? Mira la cola pendiente hasta
 * el siguiente suceso que cierre el duelo.
 */
export const isFinisher = (
  attack: AnimationEvent,
  pending: readonly AnimationEvent[],
  match?: Pick<MatchState, 'players'>,
): boolean => {
  const start = pending.indexOf(attack)
  for (const event of pending.slice(start + 1)) {
    if (endsExchange(event)) break
    if (event.type === 'destroy' && event.targetId === attack.targetId) return true
    if (event.type === 'nexus-damage' && match && event.targetId?.endsWith('-nexus')) {
      const owner = event.targetId.replace('-nexus', '') as PlayerId
      const player = match.players[owner]
      const max = COMMANDER_BY_ID[player.commanderId]?.nexusHealth ?? player.nexusHealth
      if (player.nexusHealth <= max * FINISHER_NEXUS_RATIO) return true
    }
  }
  return false
}

const opponent = (player: PlayerId): PlayerId => (player === 'player' ? 'ai' : 'player')

/** Abre un intercambio a partir del evento de ataque y del dueño de quien golpea. */
export const openExchange = (
  event: AnimationEvent,
  attackerOwner: PlayerId,
  board: readonly BoardPiece[] = [],
): CombatExchange | undefined => {
  if (event.type !== 'attack' || !event.actorId || !event.targetId) return undefined
  const attackerName = event.cardId ? CARD_BY_ID[event.cardId]?.name : undefined
  const nexus = event.targetId.endsWith('-nexus')
  const defenderOwner = nexus ? (event.targetId.replace('-nexus', '') as PlayerId) : opponent(attackerOwner)
  const defenderName = nexus ? 'Nexo' : (event.targetCardId ? CARD_BY_ID[event.targetCardId]?.name : undefined)
  const pieceOf = (id: string) => board.find((piece) => piece.instanceId === id)
  return {
    key: event.id,
    phase: 'intro',
    attackAbility: event.attackAbility,
    attacker: {
      id: event.actorId, cardId: event.cardId, name: attackerName ?? 'Atacante', owner: attackerOwner,
      damage: 0, destroyed: false, piece: pieceOf(event.actorId), absorbed: 0, triggered: [],
      health: event.openingHealth && { before: event.openingHealth.attacker, after: event.openingHealth.attacker },
    },
    defender: {
      id: event.targetId, cardId: nexus ? undefined : event.targetCardId, name: defenderName ?? 'Objetivo',
      owner: defenderOwner, damage: 0, destroyed: false, nexus, piece: pieceOf(event.targetId), absorbed: 0, triggered: [],
      health: event.openingHealth && { before: event.openingHealth.defender, after: event.openingHealth.defender },
    },
  }
}

const withTrigger = (side: CombatSide, trait: string): readonly string[] =>
  side.triggered.includes(trait) ? side.triggered : [...side.triggered, trait]

/**
 * Suma al intercambio en curso el daño, las muertes y las habilidades que
 * llegan detrás del ataque. Devuelve el mismo objeto si el evento no le
 * afecta, para que React no repinte el duelo con cada robo o fuente.
 */
export const foldExchange = (exchange: CombatExchange, event: AnimationEvent): CombatExchange => {
  const side = (id?: string) => (id === exchange.attacker.id ? 'attacker' : id === exchange.defender.id ? 'defender' : undefined)
  if (event.type === 'damage' || event.type === 'nexus-damage') {
    // Perforar: el sobrante cae sobre el Nexo y lo firma el atacante.
    if (event.type === 'nexus-damage' && event.actorId === exchange.attacker.id && !exchange.defender.nexus && event.amount) {
      return { ...exchange, attacker: { ...exchange.attacker, excess: (exchange.attacker.excess ?? 0) + event.amount, triggered: withTrigger(exchange.attacker, 'pierce') } }
    }
    const which = side(event.targetId)
    if (!which || !event.amount) return exchange
    const current = exchange[which]
    const hit = {
      ...current, damage: current.damage + event.amount, countered: current.countered || event.retaliation,
      health: event.pieceHealth ? { before: current.health?.before ?? event.pieceHealth.before, after: event.pieceHealth.after } : current.health,
    }
    return { ...exchange, [which]: hit }
  }
  if (event.effectId === 'vinculo-vital' && event.cardId === exchange.attacker.cardId
    && event.actorId === exchange.attacker.owner) {
    return { ...exchange, attacker: { ...exchange.attacker, triggered: withTrigger(exchange.attacker, 'lifelink') } }
  }
  if (event.effectId === 'stun-daze' && event.targetId === exchange.defender.id && attackerHas(exchange.attacker, 'stun')) {
    return { ...exchange, attacker: { ...exchange.attacker, triggered: withTrigger(exchange.attacker, 'stun') } }
  }
  if (event.type === 'shield' && protectionEffect(event) === 'absorb') {
    const which = side(event.targetId)
    if (!which) return exchange
    const current = exchange[which]
    return { ...exchange, [which]: { ...current, absorbed: current.absorbed + (event.amount ?? 0), countered: current.countered || event.retaliation, triggered: withTrigger(current, 'shield') } }
  }
  if (event.type === 'destroy') {
    const which = side(event.targetId)
    if (!which) return exchange
    return { ...exchange, [which]: { ...exchange[which], destroyed: true, renacer: event.renacerBonus } }
  }
  return exchange
}

/** El rótulo pasa a «golpe» cuando el ataque empieza a reproducirse. */
export const clashExchange = (exchange: CombatExchange): CombatExchange =>
  exchange.phase === 'clash' ? exchange : { ...exchange, phase: 'clash' }

/** Eventos que cierran el duelo: empieza otra cosa distinta. */
export const endsExchange = (event: AnimationEvent): boolean =>
  event.type === 'attack' || event.type === 'turn' || event.type === 'summon' || Boolean(event.cast) || event.type === 'move'

const keywordsOf = (side: CombatSide): readonly Keyword[] => {
  const card = side.cardId ? CARD_BY_ID[side.cardId] : undefined
  return [...(card?.keywords ?? []), ...(side.piece?.grantedKeywords ?? [])]
}

const attackerHas = (side: CombatSide, keyword: Keyword): boolean => keywordsOf(side).includes(keyword)

/**
 * Qué habilidades importan en este golpe y cuáles han actuado ya. Solo las
 * que cambian el intercambio: Impulso o Guardia en el atacante no dicen nada
 * de este choque y solo añadían ruido.
 */
const TRAIT_TEXT: Readonly<Record<string, { readonly label: string; readonly detail: string }>> = {
  'swift-strike': { label: 'Golpe veloz', detail: 'Ataca el mismo turno en que entra' },
  pierce: { label: 'Perforar', detail: 'El daño sobrante golpea el Nexo' },
  lifelink: { label: 'Vínculo vital', detail: 'Su daño cura su Nexo' },
  stun: { label: 'Aturdir', detail: 'El golpeado no ataca su próximo turno' },
  flying: { label: 'Volador', detail: 'Solo lo alcanzan voladores o a distancia' },
  guard: { label: 'Guardia', detail: 'Obliga a atacarle primero' },
}

const ROLE_KEYWORDS: Readonly<Record<'attacker' | 'defender', readonly Keyword[]>> = {
  attacker: ['swift-strike', 'pierce', 'lifelink', 'stun', 'flying'],
  defender: ['guard', 'flying'],
}

export const combatTraits = (side: CombatSide, role: 'attacker' | 'defender'): readonly CombatTrait[] => {
  const traits: CombatTrait[] = []
  const keywords = keywordsOf(side)
  for (const keyword of ROLE_KEYWORDS[role]) {
    if (!keywords.includes(keyword)) continue
    const text = TRAIT_TEXT[keyword]!
    traits.push({ id: keyword, ...text, active: side.triggered.includes(keyword) })
  }
  const shield = side.piece?.statuses.find((status) => status.kind === 'shielded')
  if (shield?.kind === 'shielded' || side.triggered.includes('shield')) {
    const amount = side.absorbed || (shield?.kind === 'shielded' ? shield.amount : 0)
    traits.push({
      id: 'shield', label: `Escudo ${amount}`,
      detail: side.triggered.includes('shield') ? `Absorbe ${side.absorbed} de daño` : 'Absorbe el próximo golpe',
      active: side.triggered.includes('shield'),
    })
  }
  const bonus = side.piece?.attackModifier ?? 0
  if (role === 'attacker' && bonus > 0) {
    traits.push({ id: 'buff', label: `+${bonus} de Ataque`, detail: 'Potenciado por efectos', active: false })
  }
  return traits
}

// ── Historial de jugadas ─────────────────────────────────────────────────────

/** Añade una jugada al historial sin repetir la misma invocación ni el mismo evento. */
export const pushRecentPlay = (list: readonly RecentPlay[], play: RecentPlay): readonly RecentPlay[] => {
  if (list.some((entry) => entry.id === play.id || (play.pieceId && entry.pieceId === play.pieceId))) return list
  return [play, ...list].slice(0, RECENT_PLAYS_LIMIT)
}

export interface RecentPlay {
  readonly id: string
  readonly kind: 'spell' | 'structure' | 'power' | 'summon' | 'attack'
  readonly owner: PlayerId
  readonly cardId?: string
  readonly commanderId?: string
  readonly targetCardId?: string
  readonly targetLabel?: string
  /** Pieza invocada: una misma entrada puede traer dos 'summon' (sello y aura). */
  readonly pieceId?: string
}

/** Cuántas jugadas guarda la tira: más no cabe a 1366 × 768 sin tapar el tablero. */
export const RECENT_PLAYS_LIMIT = 7

/**
 * Convierte un evento del motor en una jugada para el historial. Solo las
 * acciones que alguien decidió: cartas, poderes, invocaciones y ataques. Los
 * daños, robos y fuentes son consecuencias y llenarían la tira de ruido.
 */
export const recentPlayFor = (event: AnimationEvent, board: readonly BoardPiece[]): RecentPlay | undefined => {
  if (event.cast) {
    const owner = event.actorId as PlayerId
    if (owner !== 'player' && owner !== 'ai') return undefined
    if (event.cast.kind === 'power') {
      return { id: event.id, kind: 'power', owner, commanderId: event.cast.sourceId, targetCardId: event.targetCardId }
    }
    return {
      id: event.id, kind: event.cast.kind, owner, cardId: event.cast.sourceId, targetCardId: event.targetCardId,
      targetLabel: event.targetId?.endsWith('-nexus') && !event.targetCardId ? 'Nexo' : undefined,
    }
  }
  if (event.type === 'summon' && event.targetId) {
    const piece = board.find((candidate) => candidate.instanceId === event.targetId)
    // Las auras de comandante también llegan como 'summon' sobre la misma
    // pieza; solo cuenta la invocación con sello de facción propio.
    if (!piece || event.effectId?.startsWith('commander-')) return undefined
    return { id: event.id, kind: 'summon', owner: piece.owner, cardId: piece.cardId, pieceId: piece.instanceId }
  }
  if (event.type === 'attack' && event.actorId && event.cardId) {
    const attacker = board.find((candidate) => candidate.instanceId === event.actorId)
    if (!attacker) return undefined
    return {
      id: event.id, kind: 'attack', owner: attacker.owner, cardId: event.cardId, targetCardId: event.targetCardId,
      targetLabel: event.targetId?.endsWith('-nexus') ? 'Nexo' : undefined,
    }
  }
  return undefined
}
