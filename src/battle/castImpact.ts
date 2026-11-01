import type { BoardPiece, Keyword, MatchState, PieceStatus, PlayerId, Position } from '../game'

/**
 * Qué ha cambiado en el tablero por una jugada: a quién afectó y cómo.
 *
 * Existe porque un poder como «Todas tus unidades ganan Petardazo» no deja
 * ningún evento visible: el motor solo marca las piezas. Al presentar la
 * carta no había forma de decir a cuántas unidades afectó ni cuáles eran.
 * Comparar el tablero antes y después de la acción lo resuelve para todas
 * las cartas a la vez, sin tocar el motor ni acoplar la interfaz a cada
 * efecto concreto. El estado ya va por delante de la animación (ver
 * «Trampas» en ESTADO-Y-SIGUIENTE), así que el resultado se calcula al
 * despachar la acción y la presentación solo lo lee.
 */
export type ImpactTone = 'harm' | 'boon' | 'control' | 'neutral'

export interface ImpactChange {
  /** Texto corto que se pinta sobre la ficha: «+Petardazo», «−3 Vida». */
  readonly label: string
  readonly tone: ImpactTone
  /** Término del glosario que lo explica, para darle su icono y color. */
  readonly glossaryId?: string
}

export interface ImpactedPiece {
  readonly instanceId: string
  readonly cardId: string
  readonly owner: PlayerId
  readonly position: Position
  readonly changes: readonly ImpactChange[]
}

export interface CastImpact {
  readonly pieces: readonly ImpactedPiece[]
  /** Cambio de Vida de cada Nexo (negativo = daño). Solo los que cambian. */
  readonly nexus: Partial<Readonly<Record<PlayerId, number>>>
}

const KEYWORD_TEXT: Readonly<Record<Keyword, { readonly label: string; readonly glossaryId: string }>> = {
  impulse: { label: 'Impulso', glossaryId: 'impulso' },
  'swift-strike': { label: 'Golpe veloz', glossaryId: 'golpe-veloz' },
  guard: { label: 'Guardia', glossaryId: 'guardia' },
  flying: { label: 'Volador', glossaryId: 'volador' },
  pierce: { label: 'Perforar', glossaryId: 'perforar' },
  lifelink: { label: 'Vínculo vital', glossaryId: 'vinculo-vital' },
  stun: { label: 'Aturdir', glossaryId: 'aturdir' },
}

const statusChange = (status: PieceStatus): ImpactChange => {
  switch (status.kind) {
    case 'frozen': return { label: 'Congelada', tone: 'control', glossaryId: 'congelar' }
    case 'stunned': return { label: 'Aturdida', tone: 'control', glossaryId: 'aturdir' }
    case 'shielded': return { label: `Escudo ${status.amount}`, tone: 'boon', glossaryId: 'escudo' }
    case 'silenced': return { label: 'Silenciada', tone: 'control' }
    case 'anchored': return { label: 'Anclada', tone: 'control' }
    case 'cursed': return { label: 'Maldita', tone: 'harm' }
    case 'infected': return { label: 'Infectada', tone: 'harm', glossaryId: 'contagio' }
  }
}

const samePlace = (a: Position, b: Position) => a.x === b.x && a.y === b.y

const pieceChanges = (before: BoardPiece, after: BoardPiece): ImpactChange[] => {
  const changes: ImpactChange[] = []
  const health = after.currentHealth - before.currentHealth
  if (health < 0) changes.push({ label: `−${-health} Vida`, tone: 'harm' })
  if (health > 0) changes.push({ label: `+${health} Vida`, tone: 'boon' })
  const attack = after.attackModifier - before.attackModifier
  if (attack > 0) changes.push({ label: `+${attack} Ataque`, tone: 'boon' })
  if (attack < 0) changes.push({ label: `−${-attack} Ataque`, tone: 'harm' })
  for (const keyword of after.grantedKeywords ?? []) {
    if (before.grantedKeywords?.includes(keyword)) continue
    const text = KEYWORD_TEXT[keyword]
    changes.push({ label: `+${text.label}`, tone: 'boon', glossaryId: text.glossaryId })
  }
  if (after.grantedPetardazo && !before.grantedPetardazo) changes.push({ label: '+Petardazo', tone: 'boon', glossaryId: 'petardazo' })
  if (after.grantedFormation && !before.grantedFormation) changes.push({ label: '+Formación', tone: 'boon', glossaryId: 'formacion' })
  if (after.grantedDischarge && !before.grantedDischarge) changes.push({ label: '+Descarga', tone: 'boon', glossaryId: 'descarga' })
  for (const status of after.statuses) {
    const previous = before.statuses.find((candidate) => candidate.kind === status.kind)
    // Un escudo que crece también cuenta; uno que ya estaba igual, no.
    if (previous && !(status.kind === 'shielded' && previous.kind === 'shielded' && status.amount > previous.amount)) continue
    changes.push(statusChange(status))
  }
  if (!samePlace(before.position, after.position)) changes.push({ label: 'Desplazada', tone: 'neutral' })
  return changes
}

