import { CARD_BY_ID, getValidAttacks, getValidMoves, BOARD_SIZE, type MatchState, type PlayerId, type Position } from '../game'

/**
 * Amenazas del tablero: a quién puede atacar una unidad, quién puede
 * atacarla y qué casillas puede golpear el rival en su próximo turno.
 *
 * No duplica reglas: prepara un estado hipotético en el que le toca al
 * dueño de la unidad, con sus fichas descansadas, y pregunta al motor
 * (getValidAttacks / getValidMoves). Así la Guardia, el alcance mínimo o la
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

const key = (position: Position) => `${position.x},${position.y}`
const manhattan = (a: Position, b: Position) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y)

/**
 * Casillas que el rival de `me` puede golpear en su próximo turno, moviendo
 * y atacando, con cuántas unidades distintas llegan a cada una. Se aproxima
 * el ataque por alcance (pasos) desde cada casilla a la que puede llegar;
 * la línea de tiro exacta depende de dónde acabe todo el mundo.
 */
export const dangerCells = (state: MatchState, me: PlayerId): ReadonlyMap<string, number> => {
  const enemy: PlayerId = me === 'player' ? 'ai' : 'player'
  const ready = readyState(state, enemy)
  const danger = new Map<string, number>()
  for (const piece of ready.board) {
    if (piece.owner !== enemy) continue
    const card = CARD_BY_ID[piece.cardId]
    if (!card || card.type !== 'unit') continue
    const range = card.range ?? 1
    const reach = new Set<string>()
    for (const from of [piece.position, ...getValidMoves(ready, piece.instanceId)]) {
      for (let y = 0; y < BOARD_SIZE; y += 1) {
        for (let x = 0; x < BOARD_SIZE; x += 1) {
          const distance = manhattan(from, { x, y })
          if (distance > 0 && distance <= range) reach.add(key({ x, y }))
        }
      }
    }
    for (const cell of reach) danger.set(cell, (danger.get(cell) ?? 0) + 1)
  }
  return danger
}
