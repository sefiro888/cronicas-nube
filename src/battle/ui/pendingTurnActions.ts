import {
  CARD_BY_ID,
  canPlayHandCard,
  getValidAttacks,
  getValidMoves,
  type MatchState,
  type PlayerId,
} from '../../game'

export interface PendingTurnActions {
  /** Unidades propias que aún pueden moverse o atacar. */
  readonly readyUnits: number
  /** Cartas de la mano que se podrían jugar ahora mismo con la Esencia disponible. */
  readonly playableCards: number
  /** ¿Queda por jugar la fuente de Esencia del turno, teniéndola en la mano? */
  readonly sourceUnplayed: boolean
  /** ¿Hay algo que merezca avisar antes de ceder el turno? */
  readonly anything: boolean
}

const NOTHING: PendingTurnActions = {
  readyUnits: 0,
  playableCards: 0,
  sourceUnplayed: false,
  anything: false,
}

/**
 * Qué se deja sin hacer el jugador si cede el turno ahora mismo.
 *
 * Ceder el turno con una unidad sin mover, con Esencia de sobra o sin haber
 * jugado la fuente del turno es el despiste más caro de este juego: la fuente
 * no se recupera (solo se puede jugar una por turno) y una unidad parada es un
 * turno entero perdido. La pantalla usa esto para pedir confirmación una vez,
 * en vez de dejar que el turno se escape con un clic.
 *
 * Es una función pura sobre el estado para poder probarla sin montar la
 * interfaz, y solo mira lo que el propio jugador podría hacer YA: nada de
 * adivinar jugadas futuras.
 */
export const pendingTurnActions = (
  match: MatchState | undefined,
  me: PlayerId,
): PendingTurnActions => {
  if (!match || match.winner || match.activePlayer !== me) return NOTHING
  const player = match.players[me]

  let readyUnits = 0
  for (const piece of match.board) {
    if (piece.owner !== me) continue
    if (CARD_BY_ID[piece.cardId]?.type !== 'unit') continue
    if (getValidMoves(match, piece.instanceId).length > 0) {
      readyUnits += 1
      continue
    }
    const attacks = getValidAttacks(match, piece.instanceId)
    if (attacks.pieceIds.length > 0 || attacks.canAttackNexus) readyUnits += 1
  }

  let playableCards = 0
  let sourceUnplayed = false
  for (const instance of player.hand) {
    const card = CARD_BY_ID[instance.cardId]
    if (!card) continue
    if (card.type === 'mana') {
      // La fuente del turno es la más dolorosa de olvidar: no se recupera.
      if (canPlayHandCard(match, me, card, instance)) sourceUnplayed = true
      continue
    }
    if (canPlayHandCard(match, me, card, instance)) playableCards += 1
  }

  return {
    readyUnits,
    playableCards,
    sourceUnplayed,
    anything: readyUnits > 0 || playableCards > 0 || sourceUnplayed,
  }
}

/** Texto del aviso, en el orden en que le duele al jugador. */
export const describePendingActions = (pending: PendingTurnActions): string => {
  const partes: string[] = []
  if (pending.sourceUnplayed) partes.push('no has jugado tu fuente de Esencia')
  if (pending.readyUnits > 0) {
    partes.push(pending.readyUnits === 1 ? 'te queda 1 unidad sin actuar' : `te quedan ${pending.readyUnits} unidades sin actuar`)
  }
  if (pending.playableCards > 0) {
    partes.push(pending.playableCards === 1 ? 'puedes jugar 1 carta más' : `puedes jugar ${pending.playableCards} cartas más`)
  }
  if (partes.length === 0) return ''
  const lista = partes.length === 1
    ? partes[0]
    : `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`
  return `Antes de ceder el turno: ${lista}. Pulsa otra vez para cederlo igualmente.`
}
