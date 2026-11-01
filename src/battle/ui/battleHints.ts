import { spellNeedsPiece, type AttackNexusPreview, type AttackPiecePreview, type BoardPiece, type CardDefinition } from '../../game'

/**
 * Hechizos que exigen señalar una ficha concreta del tablero antes de
 * resolverse. Reexporta la lista del motor en vez de mantener aquí una copia
 * propia: una copia separada (sin Maldición Sombra) llevaba a que el botón
 * «Resolver carta» apareciera para un hechizo que el motor iba a rechazar
 * igualmente por falta de objetivo.
 */
export const requiresPieceTarget = spellNeedsPiece

/** Cartas que ocupan casilla al jugarse (frente a hechizos y fuentes). */
export const isBoardCard = (card: CardDefinition): boolean => card.type === 'unit' || card.type === 'structure'

/**
 * Línea compacta de estadísticas de una ficha ya desplegada. Usa la vida y el
 * ataque reales (con modificadores aplicados), no los impresos en la carta.
 */
export const pieceStatLine = (piece: BoardPiece, card: CardDefinition): string => {
  const parts: string[] = []
  if (card.attack !== undefined) parts.push(`ATQ ${Math.max(0, card.attack + piece.attackModifier)}`)
  parts.push(`VID ${piece.currentHealth}`)
  if (card.range !== undefined) parts.push(`ALC ${card.range}`)
  if (card.movement !== undefined) parts.push(`MOV ${card.movement}`)
  return parts.join(' · ')
}

/** Línea compacta de estadísticas de una carta en la mano: valores impresos. */
export const cardStatLine = (card: CardDefinition): string => {
  const parts: string[] = []
  if (card.attack !== undefined) parts.push(`ATQ ${card.attack}`)
  if (card.health !== undefined) parts.push(`VID ${card.health}`)
  if (card.resistance !== undefined) parts.push(`RES ${card.resistance}`)
  if (card.range !== undefined) parts.push(`ALC ${card.range}`)
  if (card.movement !== undefined) parts.push(`MOV ${card.movement}`)
  return parts.join(' · ')
}

export interface ActionHintContext {
  readonly finished: boolean
  readonly isMyTurn: boolean
  /** Ficha consultada con un clic normal: solo información, sin acción asociada. */
  readonly viewedPiece?: BoardPiece
  readonly viewingForeign: boolean
  readonly selectedCard?: CardDefinition
  /** False solo cuando hay carta seleccionada y no alcanza la Esencia para pagarla. */
  readonly canPaySelectedCard: boolean
  readonly selectedPiece?: BoardPiece
  readonly moveCount: number
  readonly canAttackPiece: boolean
  readonly canAttackNexus: boolean
}

/**
 * Guía inmediata: qué puede hacer el jugador con la selección actual.
 *
 * El orden de las comprobaciones importa: consultar una ficha es válido en
 * cualquier turno y nunca desencadena una acción, así que se resuelve antes
 * incluso que el aviso de «turno rival» — así se pueden seguir mirando
 * unidades mientras el rival juega.
 */
export const actionHintFor = (context: ActionHintContext): string | undefined => {
  if (context.finished) return undefined
  if (context.viewedPiece) {
    return context.viewingForeign
      ? 'Consultando una unidad rival: solo información, no puedes actuar sobre ella.'
      : 'Consultando esta unidad.'
  }
  if (!context.isMyTurn) return 'Turno rival: observa sus movimientos.'
  if (context.selectedCard) {
    if (!context.canPaySelectedCard) return 'No tienes Esencia suficiente para esta carta.'
    if (isBoardCard(context.selectedCard)) return 'Elige una casilla iluminada en azul para desplegar.'
    if (requiresPieceTarget(context.selectedCard)) return 'Selecciona un objetivo resaltado en dorado.'
    return 'Pulsa «Resolver carta» para lanzarla.'
  }
  if (context.selectedPiece) {
    const frozen = context.selectedPiece.statuses.some((status) => status.kind === 'frozen')
    if (frozen) return 'Unidad congelada: no puede actuar este turno.'
    const canMove = context.moveCount > 0
    const canAttack = context.canAttackPiece || context.canAttackNexus
    if (canMove && canAttack) return 'Casillas azules: mover · Objetivos dorados: atacar.'
    if (canMove) return 'Elige una casilla azul para mover.'
    if (canAttack) return 'Elige un objetivo dorado para atacar.'
    if (context.selectedPiece.movedThisTurn || context.selectedPiece.attackedThisTurn) {
      return 'Esta unidad ya ha agotado sus acciones este turno.'
    }
    return 'Esta unidad no tiene acciones disponibles ahora mismo.'
  }
  return 'Selecciona una carta de tu mano o una unidad aliada.'
}

