import { CARD_BY_ID } from './cards'
import { STARTER_DECKS } from './decks'
import { clearAnimationQueue, createMatch } from './engine'
import type { FactionId, MatchState, PlayerId } from './types'

export const createLaboratoryMatch = (
  playerDeckId: string,
  opponentDeckId: string,
  seed = 521061,
): MatchState => {
  const player = STARTER_DECKS.find((deck) => deck.id === playerDeckId) ?? STARTER_DECKS[0]!
  const opponent = STARTER_DECKS.find((deck) => deck.id === opponentDeckId) ?? STARTER_DECKS[1]!
  let match = createMatch(player, opponent, seed)
  for (const owner of ['player', 'ai'] as const) {
    match = {
      ...match,
      players: { ...match.players, [owner]: { ...match.players[owner], mulliganTaken: true } },
    }
    const faction = owner === 'player' ? player.faction : opponent.faction
    for (let index = 0; index < 6; index += 1) match = addLaboratoryResource(match, owner, faction)
  }
  return clearAnimationQueue(match)
}

/** La preparación manual existe solo en el laboratorio, nunca en dispatch de una partida. */
export const addLaboratoryResource = (
  state: MatchState,
  owner: PlayerId,
  faction: FactionId,
): MatchState => {
  const card = Object.values(CARD_BY_ID).find(
    (entry) => entry.faction === faction && entry.type === 'mana',
  )
  if (!card || state.players[owner].resources.length >= 30) return state
  const resource = {
    instanceId: `lab-source-${state.nextId}`,
    cardId: card.id,
    faction,
    exhausted: false,
  }
  return {
    ...state,
    nextId: state.nextId + 1,
    players: {
      ...state.players,
      [owner]: {
        ...state.players[owner],
        resources: [...state.players[owner].resources, resource],
      },
    },
  }
}
export const addLaboratoryCard = (
  state: MatchState,
  owner: PlayerId,
  cardId: string,
): MatchState => {
  if (!CARD_BY_ID[cardId] || state.players[owner].hand.length >= 24) return state
  return {
    ...state,
    nextId: state.nextId + 1,
    players: {
      ...state.players,
      [owner]: {
        ...state.players[owner],
        hand: [...state.players[owner].hand, { cardId, instanceId: `lab-card-${state.nextId}` }],
      },
    },
  }
}
export const rechargeLaboratoryResources = (state: MatchState, owner: PlayerId): MatchState => ({
  ...state,
  players: {
    ...state.players,
    [owner]: {
      ...state.players[owner],
      resources: state.players[owner].resources.map((resource) => ({
        ...resource,
        exhausted: false,
      })),
    },
  },
})