export const castImpact = (before: MatchState, after: MatchState): CastImpact => {
  const pieces: ImpactedPiece[] = []
  const afterById = new Map(after.board.map((piece) => [piece.instanceId, piece]))
  const sunk = new Set((after.sunkenUnits ?? []).map((unit) => unit.instanceId))
  for (const previous of before.board) {
    const current = afterById.get(previous.instanceId)
    if (!current) {
      const gone: ImpactChange = sunk.has(previous.instanceId)
        ? { label: 'Hundida', tone: 'control', glossaryId: 'canto' }
        : { label: 'Destruida', tone: 'harm' }
      pieces.push({ instanceId: previous.instanceId, cardId: previous.cardId, owner: previous.owner, position: previous.position, changes: [gone] })
      continue
    }
    const changes = pieceChanges(previous, current)
    if (changes.length > 0) {
      pieces.push({ instanceId: current.instanceId, cardId: current.cardId, owner: current.owner, position: current.position, changes })
    }
  }
  const beforeIds = new Set(before.board.map((piece) => piece.instanceId))
  for (const current of after.board) {
    if (beforeIds.has(current.instanceId)) continue
    pieces.push({
      instanceId: current.instanceId, cardId: current.cardId, owner: current.owner, position: current.position,
      changes: [{ label: 'Entra en juego', tone: 'neutral' }],
    })
  }
  const nexus: Partial<Record<PlayerId, number>> = {}
  for (const id of ['player', 'ai'] as const) {
    const delta = after.players[id].nexusHealth - before.players[id].nexusHealth
    if (delta !== 0) nexus[id] = delta
  }
  return { pieces, nexus }
}

/** Cuánto dura lo que hace una carta, leído de su texto. */
export const durationLabel = (rules: string): string | undefined => {
  const text = rules.toLocaleLowerCase('es-ES')
  if (/hasta el final del turno|hasta el fin(al)? de(l)? turno|este turno/.test(text)) return 'Hasta el final del turno'
  if (/hasta el final de(l)? (su|tu) próximo turno|siguiente turno/.test(text)) return 'Hasta el próximo turno'
  if (/permanente/.test(text)) return 'Permanente'
  if (/mientras/.test(text)) return 'Mientras se cumpla la condición'
  return undefined
}

/**
 * Resumen de una línea para el rótulo: «Afecta a 4 unidades tuyas» se lee
 * más rápido que una lista. Distingue bando porque en un hechizo de área lo
 * importante es justo a quién ha dado.
 */
export const impactHeadline = (impact: CastImpact, me: PlayerId): string | undefined => {
  const own = impact.pieces.filter((piece) => piece.owner === me).length
  const rival = impact.pieces.length - own
  const parts: string[] = []
  if (own) parts.push(`${own} ${own === 1 ? 'unidad tuya' : 'unidades tuyas'}`)
  if (rival) parts.push(`${rival} ${rival === 1 ? 'unidad rival' : 'unidades rivales'}`)
  const nexusParts = (Object.entries(impact.nexus) as [PlayerId, number][])
    .map(([owner, delta]) => `${owner === me ? 'tu Nexo' : 'el Nexo rival'} ${delta > 0 ? `+${delta}` : `−${-delta}`}`)
  if (parts.length === 0 && nexusParts.length === 0) return undefined
  return [parts.length ? `Afecta a ${parts.join(' y ')}` : '', ...nexusParts].filter(Boolean).join(' · ')
}