/** Líneas de la vista previa de daño al pasar el cursor sobre una ficha objetivo. */
export const attackPiecePreviewLines = (preview: AttackPiecePreview): readonly string[] => {
  if (preview.sinksDefender) return ['Canto: hunde la unidad temporalmente', 'Sin daño ni contragolpe'];
  const lines: string[] = []
  lines.push(preview.defenderDies ? `💀 Destruye (−${preview.damageToDefender})` : `−${preview.damageToDefender} → ${preview.defenderHealthAfter} Vida`)
  if (preview.retaliationToAttacker > 0) {
    lines.push(preview.attackerDies ? `Contragolpe: mueres (−${preview.retaliationToAttacker})` : `Contragolpe: −${preview.retaliationToAttacker}`)
  }
  if (preview.pierceOverkill > 0) lines.push(`Perfora +${preview.pierceOverkill} al Nexo`)
  return lines
}

/** Líneas de la vista previa de daño al pasar el cursor sobre el Nexo rival. */
export const attackNexusPreviewLines = (preview: AttackNexusPreview): readonly string[] =>
  preview.lethal ? [`−${preview.damage} · ¡Golpe letal!`] : [`−${preview.damage} → ${preview.nexusHealthAfter} Vida`]

/**
 * Veredicto de la previsión al apuntar, para cada una de las dos fichas.
 * Sustituye a unas líneas de texto sueltas sobre el objetivo: ahora cada
 * ficha dice lo que le va a pasar con un sello de color propio, y la
 * atacante también avisa del contragolpe sin tener que leer la otra.
 */
export type VerdictTone = 'kill' | 'hurt' | 'counterKill' | 'counter' | 'safe' | 'sink' | 'pierce' | 'nexus' | 'lethal'

export interface PreviewVerdict {
  readonly tone: VerdictTone
  readonly title: string
  readonly detail?: string
}

export const attackPieceVerdicts = (preview: AttackPiecePreview): { readonly target: readonly PreviewVerdict[]; readonly attacker: readonly PreviewVerdict[] } => {
  if (preview.sinksDefender) {
    return { target: [{ tone: 'sink', title: 'Hundida', detail: 'Vuelve en su próximo turno' }], attacker: [{ tone: 'safe', title: 'Sin contragolpe' }] }
  }
  const target: PreviewVerdict[] = [preview.defenderDies
    ? { tone: 'kill', title: 'Muere', detail: `−${preview.damageToDefender}` }
    : { tone: 'hurt', title: `Sobrevive con ${preview.defenderHealthAfter}`, detail: `−${preview.damageToDefender}` }]
  if (preview.pierceOverkill > 0) target.push({ tone: 'pierce', title: `+${preview.pierceOverkill} al Nexo`, detail: 'Perforar' })
  const attacker: PreviewVerdict[] = preview.retaliationToAttacker > 0
    ? [preview.attackerDies
      ? { tone: 'counterKill', title: 'Muere en el contragolpe', detail: `−${preview.retaliationToAttacker}` }
      : { tone: 'counter', title: `Devuelve ${preview.retaliationToAttacker}`, detail: `Te quedas con ${preview.attackerHealthAfter}` }]
    : [{ tone: 'safe', title: 'Sin contragolpe' }]
  return { target, attacker }
}

export const attackNexusVerdicts = (preview: AttackNexusPreview): readonly PreviewVerdict[] =>
  preview.lethal
    ? [{ tone: 'lethal', title: '¡Golpe letal!', detail: `−${preview.damage}` }]
    : [{ tone: 'nexus', title: `Queda con ${preview.nexusHealthAfter}`, detail: `−${preview.damage}` }]
