import { CARD_BY_ID, getValidAttacks, type MatchState, type PlayerId } from '../game'

/**
 * Amenazas del tablero: a quién puede atacar una unidad y quién puede
 * atacarla.
 *
 * No duplica reglas: prepara un estado hipotético en el que le toca al
 * dueño de la unidad, con sus fichas descansadas, y pregunta al motor
 * (getValidAttacks). Así la Guardia, el alcance mínimo o la
 * línea de tiro se respetan solos. Es una previsión: si el rival juega una
 * carta que lo cambia todo, el mapa no lo sabe.
 */
const readyState = (state: MatchState, owner: PlayerId): MatchState => ({
  ...state,
  activePlayer: owner,
  phase: 'main',
  players: {
    ...state.players,
    [owner]: { ...state.players[owner], attacksForbiddenThisTurn: false },
  },
  board: state.board.map((piece) => piece.owner === owner
    ? { ...piece, attackedThisTurn: false, movedThisTurn: false, enteredOnTurn: Math.min(piece.enteredOnTurn, state.turn - 1) }
    : piece),
})

export interface ThreatLinks {
  /** Fichas enemigas a las que puede atacar ya, sin moverse. */
  readonly targets: readonly string[]
  readonly hitsNexus: boolean
  /** Fichas enemigas que pueden atacarla en su turno, sin moverse. */
  readonly attackers: readonly string[]
}

export const threatLinks = (state: MatchState, pieceId: string): ThreatLinks => {
  const piece = state.board.find((candidate) => candidate.instanceId === pieceId)
  if (!piece || CARD_BY_ID[piece.cardId]?.type !== 'unit') {
    return { targets: [], hitsNexus: false, attackers: piece ? attackersOf(state, pieceId, piece.owner) : [] }
  }
  const mine = getValidAttacks(readyState(state, piece.owner), pieceId)
  return { targets: mine.pieceIds, hitsNexus: mine.canAttackNexus, attackers: attackersOf(state, pieceId, piece.owner) }
}

const attackersOf = (state: MatchState, pieceId: string, owner: PlayerId): readonly string[] => {
  const enemy: PlayerId = owner === 'player' ? 'ai' : 'player'
  const ready = readyState(state, enemy)
  return ready.board
    .filter((candidate) => candidate.owner === enemy && CARD_BY_ID[candidate.cardId]?.type === 'unit')
    .filter((candidate) => getValidAttacks(ready, candidate.instanceId).pieceIds.includes(pieceId))
    .map((candidate) => candidate.instanceId)
}
