import { BOARD_SIZE, deploymentRow, isInsideBoard, nexusRow } from './board';
import { CARD_BY_ID } from './cards';
import { COMMANDER_BY_ID, expandDeck } from './decks';
import { activeEffects, canPayOffering, isUnderJudgement, offeringCost, offeringOf } from './duna';
import { pushAll, pushOne, tidePhase } from './marea';
import { assemblyBonus, countStructures, isAutomaton, isForgeStructure, structureEntryBonus, windUpAutomata } from './forja';
import { isChallenge, isFurious } from './fimbul';
import { attackSinksDefender, gainRuno, returnSunkenUnits, runoAttackBonus, runoFromSpell, sinkUnit } from './kalevala';
import { grantPetardazoAll, sparkEffects, startSpark, type SparkFace } from './goblins';
import { continuousHealthBonus, dischargeLine, formationActive, formationAttackBonus, hasDischarge, hasFormation } from './tercios';
import { payMana, planManaPayment, restoreMana } from './mana';
import { COVER_REDUCTION, generateTerrain, givesCover, isBlocked } from './terrain';
import { ELEMENTS } from './types';
import type { ManaCost } from './types';
import { deriveSeed, nextRandom, shuffleSeeded } from './random';
import { validateDeck } from './deck-validation';
import type {
  ActionResult,
  AnimationEvent,
  BoardPiece,
  BoardDecision,
  CardDefinition,
  CardInstance,
  CommanderDefinition,
  DeckDefinition,
  GameAction,
  GameErrorCode,
  Keyword,
  MatchState,
  PlayerId,
  PlayerState,
  Position,
  SpellTarget,
} from './types';

export const OPENING_HAND_SIZE = 10;

export interface ValidAttacks {
  readonly pieceIds: readonly string[];
  readonly canAttackNexus: boolean;
}

type AnimationDraft = Omit<AnimationEvent, 'id'>;

const opponentOf = (playerId: PlayerId): PlayerId => (playerId === 'player' ? 'ai' : 'player');
const distance = (from: Position, to: Position): number =>
  Math.abs(from.x - to.x) + Math.abs(from.y - to.y);

const withPlayer = (state: MatchState, playerId: PlayerId, player: PlayerState): MatchState => ({
  ...state,
  players: { ...state.players, [playerId]: player },
});

const enqueue = (state: MatchState, ...drafts: readonly AnimationDraft[]): MatchState => {
  let nextId = state.nextId;
  const events = drafts.map((draft) => ({ ...draft, id: `event-${nextId++}` }));
  return { ...state, nextId, animations: [...state.animations, ...events] };
};

const fail = (state: MatchState, code: GameErrorCode, message: string): ActionResult => ({
  ok: false,
  state,
  error: { code, message },
});

const success = (state: MatchState): ActionResult => {
  const stable = stabilizeFormation(state);
  return { ok: true, state: stable.phase === 'finished' ? { ...stable, pendingSpark: undefined, pendingDecisions: undefined } : stable };
};

const instantiateDeck = (
  deck: DeckDefinition,
  playerId: PlayerId,
): readonly CardInstance[] =>
  expandDeck(deck).map((cardId, index) => ({
    cardId,
    instanceId: `${playerId}-card-${index + 1}`,
  }));

/**
 * Comandante con el que se juega un mazo: el suyo de siempre, o el alternativo
 * de la misma facción si la partida lo pide.
 *
 * Se exige que coincida la facción: un comandante presta su pasiva al mazo
 * entero, y cruzarlos convertiría cualquier lista en la mejor de dos mundos.
 * Si el id no vale, se cae al de la baraja en lugar de reventar la partida.
 */
export const commanderForDeck = (deck: DeckDefinition, override?: string): CommanderDefinition => {
  const chosen = override ? COMMANDER_BY_ID[override] : undefined;
  if (chosen && chosen.faction === deck.faction) return chosen;
  const own = COMMANDER_BY_ID[deck.commanderId];
  if (!own) throw new Error(`Comandante desconocido: ${deck.commanderId}`);
  return own;
};

const createPlayer = (
  id: PlayerId,
  deck: DeckDefinition,
  seed: number,
  commanderOverride?: string,
): PlayerState => {
  const commander = commanderForDeck(deck, commanderOverride);
  const shuffled = shuffleSeeded(instantiateDeck(deck, id), seed);
  return {
    id,
    commanderId: commander.id,
    ...(commander.id === 'vainamoinen-el-cantor-eterno' ? { runo: 0 } : {}),
    nexusHealth: commander.nexusHealth,
    hand: shuffled.slice(0, OPENING_HAND_SIZE),
    deck: shuffled.slice(OPENING_HAND_SIZE),
    discard: [],
    resources: [],
    resourcePlayedThisTurn: false,
    spellsCastThisTurn: 0,
    towerLootUsedThisTurn: false,
    forgeBuffUsedThisTurn: false,
    nexusDamagedThisTurn: false,
    unitDiscountPending: false,
    firstUnitDeployedThisTurn: false,
    mulliganTaken: false,
    commanderPowerUsed: false,
    stats: { cardsPlayed: 0, damageDealt: 0 },
  };
};

/** Creates a deterministic match. Same decks + seed always produce the same opening hands. */
/** Ajustes opcionales de partida: hoy solo los usa la Torre del Nexo. */
export interface MatchSetup {
  /**
   * Vida con la que empieza cada Nexo, en vez de la del comandante. La Torre
   * encadena combates conservando la Vida que te queda, así que el segundo
   * piso no puede empezar con el marcador a tope.
   */
  readonly playerNexusHealth?: number;
  readonly aiNexusHealth?: number;
  /** Comandante alternativo de la misma facción para cada bando, si se ha elegido uno. */
  readonly playerCommanderId?: string;
  readonly aiCommanderId?: string;
}

/** Sustituye la Vida inicial del Nexo cuando la partida la fija por fuera. */
const withNexusHealth = (player: PlayerState, health?: number): PlayerState =>
  health === undefined ? player : { ...player, nexusHealth: Math.max(1, Math.trunc(health)) };

export const createMatch = (
  playerDeck: DeckDefinition,
  aiDeck: DeckDefinition,
  seed: number,
  setup: MatchSetup = {},
): MatchState => {
  const playerValidation = validateDeck(playerDeck);
  const aiValidation = validateDeck(aiDeck);
  if (!playerValidation.valid || !aiValidation.valid) {
    const reasons = [...playerValidation.issues, ...aiValidation.issues].map((issue) => issue.message);
    throw new Error(`No se puede iniciar una partida con mazos inválidos: ${reasons.join(' ')}`);
  }
  return {
    seed: Math.trunc(seed) >>> 0,
    nextId: 1,
    activePlayer: 'player',
    turn: 1,
    phase: 'main',
    players: {
      player: withNexusHealth(
        createPlayer('player', playerDeck, deriveSeed(seed, 1), setup.playerCommanderId),
        setup.playerNexusHealth,
      ),
      ai: withNexusHealth(
        createPlayer('ai', aiDeck, deriveSeed(seed, 2), setup.aiCommanderId),
        setup.aiNexusHealth,
      ),
    },
    board: [],
    tileEffects: [],
    terrain: generateTerrain(seed),
    animations: [],
    startedAtTurn: 1,
  };
};

const drawInternal = (state: MatchState, playerId: PlayerId): MatchState => {
  const current = state.players[playerId];
  // El cementerio conserva las instancias originales: reciclarlo no puede
  // duplicar unidades desplegadas ni fuentes que siguen pagando las jugadas.
  // nextId distingue cada robo y mantiene la baraja reproducible en replays/PvP.
  const player = current.deck.length === 0 && current.discard.length > 0
    ? {
      ...current,
      deck: shuffleSeeded(current.discard, deriveSeed(state.seed, state.nextId * 2 + (playerId === 'ai' ? 1 : 0))),
      discard: [],
    }
    : current;
  const card = player.deck[0];
  // Sin cartas recuperables tampoco hay fatiga ni se inventan nuevas copias.
  if (!card) return state;
  const next = withPlayer(state, playerId, {
    ...player,
    deck: player.deck.slice(1),
    hand: [...player.hand, card],
  });
  return enqueue(next, {
    type: 'draw', actorId: playerId, targetId: card.instanceId, effectId: 'draw-card', durationMs: 240,
  });
};

export const drawCard = (state: MatchState, playerId: PlayerId = state.activePlayer): ActionResult => {
  if (state.phase === 'finished') return fail(state, 'game-finished', 'La partida ya ha terminado.');
  if (playerId !== state.activePlayer) return fail(state, 'wrong-turn', 'Solo roba el jugador activo.');
  if (state.phase !== 'draw') return fail(state, 'wrong-phase', 'Solo se roba durante la fase de robo.');
  const drawn = drawInternal(state, playerId);
  return success(drawn.phase === 'finished' ? drawn : { ...drawn, phase: 'main' });
};

/** Applies the ordering chosen after a scry event to the currently revealed top cards. */
export const reorderTopCards = (
  state: MatchState,
  playerId: PlayerId,
  orderedInstanceIds: readonly string[],
): ActionResult => {
  const player = state.players[playerId];
  const revealed = player.deck.slice(0, orderedInstanceIds.length);
  const expectedIds = new Set(revealed.map((card) => card.instanceId));
  const chosenIds = new Set(orderedInstanceIds);
  if (
    orderedInstanceIds.length === 0 ||
    chosenIds.size !== orderedInstanceIds.length ||
    expectedIds.size !== chosenIds.size ||
    orderedInstanceIds.some((id) => !expectedIds.has(id))
  ) {
    return fail(state, 'card-not-found', 'El orden elegido no coincide con las cartas observadas.');
  }
  const byId = new Map(revealed.map((card) => [card.instanceId, card]));
  const ordered = orderedInstanceIds.map((id) => byId.get(id)).filter((card): card is CardInstance => Boolean(card));
  return success(withPlayer(state, playerId, {
    ...player,
    deck: [...ordered, ...player.deck.slice(ordered.length)],
  }));
};

const pieceDefinition = (piece: BoardPiece): CardDefinition | undefined => {
  const card = CARD_BY_ID[piece.cardId];
  if (card && piece.statuses.some((status) => status.kind === 'silenced')) return { ...card, effects: [], keywords: [] };
  return card && piece.sparkFace ? { ...card, effects: sparkEffects(card.effects, piece.sparkFace) } : card;
};
/** El daño permanente de Tuonela y las mejoras de Vida cambian el máximo,
 * no solo la cifra actual: curar contra la carta impresa los borraba. */
const maximumPieceHealth = (piece: BoardPiece): number => {
  const card = pieceDefinition(piece);
  return Math.max(0, (card?.health ?? card?.resistance ?? piece.currentHealth)
    + (piece.formationHealthApplied ?? 0) + (piece.permanentHealthBonus ?? 0) - (piece.permanentHealthPenalty ?? 0));
};
const pieceAt = (state: MatchState, position: Position): BoardPiece | undefined =>
  state.board.find((piece) => piece.position.x === position.x && piece.position.y === position.y);
const isFrozen = (state: MatchState, piece: BoardPiece): boolean =>
  piece.statuses.some((status) => status.kind === 'frozen' && status.expiresOnTurn > state.turn);

/** Aturdida: no puede atacar este turno, pero sí moverse (Congelado bloquea ambas). */
const isStunned = (state: MatchState, piece: BoardPiece): boolean =>
  piece.statuses.some((status) => status.kind === 'stunned' && status.expiresOnTurn > state.turn);

const pathIsClear = (
  state: MatchState,
  from: Position,
  to: Position,
  ignoredPieceId?: string,
  passAllyOwner?: PlayerId,
): boolean => {
  if (from.x !== to.x && from.y !== to.y) return false;
  const dx = Math.sign(to.x - from.x);
  const dy = Math.sign(to.y - from.y);
  let x = from.x + dx;
  let y = from.y + dy;
  while (x !== to.x || y !== to.y) {
    if (state.board.some((piece) => piece.instanceId !== ignoredPieceId && piece.position.x === x && piece.position.y === y && piece.owner !== passAllyOwner)) {
      return false;
    }
    // Las ruinas son parte del mapa: tapan el paso y cortan la línea de tiro
    // igual que lo haría una unidad plantada en medio.
    if (isBlocked(state, { x, y })) return false;
    x += dx;
    y += dy;
  }
  return true;
};

/**
 * Palabras clave efectivas de una pieza: las suyas de siempre más las que le
 * haya prestado un hechizo este turno. Todo lo que dependa de una palabra
 * clave en combate debe pasar por aquí, no por `card.keywords`, o los
 * préstamos temporales no se notarían.
 */
const hasKeyword = (piece: BoardPiece, keyword: Keyword): boolean => {
  if (piece.statuses.some((status) => status.kind === 'silenced')) return false;
  const card = pieceDefinition(piece);
  if (card?.keywords.includes(keyword)) return true;
  if (piece.grantedKeywords?.includes(keyword)) return true;
  // Furor de Fimbul: el Draugr del Túmulo presta Perforar mientras esté
  // malherido. Es un préstamo condicionado a su propia Vida, no a un turno,
  // así que va aparte de `grantedKeywords` (que caduca con el turno).
  if (
    keyword === 'pierce'
    && card
    && isFurious(piece, card)
    && card.effects.some((effect) => effect.kind === 'passive' && effect.id === 'furor-grant-pierce')
  ) {
    return true;
  }
  return false;
};

/**
 * Vínculo vital, contando la pasiva de Veyra: bajo su mando TODAS las
 * unidades voladoras lo tienen, aunque su carta no lo diga. Va aparte de
 * `hasKeyword` porque depende del comandante, no de la pieza.
 */
/** Guardiana de la Tumba: lleva mil años ahí y no hay forma de aturdirla. */
const isStunImmune = (state: MatchState, pieceId: string): boolean => {
  const piece = state.board.find((candidate) => candidate.instanceId === pieceId);
  return Boolean(
    piece && pieceDefinition(piece)?.effects.some(
      (effect) => effect.kind === 'passive' && effect.id === 'stun-immune',
    ),
  );
};

const hasLifelink = (state: MatchState, piece: BoardPiece, ownerId: PlayerId): boolean =>
  hasKeyword(piece, 'lifelink')
  || (state.players[ownerId].commanderId === 'veyra-espada-consagrada' && hasKeyword(piece, 'flying'))
  // Marea — el Heraldo de la Corriente solo drena con el agua alta.
  || (tidePhase(state) === 'high'
    && (pieceDefinition(piece)?.effects.some(
      (effect) => effect.kind === 'passive' && effect.id === 'lifelink-if-high-tide',
    ) ?? false));

/**
 * Guardia: mientras una unidad enemiga esté adyacente a un Guardia, solo puede
 * atacar a ese Guardia (protege al resto de piezas y al Nexo). Devuelve el
 * conjunto de ids de Guardias enemigos adyacentes al atacante, si los hay.
 */
const adjacentEnemyGuards = (state: MatchState, attacker: BoardPiece): Set<string> => {
  const guards = new Set<string>();
  for (const piece of state.board) {
    if (piece.owner === attacker.owner) continue;
    if (distance(piece.position, attacker.position) === 1 && hasKeyword(piece, 'guard')) {
      guards.add(piece.instanceId);
    }
  }
  return guards;
};

/** Guardián Escarchado: las unidades enemigas adyacentes a él no pueden atacar. */
const isPacified = (state: MatchState, attacker: BoardPiece): boolean =>
  state.board.some(
    (piece) =>
      piece.owner !== attacker.owner &&
      distance(piece.position, attacker.position) === 1 &&
      pieceDefinition(piece)?.effects.some((effect) => effect.kind === 'passive' && effect.id === 'pacify-adjacent-enemies'),
  );

/** Titán Encadenado (Olimpo): no puede atacar hasta que la Hybris de su dueño llegue al mínimo que pide su carta. */
const blockedByLowHybris = (state: MatchState, attacker: BoardPiece): boolean => {
  const requirement = pieceDefinition(attacker)?.effects.find(
    (effect) => effect.kind === 'passive' && effect.id === 'hybris-attack-requirement',
  );
  if (requirement?.kind !== 'passive') return false;
  return (state.players[attacker.owner].hybris ?? 0) < (requirement.value ?? 0);
};

const canMovePiece = (state: MatchState, piece: BoardPiece, to: Position): boolean => {
  const definition = pieceDefinition(piece);
  if (!definition || definition.type !== 'unit' || piece.owner !== state.activePlayer) return false;
  if (definition.effects.some((effect) => effect.kind === 'passive' && effect.id === 'cannot-move')) return false;
  if (piece.movedThisTurn || isFrozen(state, piece) || !isInsideBoard(to) || pieceAt(state, to)) return false;
  // Ni siquiera los voladores aterrizan sobre escombros.
  if (isBlocked(state, to)) return false;
  // Marea — el Ahogado Rencoroso vuelve con la marea baja: en Bajamar entra
  // con Impulso, así que puede atacar el mismo turno en que se despliega.
  const tideImpulse = tidePhase(state) === 'low'
    && definition.effects.some((effect) => effect.kind === 'passive' && effect.id === 'entry-impulse-if-low-tide');
  if (piece.enteredOnTurn === state.turn && !definition.keywords.includes('impulse') && !tideImpulse && !piece.formationMarch) return false;
  // Horror Abisal: ralentiza a los enemigos que atacó, sin bajar de 0.
  const movementAura = state.board.filter((ally) => ally.owner === piece.owner && !ally.statuses.some((status) => status.kind === 'silenced') &&
    (ally.cardId === 'tobogan-de-tubos' || ally.cardId === 'camino-espanol' ||
      (ally.cardId === 'tambor-del-tercio' && distance(ally.position, piece.position) === 1))).length;
  const movement = piece.formationMarch ? 1 : Math.max(0, (definition.movement ?? 1) - (piece.movementModifier ?? 0) + movementAura);
  const travel = distance(piece.position, to);
  if (travel <= 0 || travel > movement) return false;
  // Volador: ignora las piezas del camino (pero no puede aterrizar en casilla ocupada).
  if (definition.keywords.includes('flying')) return true;
  const bridge = state.board.some((ally) => ally.owner === piece.owner && ally.cardId === 'puente-sobre-el-escalda');
  return pathIsClear(state, piece.position, to, piece.instanceId, bridge ? piece.owner : undefined);
};

export const getValidMoves = (state: MatchState, pieceId: string): readonly Position[] => {
  const piece = state.board.find((candidate) => candidate.instanceId === pieceId);
  if (!piece || state.phase === 'finished') return [];
  const positions: Position[] = [];
  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      const to = { x, y };
      if (canMovePiece(state, piece, to)) positions.push(to);
    }
  }
  return positions;
};

export interface DecisionOption {
  readonly pieceId?: string;
  readonly to?: Position;
  readonly axis?: 'row' | 'column';
  readonly index?: number;
}

export const decisionOptions = (state: MatchState, decision: BoardDecision): readonly DecisionOption[] => {
  if (decision.kind === 'line') {
    return (decision.rowsOnly ? ['row'] as const : ['row', 'column'] as const).flatMap((axis) =>
      Array.from({ length: BOARD_SIZE }, (_, index) => ({ axis, index })));
  }
  const units = state.board.filter((piece) => pieceDefinition(piece)?.type === 'unit' && !decision.chosenIds.includes(piece.instanceId)
    && (decision.kind === 'sink' ? piece.owner !== decision.owner : piece.owner === decision.owner));
  const options: DecisionOption[] = [];
  for (const piece of units) {
    const card = pieceDefinition(piece)!;
    if (decision.kind === 'sink') {
      if (card.effects.some((effect) => effect.kind === 'passive' && effect.id === 'enemy-spell-immune')) continue;
      if (decision.adjacent && decision.anchor && distance(piece.position, decision.anchor) !== 1) continue;
      options.push({ pieceId: piece.instanceId });
    } else if (decision.kind === 'formation') options.push({ pieceId: piece.instanceId });
    else if (!card.effects.some((effect) => effect.kind === 'passive' && effect.id === 'cannot-move')) {
      const bridge = state.board.some((ally) => ally.owner === piece.owner && ally.cardId === 'puente-sobre-el-escalda');
      for (let y = 0; y < BOARD_SIZE; y += 1) for (let x = 0; x < BOARD_SIZE; x += 1) {
        const to = { x, y };
        const travel = distance(piece.position, to);
        if (travel <= 0 || travel > (decision.distance ?? 1) || pieceAt(state, to) || isBlocked(state, to)) continue;
        if (hasKeyword(piece, 'flying') || pathIsClear(state, piece.position, to, piece.instanceId, bridge ? piece.owner : undefined)) options.push({ pieceId: piece.instanceId, to });
      }
    }
  }
  return options;
};

const queueDecision = (state: MatchState, owner: PlayerId, sourceCardId: string, decision: Omit<BoardDecision, 'id' | 'owner' | 'sourceCardId' | 'chosenIds'>): MatchState => {
  const queued: BoardDecision = { ...decision, id: `decision-${state.nextId}`, owner, sourceCardId, chosenIds: [] };
  if (!decisionOptions(state, queued).length) return state;
  return { ...state, nextId: state.nextId + 1, pendingDecisions: [...(state.pendingDecisions ?? []), queued] };
};

/** Espectro Siniestro: incorpóreo, ningún Guardia enemigo puede obligarlo a atacarlo a él. */
const ignoresGuards = (definition: CardDefinition): boolean =>
  definition.effects.some((effect) => effect.kind === 'passive' && effect.id === 'unblockable-ghost');

const canAttackPiece = (state: MatchState, attacker: BoardPiece, defender: BoardPiece): boolean => {
  if (state.players[attacker.owner].attacksForbiddenThisTurn) return false;
  const definition = pieceDefinition(attacker);
  if (!definition || definition.type !== 'unit' || attacker.owner !== state.activePlayer) return false;
  if (attacker.owner === defender.owner || attacker.attackedThisTurn || isFrozen(state, attacker)) return false;
  if (isStunned(state, attacker)) return false;
  if (attacker.enteredOnTurn === state.turn && !definition.keywords.includes('swift-strike') && !attacker.formationMarch) return false;
  if (isPacified(state, attacker)) return false;
  if (blockedByLowHybris(state, attacker)) return false;
  // Guardia: si hay Guardias enemigos adyacentes, el objetivo debe ser uno de ellos (salvo incorpóreos).
  const guards = adjacentEnemyGuards(state, attacker);
  if (guards.size > 0 && !guards.has(defender.instanceId) && !ignoresGuards(definition)) return false;
  const range = definition.range ?? 1;
  const targetDistance = distance(attacker.position, defender.position);
  // Forja — la Artillera de Riel no dispara a bocajarro: tiene alcance MÍNIMO
  // además de máximo, que es lo que la obliga a mantener las distancias.
  const minRange = definition.effects.find(
    (effect) => effect.kind === 'passive' && effect.id === 'min-range',
  );
  if (minRange?.kind === 'passive' && targetDistance < (minRange.value ?? 2)) return false;
  return targetDistance > 0 && targetDistance <= range && (hasDischarge(state, attacker)
    ? dischargeLine(state, attacker, defender.position).clear
    : pathIsClear(state, attacker.position, defender.position, attacker.instanceId));
};

const canAttackEnemyNexus = (state: MatchState, attacker: BoardPiece): boolean => {
  if (state.players[attacker.owner].attacksForbiddenThisTurn) return false;
  const definition = pieceDefinition(attacker);
  if (!definition || definition.type !== 'unit' || attacker.owner !== state.activePlayer) return false;
  if (attacker.attackedThisTurn || isFrozen(state, attacker)) return false;
  if (isStunned(state, attacker)) return false;
  if (attacker.enteredOnTurn === state.turn && !definition.keywords.includes('swift-strike') && !attacker.formationMarch) return false;
  if (isPacified(state, attacker)) return false;
  if (blockedByLowHybris(state, attacker)) return false;
  // Guardia: no se puede golpear el Nexo mientras un Guardia enemigo esté adyacente (salvo incorpóreos).
  if (adjacentEnemyGuards(state, attacker).size > 0 && !ignoresGuards(definition)) return false;
  const enemy = opponentOf(attacker.owner);
  const target = { x: attacker.position.x, y: nexusRow(enemy) };
  const range = definition.range ?? 1;
  return distance(attacker.position, target) <= range && (pathIsClear(state, attacker.position, target, attacker.instanceId)
    || (hasDischarge(state, attacker) && dischargeLine(state, attacker, target).clear));
};

export const getValidAttacks = (state: MatchState, pieceId: string): ValidAttacks => {
  const attacker = state.board.find((piece) => piece.instanceId === pieceId);
  if (!attacker || state.phase === 'finished') return { pieceIds: [], canAttackNexus: false };
  return {
    pieceIds: state.board
      .filter((defender) => canAttackPiece(state, attacker, defender))
      .map((defender) => defender.instanceId),
    canAttackNexus: canAttackEnemyNexus(state, attacker),
  };
};

/**
 * Una unidad propia "veterana" habilita las 8 casillas a su alrededor como
 * despliegue adicional (más allá de la fila inicial) — así se puede reforzar
 * una posición avanzada sin mandar refuerzos a pie desde atrás cada vez. Debe
 * llevar al menos un turno en el tablero (`enteredOnTurn < state.turn`) o
 * haber actuado ya este turno (mover/atacar, p. ej. con Impulso): a propósito
 * para que no se pueda desplegar una unidad y usarla de ancla en el mismo
 * turno sin que haya hecho nada, lo que equivaldría a "teletransportar" un
 * despliegue entero a primera línea de golpe.
 */
const isVeteranAlly = (state: MatchState, piece: BoardPiece): boolean =>
  piece.enteredOnTurn < state.turn || piece.movedThisTurn || piece.attackedThisTurn;

export const getValidDeploymentPositions = (
  state: MatchState,
  playerId: PlayerId,
): readonly Position[] => {
  const row = deploymentRow(playerId);
  const positions = new Map<string, Position>();
  const add = (position: Position): void => {
    if (!isInsideBoard(position) || pieceAt(state, position)) return;
    // Sobre escombros no se despliega, igual que no se puede caminar por ellos.
    if (isBlocked(state, position)) return;
    positions.set(`${position.x},${position.y}`, position);
  };
  for (let x = 0; x < BOARD_SIZE; x += 1) add({ x, y: row });
  for (const piece of state.board) {
    if (piece.owner !== playerId || !isVeteranAlly(state, piece)) continue;
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        if (dx !== 0 || dy !== 0) add({ x: piece.position.x + dx, y: piece.position.y + dy });
      }
    }
  }
  return [...positions.values()];
};

const updatePiece = (
  state: MatchState,
  pieceId: string,
  transform: (piece: BoardPiece) => BoardPiece,
): MatchState => ({
  ...state,
  board: state.board.map((piece) => (piece.instanceId === pieceId ? transform(piece) : piece)),
});

interface DamageOutcome {
  readonly state: MatchState;
  /** Daño que atravesó reducciones y escudos y llegó de verdad a la Vida de la ficha. */
  readonly dealt: number;
  /** Vida que le quedaba justo antes del golpe: `dealt - healthBefore` es el exceso. */
  readonly healthBefore: number;
}

/**
 * Variante de `damagePiece` que además informa de cuánto daño acabó llegando.
 *
 * Hace falta para Perforar y Vínculo vital, que dependen del daño real —el que
 * queda tras reducciones y escudos—, no del que se anunció.
 */
const damagePieceDetailed = (
  state: MatchState,
  pieceId: string,
  amount: number,
  sourceOwner?: PlayerId,
  effectId = 'impact',
  /**
   * Casilla de la que vino el golpe, cuando la hay (combate cuerpo a cuerpo o
   * a distancia). Solo la usa la presentación: la ficha golpeada retrocede en
   * la dirección correcta en vez de hacia fuera del tablero.
   */
  origin?: Position,
  sourceCard?: CardDefinition,
): DamageOutcome => {
  const target = state.board.find((piece) => piece.instanceId === pieceId);
  if (!target || amount <= 0) return { state, dealt: 0, healthBefore: target?.currentHealth ?? 0 };
  if (sourceOwner && sourceCard?.type === 'instant' && sourceCard.subtype === 'Cataclismo') {
    amount += state.board.filter((piece) => piece.owner === sourceOwner && piece.cardId === 'maestranza-de-artilleria').length;
  }
  const targetDefinition = pieceDefinition(target);
  const reduction = targetDefinition?.effects.find(
    (effect) => effect.kind === 'passive' && effect.id === 'first-damage-reduction',
  );
  let reducedBy = 0;
  if (reduction?.kind === 'passive' && target.reductionUsedOnTurn !== state.turn) {
    reducedBy = Math.min(amount, reduction.value ?? 1);
  }
  const shield = target.statuses.find((status) => status.kind === 'shielded');
  const absorbedByShield = shield?.kind === 'shielded' ? Math.min(amount - reducedBy, shield.amount) : 0;
  let finalAmount = amount - reducedBy - absorbedByShield;
  const lastSquare = targetDefinition?.effects.some((effect) => effect.kind === 'passive' && effect.id === 'last-square-indestructible')
    && state.board.filter((ally) => ally.owner === target.owner && ally.instanceId !== target.instanceId && pieceDefinition(ally)?.type === 'unit' && distance(ally.position, target.position) === 1).length >= 2;
  const protectedFormation = state.players[target.owner].formationInvulnerableTurn === state.turn && hasFormation(target) && formationActive(state, target);
  if (lastSquare || protectedFormation) finalAmount = Math.min(finalAmount, Math.max(0, target.currentHealth - 1));
  let next: MatchState =
    reducedBy > 0
      ? updatePiece(state, pieceId, (piece) => ({ ...piece, reductionUsedOnTurn: state.turn }))
      : state;
  if (reducedBy > 0) {
    next = enqueue(next, {
      type: 'shield', targetId: pieceId, to: target.position, amount: reducedBy, effectId: 'water-shield', durationMs: 260,
    });
  }
  if (absorbedByShield > 0 && shield?.kind === 'shielded') {
    const remaining = shield.amount - absorbedByShield;
    next = updatePiece(next, pieceId, (piece) => ({
      ...piece,
      statuses: remaining > 0
        ? piece.statuses.map((status) => (status.kind === 'shielded' ? { kind: 'shielded', amount: remaining } : status))
        : piece.statuses.filter((status) => status.kind !== 'shielded'),
    }));
    next = enqueue(next, {
      type: 'shield', targetId: pieceId, to: target.position, amount: absorbedByShield, effectId: 'commander-order-shield', durationMs: 260,
    });
  }
  if (finalAmount <= 0) return { state: next, dealt: 0, healthBefore: target.currentHealth };
  next = {
    ...next,
    board: next.board.map((piece) =>
      piece.instanceId === pieceId ? { ...piece, currentHealth: piece.currentHealth - finalAmount } : piece,
    ),
  };
  if (sourceOwner) {
    const source = next.players[sourceOwner];
    next = withPlayer(next, sourceOwner, {
      ...source,
      stats: { ...source.stats, damageDealt: source.stats.damageDealt + finalAmount },
    });
  }
  next = enqueue(next, {
    type: 'damage', targetId: pieceId, from: origin, to: target.position, amount: finalAmount, effectId,
    cardId: sourceCard?.id, faction: sourceCard?.faction, targetCardId: target.cardId, durationMs: 300,
  });
  if (target.currentHealth - finalAmount <= 0) {
    const owner = next.players[target.owner];
    const dyingDefinition = pieceDefinition(target);
    const structureResistanceDrain = dyingDefinition?.type === 'structure'
      ? next.board.filter(
          (candidate) =>
            candidate.instanceId !== pieceId &&
            candidate.owner !== target.owner &&
            pieceDefinition(candidate)?.effects.some(
              (effect) => effect.kind === 'passive' && effect.id === 'devour-structure-resistance',
            ),
        )
      : [];
    // Plaga — Contagio: una pieza Infectada que muere NO va al cementerio de
    // su dueño, se convierte en un Zombi Contagiado bajo quien la infectó, en
    // su misma casilla. Va aquí, no en un solo punto de infección, porque
    // cualquier vía de muerte cuenta (combate, hechizo, drenaje del propio
    // Contagio al final del turno).
    const infection = target.statuses.find((status) => status.kind === 'infected');
    if (infection?.kind === 'infected') {
      const zombieCard = CARD_BY_ID['zombi-contagiado'];
      next = withPlayer(
        { ...next, board: next.board.filter((piece) => piece.instanceId !== pieceId) },
        target.owner,
        { ...owner, discard: [...owner.discard, { instanceId: target.instanceId, cardId: target.cardId }] },
      );
      if (zombieCard) {
        const zombiePiece: BoardPiece = {
          // La carta original puede reciclarse y volver a contagiarse mientras
          // su zombi anterior sigue existiendo: cada conversión necesita id propio.
          instanceId: `${target.instanceId}-plaga-zombie-${next.nextId}`,
          cardId: 'zombi-contagiado',
          owner: infection.infectorId,
          position: target.position,
          currentHealth: zombieCard.health ?? 2,
          attackModifier: 0,
          movedThisTurn: false,
          attackedThisTurn: false,
          enteredOnTurn: next.turn,
          statuses: [],
        };
        next = { ...next, board: [...next.board, zombiePiece] };
        next = enqueue(next, {
          type: 'summon', actorId: infection.infectorId, targetId: zombiePiece.instanceId,
          to: target.position, effectId: zombieCard.vfx.summonEffect, faction: 'plaga', durationMs: 440,
        });
      }
      // Horda sin Fin: crece cada vez que una Infectada enemiga suya muere así.
      for (const grower of next.board.filter(
        (piece) => piece.owner === infection.infectorId
          && pieceDefinition(piece)?.effects.some((effect) => effect.kind === 'passive' && effect.id === 'grow-on-infected-enemy-death'),
      )) {
        next = updatePiece(next, grower.instanceId, (piece) => ({
          ...piece,
          attackModifier: piece.attackModifier + 1,
          currentHealth: piece.currentHealth + 1,
          permanentAttackBonus: (piece.permanentAttackBonus ?? 0) + 1,
        }));
      }
      next = withPlayer(next, infection.infectorId, {
        ...next.players[infection.infectorId], infectedEnemyDiedThisTurn: true,
      });
    } else {
      next = withPlayer(
        { ...next, board: next.board.filter((piece) => piece.instanceId !== pieceId) },
        target.owner,
        {
          ...owner,
          discard: [
            ...owner.discard,
            { instanceId: target.instanceId, cardId: target.cardId, ...(target.renacerSpent ? { renacerSpent: true } : {}) },
          ],
        },
      );
    }
    next = enqueue(next, {
      type: 'destroy', targetId: pieceId, to: target.position, effectId: dyingDefinition?.vfx.deathEffect ?? 'card-destroy',
      cardId: target.cardId, targetCardId: target.cardId, faction: dyingDefinition?.faction, durationMs: 420,
    });
    // Devorador Entrópico: drena la Resistencia de una estructura enemiga destruida como Vida propia.
    for (const devourer of structureResistanceDrain) {
      const maxHealth = maximumPieceHealth(devourer);
      next = updatePiece(next, devourer.instanceId, (piece) => ({
        ...piece, currentHealth: Math.min(maxHealth, piece.currentHealth + (dyingDefinition?.resistance ?? 0)),
      }));
    }
    // Salón de los Caídos de Fimbul: mira si ha muerto una unidad PROPIA este
    // turno, sin importar cómo. Va aquí porque este es el único sitio por el
    // que pasa toda muerte del juego, venga de combate, de un hechizo o de
    // un barrido — cualquier otro punto de enganche dejaría fuera algún caso.
    if (dyingDefinition?.type === 'unit') {
      next = withPlayer(next, target.owner, { ...next.players[target.owner], unitDiedThisTurn: true });
    }
    // Samsara: cuenta de muertes propias del turno (Asceta, Avatar, Karma) +
    // pasiva de Indrayani (la primera muerte propia de cada turno roba 1) +
    // Renacer (la copia vuelve a la mano con +N/+N, solo una vez cada una).
    if (dyingDefinition?.type === 'unit') {
      const owner = target.owner;
      next = withPlayer(next, owner, {
        ...next.players[owner],
        unitsDiedThisTurn: (next.players[owner].unitsDiedThisTurn ?? 0) + 1,
        unitsDiedThisTurnLog: [...(next.players[owner].unitsDiedThisTurnLog ?? []), target.cardId],
      });
      if (!next.players[owner].firstUnitDeathDrawUsedThisTurn && next.players[owner].commanderId === 'indrayani-la-rueda') {
        next = withPlayer(next, owner, { ...next.players[owner], firstUnitDeathDrawUsedThisTurn: true });
        next = resolveDrawAndDiscard(next, owner, 1, 0);
      }
      const revive = dyingDefinition.effects.find((effect) => effect.kind === 'passive' && effect.id === 'revive-on-death');
      if (revive?.kind === 'passive' && !target.renacerSpent) {
        // Niño de la Flauta: +1/+1 adicional a toda revivificación de Renacer.
        const auraBonus = next.board.some(
          (ally) => ally.owner === owner && pieceDefinition(ally)?.effects.some(
            (effect) => effect.kind === 'passive' && effect.id === 'renacer-extra-buff',
          ),
        ) ? 1 : 0;
        // Pira del Ghat: la copia vuelve con el coste genérico 1 más barato.
        const costDiscount = next.board.some(
          (ally) => ally.owner === owner && pieceDefinition(ally)?.effects.some(
            (effect) => effect.kind === 'passive' && effect.id === 'renacer-cost-discount',
          ),
        ) ? 1 : 0;
        const bonus = (revive.value ?? 1) + auraBonus;
        next = withPlayer(next, owner, {
          ...next.players[owner],
          hand: [...next.players[owner].hand, {
            instanceId: `${target.instanceId}-renacer-${next.nextId}`,
            cardId: target.cardId,
            bonusAttack: bonus,
            bonusHealth: bonus,
            renacerSpent: true,
            ...(costDiscount > 0 ? { costDiscount } : {}),
          }],
        });
      }
    }
    // Nigromante Oscuro: roba una carta por cada unidad aliada propia que muere.
    if (dyingDefinition?.type === 'unit') {
      const necromancers = next.board.filter(
        (candidate) =>
          candidate.owner === target.owner &&
          pieceDefinition(candidate)?.effects.some(
            (effect) => effect.kind === 'passive' && effect.id === 'draw-on-ally-death',
          ),
      );
      for (let index = 0; index < necromancers.length; index += 1) {
        next = resolveDrawAndDiscard(next, target.owner, 1, 0);
      }
    }
    const deathRuno = dyingDefinition?.effects.find((effect) => effect.kind === 'passive' && effect.id === 'death-gain-runo');
    if (deathRuno?.kind === 'passive') next = gainRuno(next, target.owner, deathRuno.value ?? 1);
    const deathDraw = dyingDefinition?.effects.find((effect) => effect.kind === 'passive' && effect.id === 'death-draw');
    if (deathDraw?.kind === 'passive') next = resolveDrawAndDiscard(next, target.owner, deathDraw.value ?? 1, 0);
    for (const survivor of next.board.filter((piece) => piece.owner === target.owner && distance(piece.position, target.position) === 1 && pieceDefinition(piece)?.effects.some((effect) => effect.kind === 'passive' && effect.id === 'grow-on-adjacent-ally-death'))) {
      if (dyingDefinition?.type === 'unit') next = updatePiece(next, survivor.instanceId, (piece) => ({ ...piece,
        currentHealth: piece.currentHealth + 1, attackModifier: piece.attackModifier + 1,
        permanentAttackBonus: (piece.permanentAttackBonus ?? 0) + 1, permanentHealthBonus: (piece.permanentHealthBonus ?? 0) + 1,
      }));
    }
    // La pérdida de apoyo se resuelve antes de la explosión para que una
    // unidad sin cuadro no conserve Vida extra durante el daño en cadena.
    next = stabilizeFormation(next);
    // La pieza ya salió del tablero: una cadena de explosiones no puede
    // volver a destruirla ni disparar su Petardazo dos veces.
    const petardazo = dyingDefinition?.effects.find((effect) => effect.kind === 'passive' && effect.id === 'petardazo');
    if (petardazo?.kind === 'passive' || (target.grantedPetardazo && !target.statuses.some((status) => status.kind === 'silenced'))) {
      const splash = petardazo?.kind === 'passive' ? petardazo.value ?? 2 : 2;
      const neighbors = next.board.filter((piece) => distance(piece.position, target.position) === 1
        && pieceDefinition(piece)?.type === 'unit');
      for (const neighbor of neighbors) {
        next = damagePiece(next, neighbor.instanceId, splash, target.owner, 'goblin-petardazo', target.position, dyingDefinition);
      }
    }
    const nexusBlast = dyingDefinition?.effects.find((effect) => effect.kind === 'passive' && effect.id === 'death-damage-enemy-nexus');
    if (nexusBlast?.kind === 'passive' && dyingDefinition) next = damageEnemyNexus(next, target.owner, nexusBlast.value ?? 3, dyingDefinition, target.instanceId);
  }
  return { state: target.currentHealth - finalAmount <= 0 ? stabilizeFormation(next) : next, dealt: finalAmount, healthBefore: target.currentHealth };
};

const damagePiece = (
  state: MatchState,
  pieceId: string,
  amount: number,
  sourceOwner?: PlayerId,
  effectId = 'impact',
  /** Casilla de origen del golpe, si la hay: solo la usa la presentación. */
  origin?: Position,
  sourceCard?: CardDefinition,
): MatchState => damagePieceDetailed(state, pieceId, amount, sourceOwner, effectId, origin, sourceCard).state;

/** Los bonos de Vida no pueden quedar grabados al perder apoyos. La caída por
 * pérdida de Vida máxima usa la ruta de muerte habitual para encadenar otras
 * Formaciones y los disparadores de las piezas destruidas. */
const stabilizeFormation = (state: MatchState): MatchState => {
  if (!state.board.some((piece) => piece.currentHealth <= 0 || hasFormation(piece) || (piece.formationHealthApplied ?? 0) !== 0 || ['fragua-de-ilmarinen', 'el-pino-que-llega-al-cielo', 'fuerte-de-estrella'].includes(piece.cardId))) return state;
  const collapsing: string[] = [];
  const board = state.board.map((piece) => {
    const applied = piece.formationHealthApplied ?? 0;
    const wanted = continuousHealthBonus(state, piece);
    const health = piece.currentHealth + wanted - applied;
    if (applied === wanted && health > 0) return piece;
    if (health <= 0) collapsing.push(piece.instanceId);
    return { ...piece, currentHealth: Math.max(1, health), formationHealthApplied: wanted };
  });
  let next: MatchState = { ...state, board };
  for (const id of collapsing) {
    const victim = next.board.find((piece) => piece.instanceId === id);
    if (!victim) continue;
    // Escudos y reducción de daño no evitan que el máximo de Vida disminuya.
    next = updatePiece(next, id, (piece) => ({ ...piece, reductionUsedOnTurn: next.turn,
      statuses: piece.statuses.filter((status) => status.kind !== 'shielded') }));
    next = damagePiece(next, id, 1, undefined, 'formation-collapse');
  }
  return next;
};

/**
 * Daño al Nexo de un bando, con su contabilidad completa: estadística de daño
 * del atacante, marca de «ya sangró este turno» (pasiva de Kaela) y evento de
 * impacto. No decide la victoria: devuelve `lethal` para que quien llama la
 * declare donde le corresponda en su propia secuencia.
 *
 * Lo comparten el ataque directo al Nexo y el exceso de Perforar, para que las
 * dos vías apliquen exactamente las mismas reglas.
 */
const damageNexus = (
  state: MatchState,
  targetId: PlayerId,
  amount: number,
  sourceId: PlayerId,
  actorId: string,
  card: CardDefinition,
): { readonly state: MatchState; readonly lethal: boolean } => {
  if (amount <= 0) return { state, lethal: false };
  const target = state.players[targetId];
  const source = state.players[sourceId];
  const kaelaTriggers =
    COMMANDER_BY_ID[target.commanderId]?.id === 'kaela-corazon-caldera' && !target.nexusDamagedThisTurn;
  let next = withPlayer(state, targetId, {
    ...target,
    nexusHealth: Math.max(0, target.nexusHealth - amount),
    nexusDamagedThisTurn: true,
    unitDiscountPending: target.unitDiscountPending || kaelaTriggers,
  });
  next = withPlayer(next, sourceId, {
    ...source,
    stats: { ...source.stats, damageDealt: source.stats.damageDealt + amount },
  });
  next = enqueue(next, {
    type: 'nexus-damage', actorId, targetId: `${targetId}-nexus`, amount,
    cardId: card.id, faction: card.faction,
    effectId: card.vfx.impactEffect ?? `${card.faction}-nexus-impact`, durationMs: 440,
  });
  return { state: next, lethal: target.nexusHealth - amount <= 0 };
};

const damageEnemyNexus = (state: MatchState, owner: PlayerId, amount: number, card: CardDefinition, actorId: string): MatchState => {
  if (state.phase === 'finished') return state;
  const enemy = opponentOf(owner);
  const hit = damageNexus(state, enemy, amount, owner, actorId, card);
  if (!hit.lethal) return hit.state;
  return enqueue({ ...hit.state, phase: 'finished', winner: owner }, { type: 'victory', actorId: owner, targetId: `${enemy}-nexus`, effectId: `${card.faction}-victory`, durationMs: 900 });
};

/** Paladín Glorioso: sus aliados adyacentes no pueden ser congelados por ninguna vía. */
const isProtectedFromFreeze = (state: MatchState, pieceId: string): boolean => {
  const piece = state.board.find((candidate) => candidate.instanceId === pieceId);
  if (!piece) return false;
  return state.board.some(
    (ally) =>
      ally.owner === piece.owner &&
      ally.instanceId !== piece.instanceId &&
      distance(ally.position, piece.position) === 1 &&
      pieceDefinition(ally)?.effects.some((effect) => effect.kind === 'passive' && effect.id === 'protect-adjacent-from-freeze'),
  );
};

const addStatus = (
  state: MatchState,
  pieceId: string,
  duration: number,
): MatchState => {
  const target = state.board.find((piece) => piece.instanceId === pieceId);
  if (!target || isProtectedFromFreeze(state, pieceId)) return state;
  const expiresOnTurn = state.turn + Math.max(1, duration) * 2;
  let next = updatePiece(state, pieceId, (piece) => ({
    ...piece,
    statuses: [...piece.statuses.filter((status) => status.kind !== 'frozen'), { kind: 'frozen', expiresOnTurn }],
  }));
  next = enqueue(next, { type: 'freeze', targetId: pieceId, to: target.position, effectId: 'freeze-lock', durationMs: 360 });
  return next;
};

const requireTargetPiece = (
  state: MatchState,
  target: SpellTarget | undefined,
): BoardPiece | undefined =>
  target?.kind === 'piece'
    ? state.board.find((piece) => piece.instanceId === target.pieceId)
    : undefined;

/** Cuántas veces por turno puede cobrarse el peaje de Orén. */
const OREN_TOLL_CAP = 2;

/**
 * Pasiva de Orén, el Tercer Luto: cada cura de tu Nexo le cuesta 1 de Vida al
 * enemigo, hasta dos veces por turno.
 *
 * Resta directamente en lugar de pasar por `applyNexusDrain` a propósito: ese
 * helper CURA al atacante por lo drenado, y curar dentro de la propia cura
 * sería una recursión infinita.
 */
const applyOrenToll = (state: MatchState, playerId: PlayerId): MatchState => {
  const player = state.players[playerId];
  if (player.commanderId !== 'oren-el-tercer-luto') return state;
  if ((player.commanderDrainCountThisTurn ?? 0) >= OREN_TOLL_CAP) return state;
  const enemyId = opponentOf(playerId);
  const enemy = state.players[enemyId];
  if (enemy.nexusHealth <= 0) return state;
  let next = withPlayer(state, playerId, {
    ...player,
    commanderDrainCountThisTurn: (player.commanderDrainCountThisTurn ?? 0) + 1,
  });
  next = withPlayer(next, enemyId, { ...enemy, nexusHealth: enemy.nexusHealth - 1, nexusDamagedThisTurn: true });
  next = enqueue(next, {
    type: 'nexus-damage', actorId: playerId, targetId: `${enemyId}-nexus`,
    amount: 1, effectId: 'commander-shadow-drain', durationMs: 320,
  });
  if (next.players[enemyId].nexusHealth <= 0) {
    next = { ...next, winner: playerId, phase: 'finished' };
    next = enqueue(next, {
      type: 'victory', actorId: playerId, targetId: `${enemyId}-nexus`, effectId: 'shadow-victory', durationMs: 900,
    });
  }
  return next;
};

/** Cura el Nexo propio sin superar el máximo del comandante. */
const healNexus = (state: MatchState, playerId: PlayerId, amount: number): MatchState => {
  if (amount <= 0) return state;
  const player = state.players[playerId];
  const maximum = COMMANDER_BY_ID[player.commanderId]?.nexusHealth ?? 35;
  const healed = Math.min(maximum, player.nexusHealth + amount);
  const next = withPlayer(state, playerId, { ...player, nexusHealth: healed });
  // Con el Nexo ya al máximo no hay cura de verdad, así que Orén no cobra.
  return healed > player.nexusHealth ? applyOrenToll(next, playerId) : next;
};

/**
 * Pasiva de Síalu, Lengua de Hielo: la primera vez que su bando congela o
 * aturde a una unidad cada turno, roba 1 carta.
 *
 * Se comprueba sobre el estado YA modificado: un congelar que no llegó a
 * prender (el Paladín Glorioso protege a sus aliados) no cuenta como tal.
 */
const applySialuDraw = (state: MatchState, playerId: PlayerId, pieceId: string): MatchState => {
  const player = state.players[playerId];
  if (player.commanderId !== 'sialu-lengua-de-hielo' || player.commanderControlDrawUsedThisTurn) return state;
  const piece = state.board.find((candidate) => candidate.instanceId === pieceId);
  const landed = piece?.statuses.some((status) => status.kind === 'frozen' || status.kind === 'stunned');
  if (!landed) return state;
  const next = withPlayer(state, playerId, { ...player, commanderControlDrawUsedThisTurn: true });
  return drawInternal(next, playerId);
};

/**
 * Si un hechizo necesita señalar una ficha del tablero para resolverse.
 *
 * Fuente única de verdad: antes `ai.ts` y `battleHints.ts` mantenían cada uno
 * su propia copia de esta lista a mano, y se desincronizaron — a Maldición
 * Sombra (`curse-drain-health`) se le añadió aquí el requisito de objetivo
 * pero nunca se propagó a esas dos copias. La IA intentaba lanzarla sin
 * objetivo, el motor la rechazaba, y como seguía siendo su mejor jugada cada
 * turno, la repetía indefinidamente turno tras turno sin que la partida
 * avanzara nunca — un jugador humano con esa carta se topaba con el mismo
 * rechazo al intentar «Resolver carta» directamente, porque la interfaz
 * tampoco sabía que hacía falta apuntar.
 */
export const spellNeedsPiece = (card: CardDefinition): boolean =>
  !card.effects.some((effect) => effect.kind === 'spark') && card.effects.some(
    (effect) =>
      effect.kind === 'damage' ||
      effect.kind === 'sink' ||
      effect.kind === 'freeze' ||
      effect.kind === 'scorch' ||
      effect.kind === 'refresh-move' ||
      effect.kind === 'refresh-attack' ||
      effect.kind === 'stun' ||
      effect.kind === 'push-target' ||
      effect.kind === 'grant-keyword' ||
      effect.kind === 'grant-formation' || effect.kind === 'heal-unit' || effect.kind === 'silence-unit' || effect.kind === 'mine-structure' ||
      (effect.kind === 'passive' && effect.id === 'curse-drain-health') ||
      (effect.kind === 'passive' && effect.id === 'target-attack-until-end') ||
      (effect.kind === 'passive' && effect.id === 'target-permanent-buff') ||
      (effect.kind === 'passive' && (effect.id === 'target-shield' || effect.id === 'target-petardazo')) ||
      (effect.kind === 'passive' && effect.id === 'sacrifice-return-buffed'),
  );

const resolveDrawAndDiscard = (
  state: MatchState,
  playerId: PlayerId,
  draw: number,
  discard: number,
): MatchState => {
  let next = state;
  for (let index = 0; index < draw; index += 1) next = drawInternal(next, playerId);
  if (discard <= 0) return next;
  const player = next.players[playerId];
  const discardCount = Math.min(discard, player.hand.length);
  const discarded = player.hand.slice(0, discardCount);
  return withPlayer(next, playerId, {
    ...player,
    hand: player.hand.slice(discardCount),
    discard: [...player.discard, ...discarded],
  });
};

const resolveSpell = (
  state: MatchState,
  caster: PlayerId,
  card: CardDefinition,
  target: SpellTarget | undefined,
  offered = false,
): MatchState => {
  let next = state;
  const initialTarget = requireTargetPiece(next, target);
  const frozenAtCast = initialTarget ? isFrozen(next, initialTarget) : false;
  let draws = 0;
  let discards = 0;
  let damageDealt = 0;
  const alliedUnitIdsAtCast = state.board.filter((piece) => piece.owner === caster && pieceDefinition(piece)?.type === 'unit').map((piece) => piece.instanceId);
  // Duna: las ramas de Ofrenda y Juicio se podan aquí, así que el bucle no se
  // entera de que existen.
  for (const effect of activeEffects(card, { offered, judged: isUnderJudgement(next, caster), hasMandate: next.mandate === caster, tide: tidePhase(next), structures: countStructures(next, caster) })) {
    if (next.phase === 'finished') break;
    const targetPiece = requireTargetPiece(next, target);
    if (effect.kind === 'grant-formation' && targetPiece) {
      const already = hasFormation(targetPiece);
      next = updatePiece(next, targetPiece.instanceId, (piece) => ({ ...piece, grantedFormation: true,
        currentHealth: piece.currentHealth + (already ? 2 : 0), permanentHealthBonus: (piece.permanentHealthBonus ?? 0) + (already ? 2 : 0),
      }));
      next = stabilizeFormation(next);
    } else if (effect.kind === 'heal-unit' && targetPiece) {
      const maximum = maximumPieceHealth(targetPiece);
      next = updatePiece(next, targetPiece.instanceId, (piece) => ({ ...piece, currentHealth: Math.max(piece.currentHealth, Math.min(maximum, piece.currentHealth + effect.amount)) }));
      if (effect.nexusRunoThreshold !== undefined && (next.players[caster].runo ?? 0) >= effect.nexusRunoThreshold) next = healNexus(next, caster, effect.amount);
    } else if (effect.kind === 'silence-unit' && targetPiece) {
      next = updatePiece(next, targetPiece.instanceId, (piece) => ({ ...piece, statuses: [...piece.statuses.filter((status) => status.kind !== 'silenced'), { kind: 'silenced', expiresOnTurn: next.turn + 1 }] }));
      next = stabilizeFormation(next);
    } else if (effect.kind === 'mine-structure' && targetPiece) {
      const center = targetPiece.position;
      const shield = targetPiece.statuses.find((status) => status.kind === 'shielded');
      const reduction = pieceDefinition(targetPiece)?.effects.find((candidate) => candidate.kind === 'passive' && candidate.id === 'first-damage-reduction');
      const lethal = targetPiece.currentHealth + (shield?.amount ?? 0) + (reduction?.kind === 'passive' && targetPiece.reductionUsedOnTurn !== next.turn ? reduction.value ?? 1 : 0);
      next = damagePiece(next, targetPiece.instanceId, lethal, caster, card.vfx.impactEffect, undefined, card);
      for (const victim of next.board.filter((piece) => pieceDefinition(piece)?.type === 'unit' && distance(piece.position, center) === 1)) next = damagePiece(next, victim.instanceId, effect.splash, caster, card.vfx.impactEffect, center, card);
    } else if (effect.kind === 'boost-discharge') {
      next = withPlayer(next, caster, { ...next.players[caster], dischargeDamageBonusThisTurn: (next.players[caster].dischargeDamageBonusThisTurn ?? 0) + effect.amount });
    } else if (effect.kind === 'forbid-own-attacks') {
      next = withPlayer(next, caster, { ...next.players[caster], attacksForbiddenThisTurn: true });
    } else if (effect.kind === 'rocroi') {
      next = withPlayer(next, caster, { ...next.players[caster], formationInvulnerableTurn: next.turn, rocroiEndDamage: (next.players[caster].rocroiEndDamage ?? 0) + 2 });
    } else if (effect.kind === 'formation-march' || effect.kind === 'formation-protection') {
      for (const unit of next.board.filter((piece) => piece.owner === caster && hasFormation(piece) && formationActive(next, piece))) {
        if (effect.kind === 'formation-march') next = updatePiece(next, unit.instanceId, (piece) => ({ ...piece, formationMarch: true, movedThisTurn: false, attackedThisTurn: false }));
        else next = updatePiece(next, unit.instanceId, (piece) => ({ ...piece, statuses: [
          ...piece.statuses.filter((status) => status.kind !== 'shielded' && status.kind !== 'anchored'),
          { kind: 'shielded', amount: Math.max(effect.amount, piece.statuses.find((status) => status.kind === 'shielded')?.amount ?? 0) },
          { kind: 'anchored', expiresOnTurn: next.turn + 2 },
        ] }));
      }
    } else if (effect.kind === 'choose-formation') {
      next = queueDecision(next, caster, card.id, { kind: 'formation', remaining: effect.count, optional: false });
    } else if (effect.kind === 'choose-moves') {
      next = queueDecision(next, caster, card.id, { kind: 'move', remaining: effect.count, optional: true, distance: effect.distance });
    } else if (effect.kind === 'choose-sinks') {
      next = queueDecision(next, caster, card.id, { kind: 'sink', remaining: effect.count, optional: true, adjacent: effect.adjacent });
    } else if (effect.kind === 'choose-line') {
      next = queueDecision(next, caster, card.id, { kind: 'line', remaining: 1, optional: false, amount: effect.amount, enemiesOnly: effect.enemiesOnly, unitsOnly: effect.unitsOnly, rowsOnly: effect.rowsOnly });
    } else if (effect.kind === 'passive' && effect.id === 'draw-own-casualties') {
      draws += alliedUnitIdsAtCast.filter((id) => !next.board.some((piece) => piece.instanceId === id)).length;
    } else if (effect.kind === 'damage-enemy-nexus') {
      next = damageEnemyNexus(next, caster, effect.amount, card, caster);
    } else if (effect.kind === 'passive' && effect.id === 'gain-runo-per-spell') {
      next = gainRuno(next, caster, next.players[caster].spellsCastThisTurn);
    } else if (effect.kind === 'gain-runo') {
      next = gainRuno(next, caster, effect.amount);
    } else if (effect.kind === 'sink-low-health') {
      for (const victim of next.board.filter((piece) => piece.owner !== caster && pieceDefinition(piece)?.type === 'unit' && piece.currentHealth <= effect.maximumHealth)) {
        next = sinkUnit(next, victim);
      }
      next = stabilizeFormation(next);
    } else if (effect.kind === 'grant-petardazo-all') {
      next = grantPetardazoAll(next, caster);
    } else if (effect.kind === 'sink' && targetPiece) {
      next = stabilizeFormation(sinkUnit(next, targetPiece));
    } else if (effect.kind === 'damage' && targetPiece) {
      const bonus = frozenAtCast
        ? card.effects.find((candidate) => candidate.kind === 'passive' && candidate.id === 'frozen-bonus-damage')
        : undefined;
      // Marea — la sal escuece sobre lo ya abierto: si el objetivo llega herido
      // (menos Vida de la que tiene la carta), el daño sube.
      const targetDefinition = pieceDefinition(targetPiece);
      const alreadyWounded = targetDefinition ? targetPiece.currentHealth < maximumPieceHealth(targetPiece) : false;
      const woundBonus = alreadyWounded
        ? card.effects.find((candidate) => candidate.kind === 'passive' && candidate.id === 'bonus-damage-wounded-target')
        : undefined;
      const bonusDamage = (bonus?.kind === 'passive' ? bonus.value ?? 0 : 0)
        + (woundBonus?.kind === 'passive' ? woundBonus.value ?? 0 : 0);
      const before = targetPiece.currentHealth;
      next = damagePiece(next, targetPiece.instanceId, effect.amount + bonusDamage, caster, card.vfx.impactEffect, undefined, card);
      damageDealt += Math.min(effect.amount + bonusDamage, before);
    } else if (effect.kind === 'damage-all-enemies') {
      const enemy = opponentOf(caster);
      for (const piece of next.board.filter(
        (candidate) => (candidate.owner === enemy || effect.includeAllies) && pieceDefinition(candidate)?.type === 'unit',
      )) {
        const before = piece.currentHealth;
        next = damagePiece(next, piece.instanceId, effect.amount, caster, card.vfx.impactEffect, undefined, card);
        damageDealt += Math.min(effect.amount, before);
        if (effect.scorch) {
          const expiresOnTurn = state.turn + 2;
          next = {
            ...next,
            tileEffects: [
              ...next.tileEffects.filter((tile) => tile.position.x !== piece.position.x || tile.position.y !== piece.position.y),
              { kind: 'scorched', position: piece.position, sourceOwner: caster, expiresOnTurn },
            ],
          };
        }
      }
    } else if (effect.kind === 'destroy-all-enemy-structures') {
      const enemy = opponentOf(caster);
      const structures = next.board.filter((piece) => piece.owner === enemy && pieceDefinition(piece)?.type === 'structure');
      let gainedEssence = 0;
      for (const structure of structures) {
        gainedEssence += pieceDefinition(structure)?.resistance ?? 0;
        next = damagePiece(next, structure.instanceId, structure.currentHealth, caster, card.vfx.impactEffect, undefined, card);
      }
      if (effect.gainEssencePerResistance && gainedEssence > 0) {
        const player = next.players[caster];
        const newResources = Array.from({ length: gainedEssence }, (_, index) => ({
          instanceId: `${caster}-void-essence-${next.nextId + index}`,
          cardId: card.id, faction: card.faction, exhausted: false,
        }));
        next = { ...next, nextId: next.nextId + gainedEssence };
        next = withPlayer(next, caster, { ...player, resources: [...player.resources, ...newResources] });
      }
    } else if (effect.kind === 'freeze' && targetPiece) {
      next = addStatus(next, targetPiece.instanceId, effect.duration);
      next = applySialuDraw(next, caster, targetPiece.instanceId);
    } else if (effect.kind === 'passive' && effect.id === 'freeze-all-enemies') {
      // Eclipse del Dragón (Jade): congela TODAS las unidades enemigas a la vez.
      const duration = effect.value ?? 1;
      for (const enemy of next.board.filter(
        (piece) => piece.owner !== caster && pieceDefinition(piece)?.type === 'unit',
      )) {
        next = addStatus(next, enemy.instanceId, duration);
      }
    } else if (effect.kind === 'buff-automata') {
      next = windUpAutomata(next, caster, effect.attack);
      if (effect.health) {
        // Mismo criterio que la Hybris de Olimpo: la Vida permanente se suma a
        // la actual. No hay campo de «Vida máxima» en la pieza, así que subir
        // el tope sin curar no se podría representar.
        const extra = effect.health;
        for (const piece of next.board.filter((candidate) => candidate.owner === caster && isAutomaton(candidate))) {
          next = updatePiece(next, piece.instanceId, (target) => ({
            ...target,
            currentHealth: target.currentHealth + extra,
          }));
        }
      }
    } else if (effect.kind === 'restore-structures') {
      next = {
        ...next,
        board: next.board.map((piece) => {
          if (piece.owner !== caster) return piece;
          const definition = CARD_BY_ID[piece.cardId];
          if (definition?.type !== 'structure') return piece;
          return { ...piece, currentHealth: definition.resistance ?? piece.currentHealth };
        }),
      };
    } else if (effect.kind === 'push-target' && targetPiece) {
      next = stabilizeFormation(pushOne(next, caster, targetPiece.instanceId, effect.amount, effect.toward ?? 'away'));
    } else if (effect.kind === 'push-all-enemies') {
      const pushed = pushAll(next, caster, effect.amount, effect.toward, stabilizeFormation);
      next = pushed.state;
      if (effect.stunIfBlocked) {
        // Las que no tuvieron hueco donde ir quedan aturdidas: el remolino no
        // las mueve, pero tampoco las deja atacar.
        for (const blockedId of pushed.blocked) {
          if (isStunImmune(next, blockedId)) continue;
          next = updatePiece(next, blockedId, (piece) => ({
            ...piece,
            statuses: [
              ...piece.statuses.filter((status) => status.kind !== 'stunned'),
              { kind: 'stunned', expiresOnTurn: state.turn + 2 },
            ],
          }));
        }
      }
    } else if (effect.kind === 'stun' && targetPiece && !isStunImmune(next, targetPiece.instanceId)) {
      // Mismo cálculo que el aturdir de combate: turno + 2 cubre exactamente
      // el siguiente turno de su dueño, ni más ni menos.
      next = updatePiece(next, targetPiece.instanceId, (piece) => ({
        ...piece,
        statuses: [
          ...piece.statuses.filter((status) => status.kind !== 'stunned'),
          { kind: 'stunned', expiresOnTurn: state.turn + 2 },
        ],
      }));
      next = enqueue(next, {
        type: 'freeze', targetId: targetPiece.instanceId, to: targetPiece.position,
        effectId: 'stun-daze', durationMs: 300,
      });
      next = applySialuDraw(next, caster, targetPiece.instanceId);
    } else if (effect.kind === 'passive' && effect.id === 'target-shield' && targetPiece?.owner === caster) {
      const amount = effect.value ?? 1;
      next = updatePiece(next, targetPiece.instanceId, (piece) => ({
        ...piece,
        statuses: [...piece.statuses.filter((status) => status.kind !== 'shielded'), { kind: 'shielded', amount }],
      }));
      next = enqueue(next, {
        type: 'shield', actorId: caster, targetId: targetPiece.instanceId,
        to: targetPiece.position, amount, effectId: 'linen-wrap', durationMs: 300,
      });
    } else if (effect.kind === 'grant-keyword' && targetPiece?.owner === caster) {
      const keyword = effect.keyword;
      next = updatePiece(next, targetPiece.instanceId, (piece) => ({
        ...piece,
        grantedKeywords: piece.grantedKeywords?.includes(keyword)
          ? piece.grantedKeywords
          : [...(piece.grantedKeywords ?? []), keyword],
      }));
    } else if (effect.kind === 'scorch' && initialTarget) {
      const expiresOnTurn = state.turn + Math.max(1, effect.duration) * 2;
      next = {
        ...next,
        tileEffects: [
          ...next.tileEffects.filter(
            (tile) => tile.position.x !== initialTarget.position.x || tile.position.y !== initialTarget.position.y,
          ),
          { kind: 'scorched', position: initialTarget.position, sourceOwner: caster, expiresOnTurn },
        ],
      };
    } else if (effect.kind === 'draw') {
      draws += effect.amount;
    } else if (effect.kind === 'discard') {
      // El descarte de un hechizo puede ser un coste propio o un castigo al
      // rival. Antes se acumulaba todo como coste propio y `target` se
      // ignoraba: un Diezmo de Sangre te vaciaba a ti la mano en vez de a tu
      // rival. Las unidades ya distinguían los dos casos; los hechizos no.
      if (effect.target === 'enemy-hand') {
        next = resolveDrawAndDiscard(next, opponentOf(caster), 0, effect.amount);
      } else {
        discards += effect.amount;
      }
    } else if (effect.kind === 'slow-all-enemies') {
      const enemyId = opponentOf(caster);
      next = {
        ...next,
        board: next.board.map((piece) =>
          piece.owner === enemyId
            ? { ...piece, movementModifier: (piece.movementModifier ?? 0) + effect.amount }
            : piece,
        ),
      };
    } else if (effect.kind === 'destroy-strongest-enemy') {
      // La más peligrosa, no la primera: el Ataque manda, y el id desempata
      // para que la misma partida se resuelva siempre igual.
      const victim = next.board
        .filter((piece) => piece.owner !== caster && pieceDefinition(piece)?.type === 'unit')
        .sort((left, right) => {
          const l = (pieceDefinition(left)?.attack ?? 0) + left.attackModifier;
          const r = (pieceDefinition(right)?.attack ?? 0) + right.attackModifier;
          return r - l || left.instanceId.localeCompare(right.instanceId);
        })[0];
      if (victim) {
        next = damagePiece(next, victim.instanceId, victim.currentHealth + 99, caster, card.vfx.impactEffect, undefined, card);
      }
    } else if (effect.kind === 'damage-all-enemies-by-sun-count') {
      // Cuenta de los Días / poder de Itzpapálotl (Quinto Sol).
      const raw = next.players[caster].sunCount ?? 0;
      const amount = effect.cap !== undefined ? Math.min(raw, effect.cap) : raw;
      if (amount > 0) {
        for (const piece of next.board.filter(
          (candidate) => candidate.owner !== caster && pieceDefinition(candidate)?.type === 'unit',
        )) {
          next = damagePiece(next, piece.instanceId, amount, caster, card.vfx.impactEffect, undefined, card);
        }
      }
    } else if (effect.kind === 'conditional-damage-all-enemies') {
      // Ofrenda de Fuego (Samsara): más daño si ya murió una unidad propia este turno.
      const amount = (next.players[caster].unitsDiedThisTurn ?? 0) > 0 ? effect.deathAmount : effect.baseAmount;
      for (const piece of next.board.filter(
        (candidate) => candidate.owner !== caster && pieceDefinition(candidate)?.type === 'unit',
      )) {
        next = damagePiece(next, piece.instanceId, amount, caster, card.vfx.impactEffect, undefined, card);
      }
    } else if (effect.kind === 'return-fallen-allies') {
      // Karma (Samsara): recupera TODAS las unidades propias muertas este turno, con bono.
      const fallen = next.players[caster].unitsDiedThisTurnLog ?? [];
      if (fallen.length > 0) {
        const revived = fallen.map((cardId, index) => ({
          instanceId: `karma-${next.turn}-${index}-${cardId}`,
          cardId,
          bonusAttack: effect.bonus,
          bonusHealth: effect.bonus,
        }));
        next = withPlayer(next, caster, {
          ...next.players[caster],
          hand: [...next.players[caster].hand, ...revived],
          unitsDiedThisTurnLog: [],
        });
      }
    } else if (effect.kind === 'passive' && effect.id === 'gain-hybris') {
      // Hybris (hechizo, Olimpo): sube el contador directamente, sin pasar por el Nexo enemigo.
      next = withPlayer(next, caster, { ...next.players[caster], hybris: (next.players[caster].hybris ?? 0) + (effect.value ?? 1) });
    } else if (effect.kind === 'reset-hybris-and-heal') {
      // Poder de Némesis: cura tanta Vida como Hybris borra.
      const current = next.players[caster].hybris ?? 0;
      if (current > 0) {
        next = withPlayer(next, caster, { ...next.players[caster], hybris: 0 });
        next = healNexus(next, caster, current);
      }
    } else if (effect.kind === 'buff-all-allies-permanent') {
      // Hybris (hechizo, Olimpo): +N/+N permanentes a toda la mesa propia.
      for (const piece of next.board.filter(
        (candidate) => candidate.owner === caster && pieceDefinition(candidate)?.type === 'unit',
      )) {
        next = updatePiece(next, piece.instanceId, (target) => ({
          ...target,
          attackModifier: target.attackModifier + effect.amount,
          currentHealth: target.currentHealth + effect.amount,
          permanentAttackBonus: (target.permanentAttackBonus ?? 0) + effect.amount,
        }));
      }
    } else if (effect.kind === 'passive' && effect.id === 'infect-target' && targetPiece && targetPiece.owner !== caster) {
      // Mordisco Infeccioso (Plaga): infecta al mismo objetivo al que ya se
      // le ha hecho daño. Si el daño lo mató, no queda a quién infectar.
      if (next.board.some((piece) => piece.instanceId === targetPiece.instanceId)) {
        next = addInfection(next, targetPiece.instanceId, caster);
      }
    } else if (effect.kind === 'passive' && effect.id === 'infect-all-enemies') {
      // Niebla Infecciosa, Plaga que no Cesa, poder de Kessra (Plaga).
      next = infectAllEnemies(next, caster);
    } else if (effect.kind === 'passive' && effect.id === 'damage-all-infected-enemies') {
      // Plaga que no Cesa / poder de Kessra: daño extra a TODAS las
      // unidades enemigas ya Infectadas en este momento (incluidas las que
      // el propio hechizo acaba de infectar un instante antes).
      const amount = effect.value ?? 1;
      for (const piece of next.board.filter(
        (candidate) => candidate.owner !== caster && candidate.statuses.some((status) => status.kind === 'infected'),
      )) {
        next = damagePiece(next, piece.instanceId, amount, caster, card.vfx.impactEffect, undefined, card);
      }
    } else if (effect.kind === 'claim-mandate') {
      // Jade: el Mandato Celestial pasa a manos de quien lanza la carta,
      // arrebatándoselo al rival si lo tenía. Mandato Revocado premia
      // arrebatarlo de verdad con cartas extra.
      const rivalHeldIt = next.mandate !== undefined && next.mandate !== caster;
      next = { ...next, mandate: caster };
      if (rivalHeldIt && effect.bonusDrawIfRivalHeld) {
        next = resolveDrawAndDiscard(next, caster, effect.bonusDrawIfRivalHeld, 0);
      }
    } else if (effect.kind === 'return-graveyard-renacer') {
      // Poder de Indrayani: recupera del cementerio TODA carta con Renacer,
      // haya gastado ya su revivificación o no — le da a la rueda una vuelta
      // más, sin bono de estadísticas (eso ya lo dio Renacer al morir la
      // primera vez).
      const eligible = next.players[caster].discard.filter((entry) => {
        const definition = CARD_BY_ID[entry.cardId];
        return definition?.effects.some((e) => e.kind === 'passive' && e.id === 'revive-on-death');
      });
      if (eligible.length > 0) {
        const eligibleIds = new Set(eligible.map((entry) => entry.instanceId));
        const revivedCards = eligible.map((entry, index) => ({
          instanceId: `indrayani-${next.turn}-${index}-${entry.cardId}`, cardId: entry.cardId,
        }));
        next = withPlayer(next, caster, {
          ...next.players[caster],
          discard: next.players[caster].discard.filter((entry) => !eligibleIds.has(entry.instanceId)),
          hand: [...next.players[caster].hand, ...revivedCards],
        });
      }
    } else if (effect.kind === 'scry') {
      next = enqueue(next, {
        type: 'spell', actorId: caster, amount: effect.amount, effectId: 'scry-top-cards', durationMs: 300,
      });
    } else if (effect.kind === 'heal-nexus') {
      next = healNexus(next, caster, effect.amount);
    } else if (effect.kind === 'refresh-move' && targetPiece?.owner === caster) {
      next = updatePiece(next, targetPiece.instanceId, (piece) => ({
        ...piece,
        movedThisTurn: false,
        enteredOnTurn: Math.min(piece.enteredOnTurn, state.turn - 1),
      }));
      next = enqueue(next, {
        type: 'spell', targetId: targetPiece.instanceId, effectId: 'astral-refresh', durationMs: 320,
      });
    } else if (effect.kind === 'refresh-attack' && targetPiece?.owner === caster) {
      // Holmgang: le devuelve el golpe a una unidad que ya había atacado.
      // Mismo patrón que refresh-move, sobre `attackedThisTurn` en vez de
      // `movedThisTurn`.
      next = updatePiece(next, targetPiece.instanceId, (piece) => ({ ...piece, attackedThisTurn: false }));
      next = enqueue(next, {
        type: 'spell', targetId: targetPiece.instanceId, effectId: 'astral-refresh', durationMs: 320,
      });
    } else if (effect.kind === 'splash-weakest-enemy') {
      const enemy = opponentOf(caster);
      const candidates = next.board
        .filter(
          (piece) =>
            piece.owner === enemy &&
            piece.instanceId !== initialTarget?.instanceId &&
            pieceDefinition(piece)?.type === 'unit',
        )
        .sort(
          (left, right) =>
            left.currentHealth - right.currentHealth || left.instanceId.localeCompare(right.instanceId),
        );
      const weakest = candidates[0];
      if (weakest) {
        const before = weakest.currentHealth;
        next = damagePiece(next, weakest.instanceId, effect.amount, caster, card.vfx.impactEffect, undefined, card);
        damageDealt += Math.min(effect.amount, before);
      }
    } else if (effect.kind === 'passive' && effect.id === 'entry-damage-strongest') {
      // Poder de Vaelith (Bestiario): mismo id que el disparador de entrada
      // de unidad, cableado también al contexto de hechizo/poder de comandante.
      const victim = next.board
        .filter((piece) => piece.owner !== caster && pieceDefinition(piece)?.type === 'unit')
        .sort((left, right) => {
          const l = (pieceDefinition(left)?.attack ?? 0) + left.attackModifier;
          const r = (pieceDefinition(right)?.attack ?? 0) + right.attackModifier;
          return r - l || left.instanceId.localeCompare(right.instanceId);
        })[0];
      if (victim) next = damagePiece(next, victim.instanceId, effect.value ?? 1, caster, card.vfx.impactEffect, undefined, card);
    } else if (effect.kind === 'passive' && effect.id === 'target-petardazo' && targetPiece?.owner === caster) {
      next = updatePiece(next, targetPiece.instanceId, (piece) => ({ ...piece, grantedPetardazo: 'permanent' }));
    } else if (effect.kind === 'passive' && effect.id === 'target-attack-until-end' && targetPiece?.owner === caster) {
      next = updatePiece(next, targetPiece.instanceId, (piece) => ({
        ...piece,
        attackModifier: piece.attackModifier + (effect.value ?? 0),
      }));
    } else if (effect.kind === 'passive' && effect.id === 'target-health-permanent' && targetPiece?.owner === caster) {
      next = updatePiece(next, targetPiece.instanceId, (piece) => ({
        ...piece, currentHealth: piece.currentHealth + (effect.value ?? 1),
      }));
    } else if (effect.kind === 'passive' && effect.id === 'target-permanent-buff' && targetPiece?.owner === caster) {
      // Runa de la Victoria: mismo patrón que la Necrópolis (upkeep-grow-ally),
      // pero disparado por un hechizo con objetivo en vez de al final del
      // turno. El bono de Ataque no caduca porque se acumula en
      // `permanentAttackBonus`, al que vuelve `attackModifier` en cada
      // cambio de turno.
      const value = effect.value ?? 1;
      next = updatePiece(next, targetPiece.instanceId, (piece) => ({
        ...piece,
        attackModifier: piece.attackModifier + value,
        currentHealth: piece.currentHealth + value,
        permanentAttackBonus: (piece.permanentAttackBonus ?? 0) + value,
        permanentHealthBonus: (piece.permanentHealthBonus ?? 0) + value,
      }));
    } else if (effect.kind === 'passive' && effect.id === 'sacrifice-return-buffed' && targetPiece?.owner === caster) {
      // Rueda que Gira (Samsara): destruye a la propia y la trae de vuelta a
      // la mano ya mejorada. Pasa por `damagePiece` (no un simple `filter`)
      // para que dispare los mismos enganches que cualquier otra muerte
      // (cuenta de Samsara, pasiva de Indrayani, Renacer si la carta también
      // lo trae de casa).
      const bonus = effect.value ?? 1;
      const sacrificedCardId = targetPiece.cardId;
      const sacrificedInstanceId = targetPiece.instanceId;
      next = damagePiece(next, sacrificedInstanceId, targetPiece.currentHealth + 99, caster, card.vfx.impactEffect, undefined, card);
      next = withPlayer(next, caster, {
        ...next.players[caster],
        hand: [...next.players[caster].hand, {
          instanceId: `${sacrificedInstanceId}-rueda-${next.turn}`,
          cardId: sacrificedCardId, bonusAttack: bonus, bonusHealth: bonus,
        }],
      });
    } else if (effect.kind === 'shield-all-allies') {
      // Juramento del Anillo: un escudo para cada unidad propia a la vez.
      for (const piece of next.board.filter(
        (candidate) => candidate.owner === caster && pieceDefinition(candidate)?.type === 'unit',
      )) {
        next = updatePiece(next, piece.instanceId, (target) => ({
          ...target,
          statuses: [...target.statuses.filter((status) => status.kind !== 'shielded'), { kind: 'shielded', amount: effect.amount }],
        }));
      }
    } else if (effect.kind === 'buff-all-allies-attack') {
      // Elección del Campo (Hildr): +N de Ataque hasta el final del turno
      // para todas las unidades propias, sin necesitar objetivo.
      for (const piece of next.board.filter(
        (candidate) => candidate.owner === caster && pieceDefinition(candidate)?.type === 'unit',
      )) {
        next = updatePiece(next, piece.instanceId, (target) => ({
          ...target, attackModifier: target.attackModifier + effect.amount,
        }));
      }
    } else if (effect.kind === 'refresh-attack-all') {
      // Elección del Campo (Hildr): mismo patrón que refresh-attack, pero
      // sobre todas las unidades propias a la vez.
      for (const piece of next.board.filter((candidate) => candidate.owner === caster)) {
        next = updatePiece(next, piece.instanceId, (target) => ({ ...target, attackedThisTurn: false }));
      }
    } else if (effect.kind === 'passive' && effect.id === 'survivors-permanent-attack-buff') {
      // Ocaso de los Dioses: se resuelve DESPUÉS del barrido que lo precede en
      // la misma lista de efectos, así que `next.board` ya solo contiene a
      // quien sobrevivió.
      const value = effect.value ?? 1;
      for (const piece of next.board.filter(
        (candidate) => candidate.owner === caster && pieceDefinition(candidate)?.type === 'unit',
      )) {
        next = updatePiece(next, piece.instanceId, (target) => ({
          ...target,
          attackModifier: target.attackModifier + value,
          permanentAttackBonus: (target.permanentAttackBonus ?? 0) + value,
        }));
      }
    } else if (effect.kind === 'passive' && effect.id === 'curse-drain-health' && targetPiece && targetPiece.owner !== caster) {
      next = updatePiece(next, targetPiece.instanceId, (piece) => ({
        ...piece, statuses: [...piece.statuses.filter((status) => status.kind !== 'cursed'), { kind: 'cursed', amount: effect.value ?? 1 }],
      }));
    }
  }
  // Nigromante Oscuro: los hechizos propios que hayan hecho daño drenan esa Vida al Nexo.
  if (damageDealt > 0 && next.board.some(
    (piece) => piece.owner === caster && pieceDefinition(piece)?.effects.some((e) => e.kind === 'passive' && e.id === 'drain-spells'),
  )) {
    next = healNexus(next, caster, damageDealt);
  }
  return resolveDrawAndDiscard(next, caster, draws, discards);
};

/** Las 4 casillas ortogonales adyacentes a una posición, dentro del tablero. */
const orthogonalNeighbors = (position: Position): readonly Position[] =>
  ([[1, 0], [-1, 0], [0, 1], [0, -1]] as const)
    .map(([dx, dy]) => ({ x: position.x + dx, y: position.y + dy }))
    .filter(isInsideBoard);

const resolveEntryEffects = (
  state: MatchState,
  piece: BoardPiece,
  card: CardDefinition,
  offered = false,
): MatchState => {
  let next = state;
  const resolvedEffects = activeEffects(card, { offered, judged: isUnderJudgement(next, piece.owner), hasMandate: next.mandate === piece.owner, tide: tidePhase(next), structures: countStructures(next, piece.owner) });
  for (const effect of resolvedEffects) {
    if (effect.kind === 'choose-formation') {
      next = queueDecision(next, piece.owner, card.id, { kind: 'formation', remaining: effect.count, optional: false });
    } else if (effect.kind === 'passive' && effect.id === 'entry-draw-structure') {
      const player = next.players[piece.owner];
      const index = player.deck.findIndex((instance) => CARD_BY_ID[instance.cardId]?.type === 'structure');
      const found = player.deck[index];
      if (found) {
        next = withPlayer(next, piece.owner, { ...player, deck: player.deck.filter((_, i) => i !== index), hand: [...player.hand, found] });
        next = enqueue(next, { type: 'draw', actorId: piece.owner, targetId: found.instanceId, cardId: found.cardId, durationMs: 300 });
      }
    } else if (effect.kind === 'gain-runo') {
      next = gainRuno(next, piece.owner, effect.amount);
    } else if (effect.kind === 'adjacent-damage') {
      if (effect.trigger === 'attack') continue;
      const targets = next.board.filter(
        (candidate) =>
          candidate.instanceId !== piece.instanceId &&
          distance(candidate.position, piece.position) === 1 &&
          (effect.includeAllies || candidate.owner !== piece.owner),
      );
      for (const target of targets) {
        next = damagePiece(next, target.instanceId, effect.amount, piece.owner, card.vfx.impactEffect, undefined, card);
      }
    } else if (effect.kind === 'damage-all-enemies') {
      for (const target of next.board.filter(
        (candidate) => (candidate.owner !== piece.owner || effect.includeAllies) && pieceDefinition(candidate)?.type === 'unit',
      )) {
        next = damagePiece(next, target.instanceId, effect.amount, piece.owner, card.vfx.impactEffect, undefined, card);
      }
    } else if (effect.kind === 'freeze' || effect.kind === 'stun') {
      // Al entrar en juego no hay objetivo señalado por el jugador: se elige
      // la unidad enemiga más peligrosa (la de más Ataque), que es lo que
      // haría cualquiera si pudiera apuntar.
      const victim = next.board
        .filter((candidate) => candidate.owner !== piece.owner && pieceDefinition(candidate)?.type === 'unit')
        .sort((left, right) => {
          const leftAttack = (pieceDefinition(left)?.attack ?? 0) + left.attackModifier;
          const rightAttack = (pieceDefinition(right)?.attack ?? 0) + right.attackModifier;
          return rightAttack - leftAttack || left.instanceId.localeCompare(right.instanceId);
        })[0];
      if (victim && effect.kind === 'freeze') {
        next = addStatus(next, victim.instanceId, effect.duration);
        next = applySialuDraw(next, piece.owner, victim.instanceId);
      } else if (victim && !isStunImmune(next, victim.instanceId)) {
        next = updatePiece(next, victim.instanceId, (target) => ({
          ...target,
          statuses: [
            ...target.statuses.filter((status) => status.kind !== 'stunned'),
            { kind: 'stunned', expiresOnTurn: next.turn + 2 },
          ],
        }));
        next = enqueue(next, {
          type: 'freeze', targetId: victim.instanceId, to: victim.position, effectId: 'stun-daze', durationMs: 300,
        });
        next = applySialuDraw(next, piece.owner, victim.instanceId);
      }
    } else if (effect.kind === 'draw') {
      next = resolveDrawAndDiscard(next, piece.owner, effect.amount, 0);
    } else if (effect.kind === 'refresh-move') {
      // Devuelve el movimiento a una aliada que ya lo hubiera gastado; si
      // ninguna se ha movido, el efecto no tiene a quién beneficiar.
      const ally = next.board.find(
        (candidate) =>
          candidate.owner === piece.owner &&
          candidate.instanceId !== piece.instanceId &&
          candidate.movedThisTurn &&
          pieceDefinition(candidate)?.type === 'unit',
      );
      if (ally) {
        next = updatePiece(next, ally.instanceId, (target) => ({ ...target, movedThisTurn: false }));
        next = enqueue(next, {
          type: 'spell', actorId: piece.owner, targetId: ally.instanceId,
          effectId: 'astral-refresh', durationMs: 320,
        });
      }
    } else if (effect.kind === 'heal-nexus') {
      next = healNexus(next, piece.owner, effect.amount);
    } else if (effect.kind === 'scry') {
      next = enqueue(next, {
        type: 'spell', actorId: piece.owner, targetId: piece.instanceId,
        amount: effect.amount, effectId: 'scry-top-cards', durationMs: 300,
      });
    } else if (effect.kind === 'passive' && effect.id === 'entry-damage-strongest') {
      const victim = next.board
        .filter((candidate) => candidate.owner !== piece.owner && pieceDefinition(candidate)?.type === 'unit')
        .sort((left, right) => {
          const l = (pieceDefinition(left)?.attack ?? 0) + left.attackModifier;
          const r = (pieceDefinition(right)?.attack ?? 0) + right.attackModifier;
          return r - l || left.instanceId.localeCompare(right.instanceId);
        })[0];
      if (victim) next = damagePiece(next, victim.instanceId, effect.value ?? 1, piece.owner, card.vfx.impactEffect, undefined, card);
    } else if (effect.kind === 'passive' && effect.id === 'entry-adjacent-enemy-damage') {
      const target = next.board.find(
        (candidate) => candidate.owner !== piece.owner && distance(candidate.position, piece.position) === 1,
      );
      if (target) next = damagePiece(next, target.instanceId, effect.value ?? 1, piece.owner, card.vfx.impactEffect, undefined, card);
    } else if (effect.kind === 'passive' && effect.id === 'copy-adjacent-attack') {
      const ally = next.board.find(
        (candidate) =>
          candidate.instanceId !== piece.instanceId &&
          candidate.owner === piece.owner &&
          distance(candidate.position, piece.position) === 1,
      );
      const allyAttack = ally ? pieceDefinition(ally)?.attack ?? 0 : 0;
      if (allyAttack > 0) {
        next = updatePiece(next, piece.instanceId, (candidate) => ({
          ...candidate, attackModifier: candidate.attackModifier + allyAttack,
        }));
      }
    } else if (effect.kind === 'passive' && effect.id === 'avatar-attack-buff') {
      // Samsara — Avatar: bono de +Ataque solo si ya murió una unidad propia este turno.
      if ((next.players[piece.owner].unitsDiedThisTurn ?? 0) > 0) {
        const value = effect.value ?? 1;
        next = updatePiece(next, piece.instanceId, (candidate) => ({ ...candidate, attackModifier: candidate.attackModifier + value }));
      }
    } else if (effect.kind === 'passive' && effect.id === 'avatar-stat-buff') {
      if ((next.players[piece.owner].unitsDiedThisTurn ?? 0) > 0) {
        const value = effect.value ?? 1;
        next = updatePiece(next, piece.instanceId, (candidate) => ({
          ...candidate, attackModifier: candidate.attackModifier + value, currentHealth: candidate.currentHealth + value,
        }));
      }
    } else if (effect.kind === 'passive' && effect.id === 'avatar-grant-swift-strike') {
      if ((next.players[piece.owner].unitsDiedThisTurn ?? 0) > 0) {
        next = updatePiece(next, piece.instanceId, (candidate) => ({
          ...candidate, grantedKeywords: [...(candidate.grantedKeywords ?? []), 'swift-strike'],
        }));
      }
    } else if (effect.kind === 'passive' && effect.id === 'avatar-discard-enemy') {
      if ((next.players[piece.owner].unitsDiedThisTurn ?? 0) > 0) {
        next = resolveDrawAndDiscard(next, opponentOf(piece.owner), 0, effect.value ?? 1);
      }
    } else if (effect.kind === 'claim-mandate') {
      next = { ...next, mandate: piece.owner };
    } else if (effect.kind === 'destroy-strongest-enemy') {
      // Tzitzimitl, Estrella Caída (Quinto Sol): mismo criterio que la
      // Balanza de Maat, pero como efecto de entrada en vez de hechizo.
      const victim = next.board
        .filter((candidate) => candidate.owner !== piece.owner && pieceDefinition(candidate)?.type === 'unit')
        .sort((left, right) => {
          const l = (pieceDefinition(left)?.attack ?? 0) + left.attackModifier;
          const r = (pieceDefinition(right)?.attack ?? 0) + right.attackModifier;
          return r - l || left.instanceId.localeCompare(right.instanceId);
        })[0];
      if (victim) {
        next = damagePiece(next, victim.instanceId, victim.currentHealth + 99, piece.owner, card.vfx.impactEffect, undefined, card);
      }
    } else if (effect.kind === 'passive' && effect.id === 'entry-self-permanent-buff') {
      // Colibrí del Sur (Quinto Sol): se refuerza a sí mismo al pagar su propio Sacrificio.
      const value = effect.value ?? 1;
      next = updatePiece(next, piece.instanceId, (candidate) => ({
        ...candidate,
        attackModifier: candidate.attackModifier + value,
        currentHealth: candidate.currentHealth + value,
        permanentAttackBonus: (candidate.permanentAttackBonus ?? 0) + value,
      }));
    } else if (effect.kind === 'passive' && effect.id === 'entry-draw-per-sun-count') {
      // Serpiente Emplumada (Quinto Sol): roba 1 carta por cada N puntos de Cuenta del Sol.
      const divisor = effect.value ?? 3;
      const draws = Math.floor((next.players[piece.owner].sunCount ?? 0) / divisor);
      if (draws > 0) next = resolveDrawAndDiscard(next, piece.owner, draws, 0);
    } else if (effect.kind === 'passive' && effect.id === 'sun-count-floor') {
      // Piedra del Sol (Quinto Sol): la Cuenta del Sol nunca empieza por debajo de este valor.
      const floor = effect.value ?? 2;
      const owner = next.players[piece.owner];
      if ((owner.sunCount ?? 0) < floor) next = withPlayer(next, piece.owner, { ...owner, sunCount: floor });
    } else if (effect.kind === 'passive' && effect.id === 'entry-infect-all-enemies') {
      // Alcalde Caído (Plaga).
      next = infectAllEnemies(next, piece.owner);
    } else if (effect.kind === 'destroy-low-health-all') {
      // Danzante de la Destrucción: barrido de Vida baja, sin distinguir bando.
      for (const target of next.board.filter(
        (candidate) => pieceDefinition(candidate)?.type === 'unit' && candidate.currentHealth <= effect.threshold,
      )) {
        next = damagePiece(next, target.instanceId, target.currentHealth + 99, piece.owner, card.vfx.impactEffect, undefined, card);
      }
    } else if (effect.kind === 'passive' && effect.id === 'scorch-adjacents') {
      const expiresOnTurn = state.turn + 2;
      const scorched = orthogonalNeighbors(piece.position).map((position) => ({
        kind: 'scorched' as const, position, sourceOwner: piece.owner, expiresOnTurn,
      }));
      next = {
        ...next,
        tileEffects: [
          ...next.tileEffects.filter((tile) => !scorched.some((added) => added.position.x === tile.position.x && added.position.y === tile.position.y)),
          ...scorched,
        ],
      };
    }
  }
  const discardEffect = resolvedEffects.find((effect) => effect.kind === 'discard');
  if (discardEffect?.kind === 'discard') {
    const target = discardEffect.target === 'enemy-hand' ? opponentOf(piece.owner) : piece.owner;
    next = resolveDrawAndDiscard(next, target, 0, discardEffect.amount);
    // Pesadilla Mortal: además de descartar de la mano enemiga, debilita a las unidades enemigas en juego.
    if (discardEffect.target === 'enemy-hand' && card.effects.some((e) => e.kind === 'passive' && e.id === 'discarded-units-weaken')) {
      const weaken = card.effects.find((e) => e.kind === 'passive' && e.id === 'discarded-units-weaken');
      const amount = weaken?.kind === 'passive' ? weaken.value ?? 1 : 1;
      for (const enemyUnit of next.board.filter((p) => p.owner === target && pieceDefinition(p)?.type === 'unit')) {
        next = damagePiece(next, enemyUnit.instanceId, amount, piece.owner, card.vfx.impactEffect, undefined, card);
      }
    }
  }
  return next;
};

/**
 * Drena Vida del Nexo enemigo al propio (Malachar, Murciélago Sombra): resta
 * al rival, suma al propio Nexo y comprueba si eso decide la partida.
 */
const applyNexusDrain = (state: MatchState, attackerOwner: PlayerId, amount: number, effectId: string): MatchState => {
  if (amount <= 0) return state;
  const enemyId = opponentOf(attackerOwner);
  const enemy = state.players[enemyId];
  if (enemy.nexusHealth <= 0) return state;
  const drained = Math.min(amount, enemy.nexusHealth);
  let next = withPlayer(state, enemyId, { ...enemy, nexusHealth: enemy.nexusHealth - drained });
  next = healNexus(next, attackerOwner, drained);
  next = enqueue(next, {
    type: 'nexus-damage', actorId: attackerOwner, targetId: `${enemyId}-nexus`,
    amount: drained, effectId, durationMs: 320,
  });
  if (next.players[enemyId].nexusHealth <= 0) {
    next = { ...next, winner: attackerOwner, phase: 'finished' };
    next = enqueue(next, {
      type: 'victory', actorId: attackerOwner, targetId: `${enemyId}-nexus`, effectId: 'shadow-victory', durationMs: 900,
    });
  }
  return next;
};

/** Pasiva de Malachar: cada ataque de sus unidades roba 1 Vida al Nexo enemigo. */
const applyMalacharDrain = (state: MatchState, attackerOwner: PlayerId): MatchState => {
  if (state.players[attackerOwner].commanderId !== 'malachar-reidor-sombra') return state;
  return applyNexusDrain(state, attackerOwner, 1, 'commander-shadow-drain');
};

const validateTurn = (state: MatchState, playerId: PlayerId): ActionResult | undefined => {
  if (state.pendingSpark || state.pendingDecisions?.length) return fail(state, 'wrong-phase', 'Resuelve la elección pendiente antes de continuar.');
  if (state.phase === 'finished') return fail(state, 'game-finished', 'La partida ya ha terminado.');
  if (state.activePlayer !== playerId) return fail(state, 'wrong-turn', 'No es el turno de ese jugador.');
  if (state.phase !== 'main' && state.phase !== 'combat') {
    return fail(state, 'wrong-phase', 'La acción no está disponible en esta fase.');
  }
  return undefined;
};

export const playResource = (
  state: MatchState,
  playerId: PlayerId,
  cardInstanceId: string,
): ActionResult => {
  const turnError = validateTurn(state, playerId);
  if (turnError) return turnError;
  const player = state.players[playerId];
  if (player.resourcePlayedThisTurn) {
    return fail(state, 'resource-already-played', 'Solo se puede jugar una fuente por turno.');
  }
  const instance = player.hand.find((card) => card.instanceId === cardInstanceId);
  if (!instance) return fail(state, 'card-not-found', 'La carta no está en la mano.');
  const card = CARD_BY_ID[instance.cardId];
  if (!card || card.type !== 'mana') return fail(state, 'invalid-card-type', 'La carta no es una fuente de Esencia.');
  let next = withPlayer(state, playerId, {
    ...player,
    hand: player.hand.filter((candidate) => candidate.instanceId !== cardInstanceId),
    resources: [
      ...player.resources,
      { instanceId: instance.instanceId, cardId: card.id, faction: card.faction, exhausted: false },
    ],
    resourcePlayedThisTurn: true,
    stats: { ...player.stats, cardsPlayed: player.stats.cardsPlayed + 1 },
  });
  next = enqueue(next, {
    type: 'resource', actorId: playerId, targetId: instance.instanceId,
    effectId: card.vfx.persistentEffect, durationMs: 320,
  });
  return success(next);
};

/**
 * Por qué un objetivo concreto no sirve para esta carta, en el mismo texto
 * que se muestra si se intenta jugar de todos modos — antes el rechazo era
 * siempre "El hechizo necesita un objetivo válido", sin decir cuál era la
 * regla incumplida (¿enemigo? ¿poca Vida? ¿solo unidades?). `undefined` si el
 * objetivo SÍ es válido.
 */
const cardTargetRejectionReason = (
  state: MatchState,
  playerId: PlayerId,
  card: CardDefinition,
  target: SpellTarget | undefined,
): string | undefined => {
  if (!spellNeedsPiece(card)) return undefined;
  const piece = requireTargetPiece(state, target);
  if (!piece) return 'Selecciona una ficha del tablero como objetivo.';
  if (card.effects.some((effect) => effect.kind === 'grant-formation' || effect.kind === 'heal-unit') && (piece.owner !== playerId || pieceDefinition(piece)?.type !== 'unit')) return 'Selecciona una unidad aliada.';
  if (card.effects.some((effect) => effect.kind === 'silence-unit') && (piece.owner === playerId || pieceDefinition(piece)?.type !== 'unit')) return 'Selecciona una unidad enemiga.';
  if (card.effects.some((effect) => effect.kind === 'mine-structure') && (piece.owner === playerId || pieceDefinition(piece)?.type !== 'structure')) return 'Selecciona una estructura enemiga.';
  if (piece.owner !== playerId && card.type === 'instant' && pieceDefinition(piece)?.effects.some((effect) => effect.kind === 'passive' && effect.id === 'enemy-spell-immune')) {
    return 'Esta unidad no puede ser objetivo de hechizos enemigos.';
  }
  const pushes = card.effects.some((effect) => effect.kind === 'push-target');
  const sinks = card.effects.some((effect) => effect.kind === 'sink');
  if (sinks && (piece.owner === playerId || pieceDefinition(piece)?.type !== 'unit')) {
    return 'Solo puede apuntar a una unidad enemiga.';
  }
  if (pushes && (piece.owner === playerId || pieceDefinition(piece)?.type !== 'unit')) {
    return 'Solo puede apuntar a una unidad enemiga.';
  }
  const damage = card.effects.find((effect) => effect.kind === 'damage');
  if (damage?.kind === 'damage' && damage.target === 'enemy-piece' && piece.owner === playerId) {
    return 'Solo puede apuntar a una ficha enemiga.';
  }
  if ((card.id === 'lluvia-ceniza' || card.effects.some((effect) => effect.kind === 'freeze')) && pieceDefinition(piece)?.type !== 'unit') {
    return 'Solo puede apuntar a una unidad, no a una estructura.';
  }
  // Juicio Divino: solo puede destruir unidades enemigas con 2 Vida o menos.
  if (card.id === 'juicio-divino' && piece.currentHealth > 2) {
    return 'Solo puede destruir una unidad enemiga con 2 Vida o menos.';
  }
  // Hilo de las Moiras: solo puede destruir unidades enemigas con 5 Vida o menos.
  if (card.id === 'hilo-de-las-moiras' && piece.currentHealth > 5) {
    return 'Solo puede destruir una unidad enemiga con 5 Vida o menos.';
  }
  // Presa Debilitada (Bestiario): mismo patrón, mismo tope.
  if (card.id === 'presa-debilitada' && piece.currentHealth > 5) {
    return 'Solo puede destruir una unidad enemiga con 5 Vida o menos.';
  }
  // Último Aliento (Plaga): solo puede apuntar a una unidad enemiga ya Infectada.
  if (card.id === 'ultimo-aliento' && !piece.statuses.some((status) => status.kind === 'infected')) {
    return 'Solo puede destruir una unidad enemiga ya Infectada.';
  }
  const curseDrain = card.effects.some((effect) => effect.kind === 'passive' && effect.id === 'curse-drain-health');
  if (curseDrain && piece.owner === playerId) return 'Solo puede apuntar a una ficha enemiga.';
  // Aturdir es un castigo, no una bendición: solo vale contra unidades
  // enemigas. Una estructura no ataca, así que aturdirla no significaría nada.
  const stuns = card.effects.some((effect) => effect.kind === 'stun');
  if (stuns && (piece.owner === playerId || pieceDefinition(piece)?.type !== 'unit')) {
    return 'Solo puede apuntar a una unidad enemiga.';
  }
  const grantsKeyword = card.effects.some((effect) => effect.kind === 'grant-keyword');
  if (grantsKeyword && (piece.owner !== playerId || pieceDefinition(piece)?.type !== 'unit')) {
    return 'Solo puede apuntar a una unidad aliada.';
  }
  const friendlyBuff = card.effects.some(
    (effect) => effect.kind === 'passive' && (
      effect.id === 'target-attack-until-end' || effect.id === 'target-permanent-buff' || effect.id === 'sacrifice-return-buffed' || effect.id === 'target-shield' || effect.id === 'target-petardazo'
    ),
  );
  if (friendlyBuff && (piece.owner !== playerId || pieceDefinition(piece)?.type !== 'unit')) return 'Solo puede apuntar a una unidad aliada.';
  const sacrificeReturn = card.effects.some((effect) => effect.kind === 'passive' && effect.id === 'sacrifice-return-buffed');
  if (sacrificeReturn && pieceDefinition(piece)?.type !== 'unit') return 'Solo puede apuntar a una unidad, no a una estructura.';
  const refreshMove = card.effects.some((effect) => effect.kind === 'refresh-move' || effect.kind === 'refresh-attack');
  if (refreshMove && (piece.owner !== playerId || pieceDefinition(piece)?.type !== 'unit')) {
    return 'Solo puede apuntar a una unidad aliada.';
  }
  return undefined;
};

const cardTargetIsValid = (
  state: MatchState,
  playerId: PlayerId,
  card: CardDefinition,
  target: SpellTarget | undefined,
): boolean => cardTargetRejectionReason(state, playerId, card, target) === undefined;

/**
 * Todas las fichas del tablero que serían un objetivo válido para esta carta,
 * jugada por `playerId`. Fuente única de verdad para "qué se resalta como
 * objetivo": antes `BattlePage.tsx` mantenía su propio filtro a mano
 * (enemyOnly/friendlyOnly/unitsOnly) que no conocía dos reglas reales del
 * motor — Maldición Sombra solo vale contra enemigos (resaltaba también las
 * propias) y Juicio Divino solo contra enemigos con 2 Vida o menos (resaltaba
 * cualquier enemigo). Clicar una ficha resaltada así fallaba igual que
 * clicar una que no lo estuviera, sin que nada lo explicara.
 *
 * Reutiliza `cardTargetIsValid` ficha por ficha en vez de reimplementar sus
 * reglas: cualquier caso especial que se añada ahí (como el de Juicio Divino)
 * queda cubierto aquí automáticamente, sin necesidad de acordarse de tocar
 * un segundo sitio.
 */
export const validSpellTargets = (
  state: MatchState,
  playerId: PlayerId,
  card: CardDefinition,
): readonly BoardPiece[] => {
  if (!spellNeedsPiece(card)) return [];
  return state.board.filter((piece) =>
    cardTargetIsValid(state, playerId, card, { kind: 'piece', pieceId: piece.instanceId }),
  );
};

/**
 * Coste efectivo de una carta tras aplicar descuentos activos:
 * Archivo Viviente (hechizos) y la pasiva de Kaela (unidades).
 */
export const effectiveCost = (
  state: MatchState,
  playerId: PlayerId,
  card: CardDefinition,
): ManaCost => {
  let generic = card.cost.generic;
  if (card.type === 'instant') {
    for (const piece of state.board) {
      if (piece.owner !== playerId) continue;
      const discount = CARD_BY_ID[piece.cardId]?.effects.find(
        (effect) => effect.kind === 'passive' && (effect.id === 'spell-generic-discount' || effect.id === 'instant-cost-discount'),
      );
      if (discount?.kind === 'passive') generic = Math.max(0, generic - (discount.value ?? 1));
    }
  }
  // Forja — la Fundición abarata a los autómatas mientras siga en pie.
  if (card.type === 'unit' && card.subtype === 'Autómata') {
    for (const piece of state.board) {
      if (piece.owner !== playerId) continue;
      const discount = CARD_BY_ID[piece.cardId]?.effects.find(
        (effect) => effect.kind === 'passive' && effect.id === 'automata-cost-discount',
      );
      if (discount?.kind === 'passive') generic = Math.max(0, generic - (discount.value ?? 1));
    }
  }
  if (card.type === 'unit' && state.players[playerId].unitDiscountPending) {
    generic = Math.max(0, generic - 1);
  }
  return { generic, colored: card.cost.colored };
};

const handCardPayment = (
  state: MatchState,
  playerId: PlayerId,
  card: CardDefinition,
  instance: CardInstance,
) => {
  // Samsara — Pira del Ghat: una copia que ha vuelto por Renacer puede traer
  // consigo un descuento de coste genérico para este despliegue.
  const player = state.players[playerId];
  const baseCost = effectiveCost(state, playerId, card);
  const renacerDiscount = Math.min(baseCost.generic, instance.costDiscount ?? 0);
  // Xiwangmu (Jade): mientras tengas el Mandato, la primera carta de cada turno cuesta 1 menos.
  const xiwangmuDiscount =
    player.commanderId === 'xiwangmu-la-reina-madre'
    && state.mandate === playerId
    && !player.firstCardDiscountUsedThisTurn
      ? Math.min(baseCost.generic - renacerDiscount, 1)
      : 0;
  const totalDiscount = renacerDiscount + xiwangmuDiscount;
  return { cost: { ...baseCost, generic: baseCost.generic - totalDiscount }, xiwangmuDiscount };
};

// La mano y el cobro consultan los descuentos de la misma copia.
export const handCardCost = (state: MatchState, playerId: PlayerId, card: CardDefinition, instance: CardInstance): ManaCost =>
  handCardPayment(state, playerId, card, instance).cost;

export const canPlayHandCard = (
  state: MatchState,
  playerId: PlayerId,
  card: CardDefinition,
  instance: CardInstance,
): boolean => {
  if (validateTurn(state, playerId)) return false;
  const player = state.players[playerId];
  if (card.type === 'mana') return !player.resourcePlayedThisTurn;
  if (!planManaPayment(player.resources, handCardCost(state, playerId, card, instance)).payable) return false;
  if (card.effects.some((effect) => effect.kind === 'sacrifice') && !hasSacrificeAvailable(state, playerId)) return false;
  if (card.type === 'unit' || card.type === 'structure') {
    return getValidDeploymentPositions(state, playerId).length > 0;
  }
  return !spellNeedsPiece(card) || validSpellTargets(state, playerId, card).length > 0;
};

export const playCard = (
  state: MatchState,
  playerId: PlayerId,
  cardInstanceId: string,
  position?: Position,
  target?: SpellTarget,
  offering = false,
  sparkFace?: SparkFace,
): ActionResult => {
  const turnError = validateTurn(state, playerId);
  if (turnError) return turnError;
  const player = state.players[playerId];
  const instance = player.hand.find((card) => card.instanceId === cardInstanceId);
  if (!instance) return fail(state, 'card-not-found', 'La carta no está en la mano.');
  const originalCard = CARD_BY_ID[instance.cardId];
  const card = originalCard && sparkFace ? { ...originalCard, effects: sparkEffects(originalCard.effects, sparkFace) } : originalCard;
  if (!card) return fail(state, 'card-not-found', 'La definición de la carta no existe.');
  if (card.type === 'mana') return fail(state, 'invalid-card-type', 'Usa la acción de jugar fuente.');

  const isPiece = card.type === 'unit' || card.type === 'structure';
  if (isPiece) {
    if (!position) return fail(state, 'position-required', 'Debes elegir una casilla de despliegue.');
    if (!isInsideBoard(position)) return fail(state, 'out-of-bounds', 'La casilla está fuera del tablero.');
    if (pieceAt(state, position)) return fail(state, 'occupied', 'La casilla ya está ocupada.');
    const isValidDeployment = getValidDeploymentPositions(state, playerId).some(
      (candidate) => candidate.x === position.x && candidate.y === position.y,
    );
    if (!isValidDeployment) {
      return fail(state, 'out-of-bounds', 'Solo puedes desplegar en tu fila inicial o junto a una unidad propia que ya haya actuado.');
    }
  } else {
    const rejection = cardTargetRejectionReason(state, playerId, card, target);
    if (rejection && !(sparkFace && !target && validSpellTargets(state, playerId, card).length === 0)) return fail(state, 'target-required', rejection);
  }

  // Quinto Sol — Sacrificio: coste OBLIGATORIO, a diferencia de la Ofrenda de
  // Duna (que es opcional). Sin una unidad propia que ofrecer, ni siquiera se
  // llega a pagar la Esencia.
  const requiresSacrifice = card.effects.some((effect) => effect.kind === 'sacrifice');
  if (requiresSacrifice && !hasSacrificeAvailable(state, playerId)) {
    return fail(state, 'target-required', 'Necesitas una unidad propia que sacrificar para jugar esta carta.');
  }

  const { cost, xiwangmuDiscount } = handCardPayment(state, playerId, card, instance);
  const payment = payMana(player.resources, cost);
  if (!payment.plan.payable) return fail(state, 'insufficient-mana', 'No hay Esencia disponible suficiente.');
  if (card.effects.some((effect) => effect.kind === 'spark') && sparkFace === undefined) {
    const rolled = startSpark(state, playerId);
    return success(enqueue({ ...rolled.state, pendingSpark: { owner: playerId, cardInstanceId, position, offering, faces: rolled.roll.faces } },
      { type: 'spell', actorId: playerId, cardId: card.id, effectId: 'goblins-spark-roll', durationMs: 360 }));
  }
  const receivesForgeBuff =
    card.type === 'unit' &&
    !player.forgeBuffUsedThisTurn &&
    state.board.some((piece) => piece.owner === playerId && piece.cardId === 'forja-carmesi');
  const usedUnitDiscount =
    card.type === 'unit' && player.unitDiscountPending && card.cost.generic > 0;
  // Duna — Ofrenda: se cobra AQUÍ, con la carta ya pagada en Esencia y antes
  // de que se resuelva nada. Si el jugador no puede permitírsela (le dejaría
  // el Nexo a 0 o menos), la carta se juega sin ella en vez de rechazarse:
  // rechazarla convertiría un extra opcional en un requisito.
  const offeringBase = offeringOf(card);
  const paysOffering =
    offering && offeringBase !== undefined && canPayOffering(state, playerId, offeringBase);
  const offeringToll = paysOffering ? offeringCost(state, playerId, offeringBase!) : 0;
  let nextPlayer: PlayerState = {
    ...player,
    hand: player.hand.filter((candidate) => candidate.instanceId !== cardInstanceId),
    resources: payment.resources,
    nexusHealth: player.nexusHealth - offeringToll,
    offeringsPaidThisTurn: (player.offeringsPaidThisTurn ?? 0) + (paysOffering ? 1 : 0),
    spellsCastThisTurn: card.type === 'instant' ? player.spellsCastThisTurn + 1 : player.spellsCastThisTurn,
    ...(card.type === 'instant' && player.runo !== undefined ? {
      runo: player.runo + runoFromSpell(player.spellsCastThisTurn, player.commanderId === 'vainamoinen-el-cantor-eterno'),
    } : {}),
    forgeBuffUsedThisTurn: player.forgeBuffUsedThisTurn || receivesForgeBuff,
    unitDiscountPending: player.unitDiscountPending && !usedUnitDiscount,
    firstCardDiscountUsedThisTurn: player.firstCardDiscountUsedThisTurn || xiwangmuDiscount > 0,
    stats: { ...player.stats, cardsPlayed: player.stats.cardsPlayed + 1 },
  };
  let next = withPlayer(state, playerId, nextPlayer);
  if (paysOffering) {
    next = enqueue(next, {
      type: 'nexus-damage', actorId: playerId, targetId: `${playerId}-nexus`,
      amount: offeringToll, effectId: 'duna-offering', durationMs: 320,
    });
    // Pasiva de Khaeris: la primera Ofrenda de cada turno le devuelve una carta.
    if (player.commanderId === 'khaeris-la-balanza' && (player.offeringsPaidThisTurn ?? 0) === 0) {
      next = drawInternal(next, playerId);
    }
  }
  if (payment.plan.resourceIds.length > 0) {
    next = enqueue(next, {
      type: 'mana-flow', actorId: playerId, targetId: cardInstanceId,
      amount: payment.plan.resourceIds.length, effectId: `${card.faction}-mana-flow`, durationMs: 280,
    });
  }
  if (requiresSacrifice) {
    next = performSacrifice(next, playerId);
    if (next.phase === 'finished') return success(next);
  }

  if (isPiece && position) {
    const maximumHealth = card.type === 'unit' ? card.health : card.resistance;
    if (maximumHealth === undefined) return fail(state, 'invalid-card-type', 'La carta no tiene resistencia válida.');
    const commanderId = player.commanderId;
    const verdaniaBonus = commanderId === 'verdania-guardiana-raices' && card.type === 'unit' ? 1 : 0;
    // Némesis (Olimpo): mientras la Hybris propia sea baja, sus unidades entran más duras.
    const nemesisBonus =
      commanderId === 'nemesis-la-que-mide' && card.type === 'unit' && (player.hybris ?? 0) <= 5 ? 1 : 0;
    // Vaelith (Bestiario): mientras controles una unidad con Guardia, sus unidades entran más duras.
    const vaelithBonus =
      commanderId === 'vaelith-la-guardabestias' && card.type === 'unit'
      && state.board.some((piece) => piece.owner === playerId && pieceDefinition(piece)?.keywords.includes('guard'))
        ? 1
        : 0;
    // Oso Forestal / Arboleda Sagrada: cada aliada propia en juego con esta aura suma su bono
    // a toda unidad nueva que entra (no a estructuras, el texto dice "unidades aliadas").
    const alliedAuraBonus = card.type === 'unit'
      ? state.board.reduce((sum, ally) => {
          if (ally.owner !== playerId) return sum;
          const auraEffect = CARD_BY_ID[ally.cardId]?.effects.find(
            (effect) => effect.kind === 'passive' && (effect.id === 'buff-allied-units-health' || effect.id === 'entry-allied-units-gain-health'),
          );
          return auraEffect?.kind === 'passive' ? sum + (auraEffect.value ?? 1) : sum;
        }, 0)
      : 0;
    // El escudo preventivo al entrar lo concede la aura de Asterin o la propia carta (Ángel Celestial).
    const ownShieldEffect = card.type === 'unit'
      ? card.effects.find((effect) => effect.kind === 'passive' && effect.id === 'entry-shield-gain')
      : undefined;
    // Márnak, Raíz Profunda: sus Guardias entran ya escudadas. Se queda con el
    // mayor de los escudos disponibles en vez de sumarlos, para que dos
    // fuentes de escudo no se acumulen sin querer.
    const marnakShield =
      commanderId === 'marnak-raiz-profunda' && card.type === 'unit' && card.keywords.includes('guard') ? 2 : 0;
    const shieldAmount = Math.max(
      commanderId === 'asterin-protector-luz' && card.type === 'unit' ? 1 : 0,
      ownShieldEffect?.kind === 'passive' ? ownShieldEffect.value ?? 1 : 0,
      marnakShield,
    );
    const asterinShield = shieldAmount > 0;
    // Borrán, Yunque Vivo: sus estructuras entran más duras de lo que dice la carta.
    const borranReinforcement = commanderId === 'borran-yunque-vivo' && card.type === 'structure' ? 2 : 0;
    // Nyxaris y Zeph comparten la misma pasiva de tempo: la primera unidad
    // del turno entra ya en movimiento.
    const nyxarisRush =
      (commanderId === 'nyxaris-heraldo-vacio' || commanderId === 'zeph-sin-orilla')
      && card.type === 'unit' && !player.firstUnitDeployedThisTurn;
    // Samsara — Renacer/Karma: bonos permanentes que la copia trae de vuelta de la mano.
    const renacerBonusAttack = instance.bonusAttack ?? 0;
    const renacerBonusHealth = instance.bonusHealth ?? 0;
    // Jade — Generación: +1/+1 si ya controlas una unidad del elemento que
    // genera al de esta carta (Madera→Fuego→Tierra→Metal→Agua→Madera).
    const elementBonus =
      card.type === 'unit' && card.element
      && state.board.some(
        (ally) => ally.owner === playerId && pieceDefinition(ally)?.element === elementGeneratorOf(card.element!),
      )
        ? 1
        : 0;
    // Horda (Plaga): al entrar, +N/+N permanentes por cada OTRA unidad
    // propia con Horda que YA estuviera en el tablero (se cuenta una vez, no
    // se recalcula después — a diferencia de la Fosa Común Andante, que
    // recalcula su bono cada vez que ataca).
    const hordaPermanentBuff = card.type === 'unit'
      ? card.effects.find((effect) => effect.kind === 'passive' && effect.id === 'horda-permanent-buff')
      : undefined;
    const hordaPermanentBonus = hordaPermanentBuff?.kind === 'passive'
      ? (hordaPermanentBuff.value ?? 1) * state.board.filter(
          (piece) => piece.owner === playerId
            && pieceDefinition(piece)?.effects.some(
              (effect) => effect.kind === 'passive' && (effect.id === 'horda-attack-bonus' || effect.id === 'horda-permanent-buff'),
            ),
        ).length
      : 0;
    // Forja — Ensamblaje N: +1/+1 por estructura aliada, con tope. Se calcula
    // ANTES de meter la pieza en el tablero, así que una estructura no se
    // cuenta a sí misma si lo que entra es una estructura.
    const forjaAssembly = card.type === 'unit' ? assemblyBonus(state, playerId, card) : 0;
    // Forja — la Cadena de Montaje y Torvald engordan lo que se levanta.
    const forjaAnvilBonus = card.type === 'unit' && card.subtype === 'Autómata'
      ? state.board.filter(
          (ally) => ally.owner === playerId
            && pieceDefinition(ally)?.effects.some(
              (effect) => effect.kind === 'passive' && effect.id === 'automata-attack-bonus',
            ),
        ).length
      : 0;
    const forjaStructureBonus = card.type === 'structure'
      ? structureEntryBonus(state, playerId, player.commanderId)
      : 0;
    const permanentBonus = renacerBonusAttack + elementBonus + hordaPermanentBonus + forjaAssembly + forjaAnvilBonus;
    const piece: BoardPiece = {
      sparkFace,
      instanceId: instance.instanceId,
      cardId: card.id,
      owner: playerId,
      position,
      currentHealth: maximumHealth + verdaniaBonus + nemesisBonus + vaelithBonus + alliedAuraBonus + borranReinforcement + renacerBonusHealth + elementBonus + hordaPermanentBonus + forjaAssembly + forjaStructureBonus,
      attackModifier: (receivesForgeBuff ? 1 : 0) + permanentBonus,
      movedThisTurn: false,
      attackedThisTurn: false,
      enteredOnTurn: nyxarisRush ? state.turn - 1 : state.turn,
      statuses: asterinShield ? [{ kind: 'shielded', amount: shieldAmount }] : [],
      ...(permanentBonus > 0 ? { permanentAttackBonus: permanentBonus } : {}),
      ...(instance.renacerSpent ? { renacerSpent: true } : {}),
    };
    next = stabilizeFormation({ ...next, board: [...next.board, piece] });
    // Forja — la Remachadora repara al entrar: la estructura aliada más
    // maltrecha recupera Resistencia.
    const rivetHeal = card.effects.find(
      (effect) => effect.kind === 'passive' && effect.id === 'entry-heal-structure',
    );
    if (rivetHeal?.kind === 'passive') {
      const cantidad = rivetHeal.value ?? 1;
      const maltrecha = next.board
        .filter((item) => {
          if (item.owner !== playerId) return false;
          const definition = pieceDefinition(item);
          return definition?.type === 'structure' && item.currentHealth < (definition.resistance ?? 0);
        })
        .slice()
        .sort((a, b) => a.currentHealth - b.currentHealth)[0];
      if (maltrecha) {
        const tope = pieceDefinition(maltrecha)?.resistance ?? maltrecha.currentHealth;
        next = updatePiece(next, maltrecha.instanceId, (item) => ({
          ...item,
          currentHealth: Math.min(tope, item.currentHealth + cantidad),
        }));
      }
    }
    // Forja — la Soldadora Veterana escuda a otra unidad aliada al entrar.
    const welderShield = card.effects.find(
      (effect) => effect.kind === 'passive' && effect.id === 'entry-shield-ally',
    );
    if (welderShield?.kind === 'passive') {
      const cantidad = welderShield.value ?? 1;
      const compañera = next.board.find(
        (item) => item.owner === playerId
          && item.instanceId !== piece.instanceId
          && pieceDefinition(item)?.type === 'unit'
          && !item.statuses.some((status) => status.kind === 'shielded'),
      );
      if (compañera) {
        next = updatePiece(next, compañera.instanceId, (item) => ({
          ...item,
          statuses: [...item.statuses.filter((status) => status.kind !== 'shielded'), { kind: 'shielded', amount: cantidad }],
        }));
      }
    }
    // Forja — el motor de la facción: cada estructura suya que entra da +1 de
    // Ataque PERMANENTE a todos tus autómatas. Va después de meter la pieza en
    // el tablero, pero eso da igual: una estructura no es un autómata, así que
    // no se beneficia de su propia entrada.
    if (isForgeStructure(card)) {
      next = windUpAutomata(next, playerId, 1);
    }
    if (card.type === 'unit') {
      next = withPlayer(next, playerId, { ...next.players[playerId], firstUnitDeployedThisTurn: true });
    }
    if (nyxarisRush) {
      next = enqueue(next, {
        type: 'summon', actorId: playerId, targetId: piece.instanceId, to: position,
        effectId: 'commander-void-aura', faction: card.faction, durationMs: 300,
      });
    }
    next = enqueue(next, {
      type: 'summon', actorId: playerId, targetId: piece.instanceId, to: position,
      // La carta viaja en el evento para que la presentación pueda dar a cada
      // rareza su propia entrada; no cambia ninguna regla.
      cardId: card.id,
      effectId: card.vfx.summonEffect, faction: card.faction, durationMs: 440,
      // Las unidades ya se presentan solas al aparecer en su casilla; una
      // estructura cambia reglas del tablero y conviene leerla antes.
      ...(card.type === 'structure' ? { cast: { kind: 'structure' as const, sourceId: card.id } } : {}),
    });
    if (verdaniaBonus > 0) {
      next = enqueue(next, {
        type: 'shield', actorId: playerId, targetId: piece.instanceId, to: position,
        amount: verdaniaBonus, effectId: 'commander-nature-aura', durationMs: 300,
      });
    }
    if (alliedAuraBonus > 0) {
      next = enqueue(next, {
        type: 'shield', actorId: playerId, targetId: piece.instanceId, to: position,
        amount: alliedAuraBonus, effectId: 'nature-ally-aura', durationMs: 300,
      });
    }
    if (asterinShield) {
      next = enqueue(next, {
        type: 'shield', actorId: playerId, targetId: piece.instanceId, to: position,
        amount: shieldAmount, effectId: 'commander-order-aura', durationMs: 300,
      });
    }
    next = resolveEntryEffects(next, piece, card, paysOffering);
  } else {
    nextPlayer = next.players[playerId];
    next = withPlayer(next, playerId, {
      ...nextPlayer,
      discard: [...nextPlayer.discard, instance],
    });
    const spellTargetPiece = requireTargetPiece(next, target);
    next = enqueue(next, {
      type: 'spell', actorId: playerId, targetId: target?.kind === 'piece' ? target.pieceId : target?.kind === 'nexus' ? `${target.playerId}-nexus` : undefined,
      to: spellTargetPiece?.position,
      cardId: card.id, faction: card.faction, targetCardId: spellTargetPiece?.cardId,
      cast: { kind: 'spell', sourceId: card.id },
      effectId: card.vfx.impactEffect ?? card.vfx.persistentEffect, durationMs: 420,
    });
    next = resolveSpell(next, playerId, card, target, paysOffering);
    const afterSpell = next.players[playerId];
    const hasTower = next.board.some(
      (piece) => piece.owner === playerId && piece.cardId === 'torre-horizonte',
    );
    if (hasTower && !afterSpell.towerLootUsedThisTurn) {
      next = withPlayer(next, playerId, { ...afterSpell, towerLootUsedThisTurn: true });
      next = resolveDrawAndDiscard(next, playerId, 1, 1);
      next = enqueue(next, {
        type: 'spell', actorId: playerId, effectId: 'horizon-loot', durationMs: 300,
      });
    }
    const commander = COMMANDER_BY_ID[next.players[playerId].commanderId];
    if (commander?.id === 'oriel-custodio-septima-runa' && next.players[playerId].spellsCastThisTurn === 2) {
      const topCard = next.players[playerId].deck[0];
      if (topCard) {
        next = enqueue(next, {
          type: 'reveal', actorId: playerId, targetId: topCard.instanceId,
          amount: 1, effectId: 'commander-scry', durationMs: 900,
        });
      }
    }
  }
  return success(next);
};

export const movePiece = (
  state: MatchState,
  playerId: PlayerId,
  pieceId: string,
  to: Position,
): ActionResult => {
  const turnError = validateTurn(state, playerId);
  if (turnError) return turnError;
  const piece = state.board.find((candidate) => candidate.instanceId === pieceId);
  if (!piece) return fail(state, 'piece-not-found', 'La unidad no existe.');
  if (piece.owner !== playerId) return fail(state, 'not-owner', 'No controlas esa unidad.');
  if (!canMovePiece(state, piece, to)) return fail(state, 'cannot-move', 'La unidad no puede moverse a esa casilla.');
  let next = updatePiece(state, pieceId, (candidate) => ({ ...candidate, position: to, movedThisTurn: true }));
  next = enqueue(next, {
    type: 'move', actorId: pieceId, from: piece.position, to, effectId: 'card-slide', durationMs: 360,
  });
  return success(next);
};

/**
 * Bono de daño adicional al atacar, según los pasivos propios del atacante
 * (daño a distancia, contra estructuras, contra objetivos solitarios...) y
 * las penalizaciones de pasivos enemigos adyacentes (Grifo de Orden).
 * `defender` se omite al atacar el Nexo: los bonos que dependen del objetivo
 * (estructura, aislamiento) no aplican ahí.
 */
const attackBonus = (state: MatchState, attacker: BoardPiece, card: CardDefinition, defender?: BoardPiece): number => {
  let bonus = 0;
  const flatDamage = card.effects.find((effect) => effect.kind === 'damage');
  if (flatDamage?.kind === 'damage') bonus += flatDamage.amount;
  if (defender) {
    if (pieceDefinition(defender)?.type === 'structure') {
      const structureBonus = card.effects.find((effect) => effect.kind === 'passive' && effect.id === 'structure-bonus-damage');
      if (structureBonus?.kind === 'passive') bonus += structureBonus.value ?? 0;
    }
    const isolatedBonus = card.effects.find((effect) => effect.kind === 'passive' && effect.id === 'bonus-damage-isolated-target');
    if (isolatedBonus?.kind === 'passive') {
      const hasNeighbor = state.board.some(
        (piece) =>
          piece.instanceId !== defender.instanceId &&
          piece.instanceId !== attacker.instanceId &&
          distance(piece.position, defender.position) === 1,
      );
      if (!hasNeighbor) bonus += isolatedBonus.value ?? 1;
    }
    const rangedBonus = card.effects.find((effect) => effect.kind === 'passive' && effect.id === 'ranged-attack-bonus');
    if (rangedBonus?.kind === 'passive' && distance(attacker.position, defender.position) > 1) bonus += rangedBonus.value ?? 1;
  }
  let weaken = 0;
  for (const piece of state.board) {
    if (piece.owner === attacker.owner || distance(piece.position, attacker.position) !== 1) continue;
    const effect = pieceDefinition(piece)?.effects.find((candidate) => candidate.kind === 'passive' && candidate.id === 'weaken-adjacent-enemies');
    if (effect?.kind === 'passive') weaken += effect.value ?? 1;
  }
  return bonus - weaken;
};

/** Efectos secundarios que se disparan al atacar (drenar, congelar, ralentizar, descartar…). */
const applyOnAttackExtras = (
  state: MatchState,
  playerId: PlayerId,
  attackerId: string,
  card: CardDefinition,
  dealt: number,
  defenderId?: string,
  defenderPosition?: Position,
): MatchState => {
  let next = state;
  const sourcePiece = state.board.find((piece) => piece.instanceId === attackerId);
  for (const effect of card.effects) {
    if (effect.kind !== 'passive' || !sourcePiece) continue;
    if (effect.id === 'spark-ally-backfire') {
      const ally = next.board.filter((piece) => piece.owner === playerId && piece.instanceId !== attackerId && pieceDefinition(piece)?.type === 'unit' && distance(piece.position, sourcePiece.position) === 1)
        .sort((a, b) => a.instanceId.localeCompare(b.instanceId))[0];
      if (ally) next = damagePiece(next, ally.instanceId, effect.value ?? 1, playerId, 'goblins-backfire', sourcePiece.position, card);
    } else if (effect.id === 'spark-target-splash' || effect.id === 'spark-self-splash') {
      const center = effect.id === 'spark-self-splash' ? sourcePiece.position : defenderPosition;
      if (center) {
        const victims = next.board.filter((piece) => pieceDefinition(piece)?.type === 'unit' && distance(piece.position, center) === 1);
        for (const victim of victims) next = damagePiece(next, victim.instanceId, effect.value ?? 1, playerId, 'goblins-bomb', center, card);
      }
    }
  }
  const defender = defenderId ? next.board.find((piece) => piece.instanceId === defenderId) : undefined;
  const defenderIsUnit = defender ? pieceDefinition(defender)?.type === 'unit' : false;

  // Desafío de Fimbul: solo se activa si el defensor iguala o supera el
  // Ataque del atacante. Se comprueba con la pieza tal como estaba ANTES del
  // golpe (el propio `attacker` capturado más arriba en `attackPiece`, pero
  // aquí solo llega su id, así que se relee del tablero: el atacante no
  // cambia de Ataque por el hecho de golpear).
  const attackerPiece = next.board.find((piece) => piece.instanceId === attackerId);
  const challenged = Boolean(
    attackerPiece && defender && defenderIsUnit
    && isChallenge(attackerPiece, card, defender, pieceDefinition(defender)!, next),
  );
  if (challenged) {
    // El Skald mira si ALGUNA unidad propia ganó un Desafío este turno, no
    // solo la que lo lleva escrito en su propia carta: la marca se pone
    // siempre que se cumple la condición, tenga o no la carta un efecto de
    // Desafío propio.
    const alreadyChallengedThisTurn = next.players[playerId].challengedThisTurn === true;
    next = withPlayer(next, playerId, { ...next.players[playerId], challengedThisTurn: true });
    // Hildr: solo la PRIMERA vez cada turno, no cada Desafío que se gane.
    if (!alreadyChallengedThisTurn && next.players[playerId].commanderId === 'hildr-la-que-elige') {
      next = resolveDrawAndDiscard(next, playerId, 1, 0);
    }
    const shieldOnAttack = card.effects.find((effect) => effect.kind === 'passive' && effect.id === 'challenge-shield-on-attack');
    if (shieldOnAttack?.kind === 'passive') {
      next = updatePiece(next, attackerId, (piece) => ({
        ...piece,
        statuses: [...piece.statuses.filter((status) => status.kind !== 'shielded'), { kind: 'shielded', amount: shieldOnAttack.value ?? 1 }],
      }));
    }
    const healOnAttack = card.effects.find((effect) => effect.kind === 'passive' && effect.id === 'challenge-heal-on-attack');
    if (healOnAttack?.kind === 'passive') {
      next = healNexus(next, playerId, healOnAttack.value ?? 1);
    }
    // Lobo de Fenrir: si la defensora sobrevive al intercambio, la remata de
    // todos modos. Se relee su Vida actual porque ya ha pasado el golpe (y el
    // posible contragolpe cuerpo a cuerpo) para cuando esto se evalúa.
    const destroySurvivor = card.effects.some((effect) => effect.kind === 'passive' && effect.id === 'challenge-destroy-survivor');
    if (destroySurvivor) {
      const survivor = defenderId ? next.board.find((piece) => piece.instanceId === defenderId) : undefined;
      if (survivor) {
        next = damagePiece(next, survivor.instanceId, survivor.currentHealth + 99, playerId, card.vfx.impactEffect, undefined, card);
      }
    }
  }

  if (defenderIsUnit && card.effects.some((effect) => effect.kind === 'passive' && effect.id === 'freeze-on-damage')) {
    next = addStatus(next, defenderId!, 1);
  }
  const rawFreeze = card.effects.find((effect) => effect.kind === 'freeze');
  if (defenderIsUnit && rawFreeze?.kind === 'freeze') {
    next = addStatus(next, defenderId!, rawFreeze.duration);
  }
  // Draco de Magma: al atacar, daña también las casillas adyacentes al objetivo.
  const attackAdjacent = card.effects.find((effect) => effect.kind === 'adjacent-damage' && effect.trigger === 'attack');
  const splashOrigin = defender?.position ?? defenderPosition;
  if (attackAdjacent?.kind === 'adjacent-damage' && splashOrigin) {
    const splashTargets = next.board.filter(
      (piece) =>
        piece.instanceId !== defenderId &&
        piece.instanceId !== attackerId &&
        distance(piece.position, splashOrigin) === 1 &&
        (attackAdjacent.includeAllies || piece.owner !== playerId),
    );
    for (const splashed of splashTargets) {
      next = damagePiece(next, splashed.instanceId, attackAdjacent.amount, playerId, card.vfx.impactEffect, undefined, card);
    }
  }
  // Devorador de Ecos: cada golpe le arranca al rival una carta de la mano.
  const attackDiscard = card.effects.find(
    (effect) => effect.kind === 'passive' && effect.id === 'attack-enemy-discard',
  );
  if (attackDiscard?.kind === 'passive') {
    next = resolveDrawAndDiscard(next, opponentOf(playerId), 0, attackDiscard.value ?? 1);
  }
  // Marea — el Lanzarredes aparta a quien golpea en vez de rematarlo.
  const netPush = card.effects.find((effect) => effect.kind === 'passive' && effect.id === 'push-on-attack');
  if (netPush?.kind === 'passive' && defenderId) {
    next = stabilizeFormation(pushOne(next, playerId, defenderId, netPush.value ?? 1));
  }
  // Marea — la Mensajera de Espuma solo trae noticias con el agua baja.
  const foamDraw = card.effects.find(
    (effect) => effect.kind === 'passive' && effect.id === 'draw-on-attack-if-low-tide',
  );
  if (foamDraw?.kind === 'passive' && tidePhase(next) === 'low') {
    next = resolveDrawAndDiscard(next, playerId, foamDraw.value ?? 1, 0);
  }
  const drainLife = card.effects.find((effect) => effect.kind === 'passive' && effect.id === 'drain-life-on-attack');
  if (drainLife?.kind === 'passive') {
    next = applyNexusDrain(next, playerId, drainLife.value ?? 1, `${card.faction}-lifedrain`);
  }
  const slow = card.effects.find((effect) => effect.kind === 'passive' && effect.id === 'slow-enemies-on-attack');
  if (slow?.kind === 'passive') {
    const enemyId = opponentOf(playerId);
    next = {
      ...next,
      board: next.board.map((piece) =>
        piece.owner === enemyId ? { ...piece, movementModifier: (piece.movementModifier ?? 0) + (slow.value ?? 1) } : piece,
      ),
    };
  }
  const knockback = card.effects.find((effect) => effect.kind === 'passive' && effect.id === 'push-adjacent-enemies-on-attack');
  if (knockback?.kind === 'passive' && splashOrigin) {
    const attackerPiece = next.board.find((piece) => piece.instanceId === attackerId);
    if (attackerPiece) {
      const pushTargets = next.board.filter(
        (piece) => piece.owner !== playerId && distance(piece.position, splashOrigin) === 1,
      );
      for (const target of pushTargets) {
        const dx = Math.sign(target.position.x - attackerPiece.position.x);
        const dy = Math.sign(target.position.y - attackerPiece.position.y);
        const destination = { x: target.position.x + dx, y: target.position.y + dy };
        if (isInsideBoard(destination) && !pieceAt(next, destination)) {
          next = updatePiece(next, target.instanceId, (piece) => ({ ...piece, position: destination }));
        }
      }
    }
  }
  const discardEnemy = card.effects.find((effect) => effect.kind === 'passive' && effect.id === 'discard-enemy-on-damage');
  if (dealt > 0 && discardEnemy?.kind === 'passive') {
    next = resolveDrawAndDiscard(next, opponentOf(playerId), 0, discardEnemy.value ?? 1);
  }
  const nearbyAllyBuff = card.effects.find((effect) => effect.kind === 'passive' && effect.id === 'attack-buff-nearby-allies');
  if (nearbyAllyBuff?.kind === 'passive') {
    const attackerPiece = next.board.find((piece) => piece.instanceId === attackerId);
    if (attackerPiece) {
      next = {
        ...next,
        board: next.board.map((piece) =>
          piece.owner === playerId && piece.instanceId !== attackerId && distance(piece.position, attackerPiece.position) === 1
            ? { ...piece, attackModifier: piece.attackModifier + (nearbyAllyBuff.value ?? 1) }
            : piece,
        ),
      };
    }
  }
  const firstAttackHeal = card.effects.find((effect) => effect.kind === 'passive' && effect.id === 'first-attack-heal');
  if (firstAttackHeal?.kind === 'passive') {
    const attackerPiece = next.board.find((piece) => piece.instanceId === attackerId);
    if (attackerPiece && !attackerPiece.firstAttackHealUsed) {
      const maxHealth = maximumPieceHealth(attackerPiece);
      next = updatePiece(next, attackerId, (piece) => ({
        ...piece, firstAttackHealUsed: true, currentHealth: Math.min(maxHealth, piece.currentHealth + (firstAttackHeal.value ?? 1)),
      }));
    }
  }
  return next;
};

/**
 * Daño base que haría `attacker` golpeando (opcionalmente) a `defender`, con
 * todos sus modificadores: Ataque impreso, `attackModifier`, el bonus de
 * `buff-self-on-attack` y el resto de bonificadores contextuales de
 * `attackBonus` (estructuras, aislamiento, alcance, debilitar...).
 *
 * Única fuente de este cálculo: antes vivía duplicado, idéntico, dentro de
 * `attackPiece` y `attackNexus`. Ahora también lo usan `previewAttackPiece` y
 * `previewAttackNexus` para la vista previa de daño — así la cifra que ve el
 * jugador antes de confirmar un ataque es, por construcción, la misma que
 * aplicará el motor al resolverlo, nunca una aproximación que pueda
 * desincronizarse.
 */
const computeAttackAmount = (
  state: MatchState,
  attacker: BoardPiece,
  card: CardDefinition,
  defender?: BoardPiece,
): number => {
  const attackBuff = card.effects.find((effect) => effect.kind === 'buff-self-on-attack');
  // Cobertura: quien dispara desde lejos pierde fuerza contra quien está
  // parapetado. El cuerpo a cuerpo (alcance 1) la ignora: ahí ya estás encima.
  const shielded = defender
    && (card.range ?? 1) > 1
    && givesCover(state, defender.position)
    ? COVER_REDUCTION
    : 0;
  // Furor de Fimbul: el Berserker de Piel de Oso pega más cuanto peor está.
  const furorBuff = card.effects.find((effect) => effect.kind === 'passive' && effect.id === 'furor-attack-bonus');
  const furorBonus = furorBuff?.kind === 'passive' && isFurious(attacker, card) ? furorBuff.value ?? 0 : 0;
  // Jarl de la Costa: da Desafío a cualquier otra unidad propia (+1 en ese
  // combate) mientras esté en el tablero. Es una aura, así que se comprueba
  // aparte de las cartas que llevan su propio Desafío escrito.
  const defenderCardForJarl = defender ? pieceDefinition(defender) : undefined;
  const jarlBonus =
    defender
    && defenderCardForJarl
    && card.id !== 'jarl-de-la-costa'
    && isChallenge(attacker, card, defender, defenderCardForJarl, state)
    && state.board.some((piece) => piece.owner === attacker.owner && piece.cardId === 'jarl-de-la-costa')
      ? 1
      : 0;
  // Monje de la Montaña (Jade): +2 de Ataque mientras tengas el Mandato.
  const mandateBuff = card.effects.find((effect) => effect.kind === 'passive' && effect.id === 'mandate-attack-bonus');
  const mandateBonus = mandateBuff?.kind === 'passive' && state.mandate === attacker.owner ? mandateBuff.value ?? 0 : 0;
  // General de los Mil Estandartes: da +1 de Ataque a sus OTRAS unidades
  // mientras tenga el Mandato. Aura, igual que la del Jarl de la Costa.
  const generalBonus =
    card.id !== 'general-de-los-mil-estandartes'
    && state.mandate === attacker.owner
    && state.board.some((piece) => piece.owner === attacker.owner && piece.cardId === 'general-de-los-mil-estandartes')
      ? 1
      : 0;
  // Danzante del Fuego Nuevo (Quinto Sol): +1 de Ataque por cada punto de
  // Cuenta del Sol por encima de 5.
  const danzanteBuff = card.effects.find((effect) => effect.kind === 'passive' && effect.id === 'danzante-sun-bonus');
  const danzanteBonus = danzanteBuff?.kind === 'passive'
    ? Math.max(0, (state.players[attacker.owner].sunCount ?? 0) - 5)
    : 0;
  // Horda (Plaga): +N de Ataque por cada OTRA unidad propia con Horda en el
  // tablero. Es un cálculo dinámico, igual que la Furia de Fimbul.
  const hordaBuff = card.effects.find((effect) => effect.kind === 'passive' && effect.id === 'horda-attack-bonus');
  const hordaBonus = hordaBuff?.kind === 'passive'
    ? (hordaBuff.value ?? 1) * state.board.filter(
        (piece) => piece.owner === attacker.owner && piece.instanceId !== attacker.instanceId
          && pieceDefinition(piece)?.effects.some(
            (effect) => effect.kind === 'passive' && (effect.id === 'horda-attack-bonus' || effect.id === 'horda-permanent-buff'),
          ),
      ).length
    : 0;
  const dischargeTarget = defender?.position ?? { x: attacker.position.x, y: nexusRow(opponentOf(attacker.owner)) };
  const dischargeBonus = hasDischarge(state, attacker) && dischargeLine(state, attacker, dischargeTarget).throughAlly
    ? 2 + (card.id === 'mosquetero-veterano' ? 1 : 0) : 0;
  const dischargeSpellBonus = hasDischarge(state, attacker) ? state.players[attacker.owner].dischargeDamageBonusThisTurn ?? 0 : 0;
  const total = Math.max(0, (card.attack ?? 0) + attacker.attackModifier +
    (attackBuff?.kind === 'buff-self-on-attack' ? attackBuff.attack : 0) +
    attackBonus(state, attacker, card, defender) + furorBonus + jarlBonus + mandateBonus + generalBonus + danzanteBonus + hordaBonus +
    (card.type === 'unit' ? runoAttackBonus(state.players[attacker.owner].runo ?? 0) : 0) + formationAttackBonus(state, attacker) + dischargeBonus + dischargeSpellBonus - shielded);
  return defender && pieceDefinition(defender)?.type === 'structure' && card.effects.some((effect) => effect.kind === 'passive' && effect.id === 'double-structure-damage') ? total * 2 : total;
};

export const attackPiece = (
  state: MatchState,
  playerId: PlayerId,
  attackerId: string,
  defenderId: string,
): ActionResult => {
  const turnError = validateTurn(state, playerId);
  if (turnError) return turnError;
  const attacker = state.board.find((piece) => piece.instanceId === attackerId);
  const defender = state.board.find((piece) => piece.instanceId === defenderId);
  if (!attacker || !defender) return fail(state, 'piece-not-found', 'El atacante o el objetivo no existe.');
  if (attacker.owner !== playerId) return fail(state, 'not-owner', 'No controlas al atacante.');
  if (!canAttackPiece(state, attacker, defender)) return fail(state, 'cannot-attack', 'El objetivo no está al alcance.');
  const card = pieceDefinition(attacker);
  if (!card || card.attack === undefined) return fail(state, 'cannot-attack', 'La carta no puede atacar.');
  const amount = computeAttackAmount(state, attacker, card, defender);
  let next = updatePiece(state, attackerId, (piece) => ({ ...piece, attackedThisTurn: true }));
  next = enqueue(next, {
    type: 'attack', actorId: attackerId, targetId: defenderId,
    cardId: card.id, faction: card.faction, targetCardId: defender.cardId,
    from: attacker.position, to: defender.position, effectId: card.vfx.attackEffect, durationMs: 380,
  });
  const defenderPosition = defender.position;
  const defenderCard = pieceDefinition(defender);
  if (attackSinksDefender(state, attacker, defender)) {
    return success(enqueue(stabilizeFormation(sinkUnit(next, defender)), { type: 'spell', actorId: attackerId, targetId: defenderId, to: defender.position, cardId: card.id, effectId: 'kalevala-canto', durationMs: 400 }));
  }
  const hit = damagePieceDetailed(next, defenderId, amount, playerId, card.vfx.impactEffect, attacker.position, card);
  next = hit.state;
  if (next.phase === 'finished') return success(next);
  // Vínculo vital: el Nexo propio se cura por el daño que llegó de verdad, no
  // por el anunciado — escudos y reducciones lo recortan antes.
  if (hit.dealt > 0 && hasLifelink(next, attacker, playerId)) {
    next = healNexus(next, playerId, hit.dealt);
  }
  // Plaga — Contagio: si la defensora sobrevive al golpe, queda Infectada
  // (propio o por el aura de la Médica de la Peste). Si el golpe la mata,
  // muere sin más — no hay a quién infectar.
  const hasContagio = card.effects.some((effect) => effect.kind === 'passive' && effect.id === 'infect-on-damage')
    || next.board.some(
      (piece) => piece.owner === playerId && pieceDefinition(piece)?.effects.some(
        (effect) => effect.kind === 'passive' && effect.id === 'grant-contagio-aura',
      ),
    );
  if (hasContagio && hit.dealt > 0) {
    const survivor = next.board.find((piece) => piece.instanceId === defenderId);
    if (survivor) next = addInfection(next, defenderId, playerId);
  }
  // Perforar: si el golpe destruye a la defensora, lo que sobra pasa al Nexo
  // enemigo. Solo cuenta el exceso real sobre la Vida que le quedaba.
  const overkill = hit.dealt - hit.healthBefore;
  if (overkill > 0 && hasKeyword(attacker, 'pierce')) {
    const enemyId = opponentOf(playerId);
    const pierced = damageNexus(next, enemyId, overkill, playerId, attackerId, card);
    next = pierced.state;
    if (card.faction === 'olimpo') next = applyHybrisGain(next, playerId, attackerId);
    if (pierced.lethal) {
      next = { ...next, winner: playerId, phase: 'finished' };
      next = enqueue(next, {
        type: 'victory', actorId: playerId, targetId: `${enemyId}-nexus`, effectId: `${card.faction}-victory`, durationMs: 900,
      });
      return success(next);
    }
  }
  // Carroñero del Osario: cobrar una pieza le devuelve algo al Nexo. Es el
  // primer disparador de «cuando destruye» del juego, así que se comprueba
  // aquí, donde ya se sabe si la defensora sigue en el tablero.
  const defensoraCayo = !next.board.some((piece) => piece.instanceId === defenderId);
  if (defensoraCayo && defenderCard?.type === 'unit' && card.effects.some((effect) => effect.kind === 'passive' && effect.id === 'kill-random-ally-damage')) {
    const allies = next.board.filter((piece) => piece.owner === playerId && pieceDefinition(piece)?.type === 'unit').sort((a, b) => a.instanceId.localeCompare(b.instanceId));
    if (allies.length) {
      const random = nextRandom(next.combatRandomState ?? deriveSeed(next.seed, 733));
      const victim = allies[Math.floor(random.value * allies.length)]!;
      next = { ...next, combatRandomState: random.state };
      next = damagePiece(next, victim.instanceId, 2, playerId, card.vfx.impactEffect, attacker.position, card);
    }
  }
  const scrapper = card.effects.find(
    (effect) => effect.kind === 'passive' && effect.id === 'on-kill-self-attack-buff',
  );
  if (scrapper?.kind === 'passive' && defensoraCayo) {
    const ganancia = scrapper.value ?? 1;
    next = updatePiece(next, attackerId, (piece) => ({
      ...piece,
      attackModifier: piece.attackModifier + ganancia,
      permanentAttackBonus: (piece.permanentAttackBonus ?? 0) + ganancia,
    }));
  }
  const killReward = card.effects.find((effect) => effect.kind === 'passive' && effect.id === 'on-kill-heal-nexus');
  if (killReward?.kind === 'passive' && defensoraCayo) {
    next = healNexus(next, playerId, killReward.value ?? 1);
  }
  // Pasiva de Borrán: la primera pieza que cobra su bando cada turno cura 1.
  const borran = next.players[playerId];
  if (
    defensoraCayo
    && borran.commanderId === 'borran-yunque-vivo'
    && !borran.commanderKillHealUsedThisTurn
  ) {
    next = withPlayer(next, playerId, { ...borran, commanderKillHealUsedThisTurn: true });
    next = healNexus(next, playerId, 1);
  }
  // Aturdir: la superviviente no podrá atacar en su próximo turno (sí moverse).
  if (
    hit.dealt > 0
    && card.keywords.includes('stun')
    && next.board.some((piece) => piece.instanceId === defenderId)
    && !isStunImmune(next, defenderId)
  ) {
    next = updatePiece(next, defenderId, (piece) => ({
      ...piece,
      statuses: [
        ...piece.statuses.filter((status) => status.kind !== 'stunned'),
        { kind: 'stunned', expiresOnTurn: state.turn + 2 },
      ],
    }));
    next = enqueue(next, {
      type: 'freeze', targetId: defenderId, to: defenderPosition, effectId: 'stun-daze', durationMs: 300,
    });
    next = applySialuDraw(next, playerId, defenderId);
  }
  // Combate cuerpo a cuerpo: si el atacante golpea con Alcance 1, la
  // defensora devuelve daño igual a su propio Ataque — simultáneo, así
  // que golpea de vuelta aunque el ataque recibido la mate (como un
  // intercambio real, no un tiro libre para quien ataca). Las unidades a
  // distancia (Alcance 2+) no reciben este contragolpe, ni las
  // estructuras (no tienen Ataque).
  if ((card.range ?? 1) === 1 && defenderCard?.attack !== undefined) {
    const retaliation = Math.max(0, defenderCard.attack + defender.attackModifier +
      (defenderCard.type === 'unit' ? runoAttackBonus(next.players[defender.owner].runo ?? 0) : 0) + formationAttackBonus(next, defender));
    next = damagePiece(next, attackerId, retaliation, defender.owner, defenderCard.vfx.impactEffect, defenderPosition, defenderCard);
  }
  next = applyOnAttackExtras(next, playerId, attackerId, card, amount, defenderId, defenderPosition);
  next = applyMalacharDrain(next, playerId);
  return success(next);
};


/**
 * Poder del comandante: una jugada grande, pagada con Esencia, que solo se
 * puede usar UNA vez por partida.
 *
 * Reutiliza la resolución de hechizos con una carta virtual en vez de duplicar
 * toda la maquinaria de efectos: así cualquier efecto que ya sepa resolver un
 * hechizo vale también para un poder, sin mantener dos caminos distintos.
 */
export const activateCommanderPower = (
  state: MatchState,
  playerId: PlayerId,
  target?: SpellTarget,
): ActionResult => {
  const turnError = validateTurn(state, playerId);
  if (turnError) return turnError;
  const player = state.players[playerId];
  const commander = COMMANDER_BY_ID[player.commanderId];
  if (!commander) return fail(state, 'card-not-found', 'No se encuentra tu comandante.');
  const power = commander.power;
  if (player.commanderPowerUsed) {
    return fail(state, 'cannot-attack', `${commander.name} ya ha usado su poder en esta partida.`);
  }
  if (power.needsEnemyTarget) {
    const piece = target?.kind === 'piece'
      ? state.board.find((candidate) => candidate.instanceId === target.pieceId)
      : undefined;
    if (!piece) return fail(state, 'target-required', 'Señala una unidad enemiga.');
    if (piece.owner === playerId) return fail(state, 'target-required', 'El poder solo apunta a unidades enemigas.');
  }
  const payment = payMana(player.resources, power.cost);
  if (!payment.plan.payable) return fail(state, 'insufficient-mana', 'No hay Esencia disponible suficiente.');

  let next = withPlayer(state, playerId, {
    ...player,
    resources: payment.resources,
    commanderPowerUsed: true,
  });
  // `to` faltaba aquí: EventEffects.tsx exige una posición de casilla para
  // dibujar el destello de un 'spell' (`event.to ? <ImpactBurst/> : null`),
  // así que TODO poder de comandante con un objetivo concreto se lanzaba sin
  // ningún efecto visual — el daño posterior sí se veía (llega en su propio
  // evento 'damage'), pero el propio lanzamiento del poder, no.
  const powerTargetPiece = target?.kind === 'piece'
    ? state.board.find((candidate) => candidate.instanceId === target.pieceId)
    : undefined;
  next = enqueue(next, {
    type: 'spell',
    actorId: playerId,
    targetId: target?.kind === 'piece' ? target.pieceId : `${playerId}-nexus`,
    to: powerTargetPiece?.position,
    targetCardId: powerTargetPiece?.cardId,
    effectId: power.effectId,
    faction: commander.faction,
    cast: { kind: 'power', sourceId: commander.id },
    durationMs: 460,
  });
  // Carta virtual: solo existe para pasar por `resolveSpell`.
  const virtual = {
    id: `${commander.id}-power`,
    name: power.name,
    faction: commander.faction,
    type: 'instant',
    rarity: 'mythic',
    cost: power.cost,
    rules: power.description,
    flavor: commander.flavor,
    keywords: [],
    collectorNumber: 0,
    aiTags: [],
    unique: true,
    effects: power.effects,
    vfx: commander.vfx,
    color: commander.faction,
    art: commander.art,
    set: 'NEX-01 · Despertar',
    artist: 'Atelier del Nexo',
    unlocked: true,
    sfx: { play: `${commander.faction}-play`, impact: `${commander.faction}-impact` },
  } as unknown as CardDefinition;
  next = resolveSpell(next, playerId, virtual, target);
  // No hace falta comprobar la victoria aquí: los efectos que tocan un Nexo la
  // declaran ellos mismos al aplicar el daño.
  return success(next);
};

/**
 * Hybris (Olimpo): cada vez que una unidad daña de verdad al Nexo enemigo
 * (ataque directo o el exceso de Perforar), gana +1/+1 permanentes y sube en 1
 * el contador de su dueño — el Héroe de los Doce Trabajos dobla su propio
 * bono, pero el contador del jugador sube igual que para cualquier otra.
 */
const applyHybrisGain = (state: MatchState, playerId: PlayerId, attackerId: string): MatchState => {
  const attacker = state.board.find((piece) => piece.instanceId === attackerId);
  if (!attacker) return state;
  const card = pieceDefinition(attacker);
  const doubleGrowth = card?.effects.some((effect) => effect.kind === 'passive' && effect.id === 'hybris-double-growth');
  const growth = doubleGrowth ? 2 : 1;
  let next = updatePiece(state, attackerId, (piece) => ({
    ...piece,
    attackModifier: piece.attackModifier + growth,
    currentHealth: piece.currentHealth + growth,
    permanentAttackBonus: (piece.permanentAttackBonus ?? 0) + growth,
  }));
  const player = next.players[playerId];
  next = withPlayer(next, playerId, { ...player, hybris: (player.hybris ?? 0) + 1 });
  return next;
};

/** ¿Tiene el jugador alguna unidad propia que ofrecer para pagar un Sacrificio? */
const hasSacrificeAvailable = (state: MatchState, playerId: PlayerId): boolean =>
  state.board.some((piece) => piece.owner === playerId && pieceDefinition(piece)?.type === 'unit');

/**
 * Quinto Sol — Sacrificio: destruye la unidad propia más expuesta (menos
 * Vida) para pagar el coste adicional de la carta que se está jugando.
 * Dispara sus dos dependencias: los «cuando esta unidad es sacrificada» de
 * la propia víctima, y la Cuenta del Sol del jugador (el Sacerdote del
 * Templo Mayor la duplica mientras esté en juego). Se resuelve ANTES que la
 * carta que se está pagando, así que sus efectos de entrada ya ven la
 * Cuenta actualizada.
 */
const performSacrifice = (state: MatchState, playerId: PlayerId): MatchState => {
  const victim = state.board
    .filter((piece) => piece.owner === playerId && pieceDefinition(piece)?.type === 'unit')
    .sort((left, right) => left.currentHealth - right.currentHealth || left.instanceId.localeCompare(right.instanceId))[0];
  if (!victim) return state;
  const victimCard = pieceDefinition(victim)!;
  let next = damagePiece(state, victim.instanceId, victim.currentHealth + 99, playerId, victimCard.vfx.impactEffect, undefined, victimCard);
  const onSacrificeDraw = victimCard.effects.find((effect) => effect.kind === 'passive' && effect.id === 'on-sacrifice-draw');
  if (onSacrificeDraw?.kind === 'passive') next = resolveDrawAndDiscard(next, playerId, onSacrificeDraw.value ?? 1, 0);
  const onSacrificeHeal = victimCard.effects.find((effect) => effect.kind === 'passive' && effect.id === 'on-sacrifice-heal-nexus');
  if (onSacrificeHeal?.kind === 'passive') next = healNexus(next, playerId, onSacrificeHeal.value ?? 1);
  const doublesCount = next.board.some(
    (piece) => piece.owner === playerId
      && pieceDefinition(piece)?.effects.some((effect) => effect.kind === 'passive' && effect.id === 'sacrifice-counts-double'),
  );
  const gain = doublesCount ? 2 : 1;
  const beforeCount = next.players[playerId];
  next = withPlayer(next, playerId, {
    ...beforeCount,
    sunCount: (beforeCount.sunCount ?? 0) + gain,
    sacrificesThisTurn: (beforeCount.sacrificesThisTurn ?? 0) + 1,
  });
  // Itzpapálotl: el primer Sacrificio de cada turno también golpea al Nexo enemigo.
  const afterCount = next.players[playerId];
  if (afterCount.commanderId === 'itzpapalotl-mariposa-obsidiana' && !afterCount.firstSacrificeDamageUsedThisTurn) {
    next = withPlayer(next, playerId, { ...afterCount, firstSacrificeDamageUsedThisTurn: true });
    const enemyId = opponentOf(playerId);
    const struck = damageNexus(next, enemyId, 1, playerId, victim.instanceId, victimCard);
    next = struck.state;
    if (struck.lethal) {
      next = { ...next, winner: playerId, phase: 'finished' };
      next = enqueue(next, {
        type: 'victory', actorId: playerId, targetId: `${enemyId}-nexus`, effectId: 'sol-victory', durationMs: 900,
      });
    }
  }
  return next;
};

/**
 * Plaga — Contagio: marca una pieza como Infectada por `infectorId`. Cubre
 * también la pasiva de Kessra (la primera infección de cada turno roba 1),
 * así que toda vía de infectar pasa por aquí en vez de repetir el chequeo en
 * cada sitio que la dispara.
 */
const addInfection = (state: MatchState, pieceId: string, infectorId: PlayerId): MatchState => {
  const target = state.board.find((piece) => piece.instanceId === pieceId);
  if (!target) return state;
  let next = updatePiece(state, pieceId, (piece) => ({
    ...piece,
    statuses: [...piece.statuses.filter((status) => status.kind !== 'infected'), { kind: 'infected' as const, infectorId }],
  }));
  const infector = next.players[infectorId];
  if (infector.commanderId === 'kessra-paciente-cero' && !infector.firstInfectionDrawUsedThisTurn) {
    next = withPlayer(next, infectorId, { ...infector, firstInfectionDrawUsedThisTurn: true });
    next = resolveDrawAndDiscard(next, infectorId, 1, 0);
  }
  return next;
};

/** Infecta a todas las unidades enemigas de `casterId` (Alcalde Caído, Niebla Infecciosa, Plaga que no Cesa, poder de Kessra). */
const infectAllEnemies = (state: MatchState, casterId: PlayerId): MatchState => {
  let next = state;
  for (const enemy of next.board.filter((piece) => piece.owner !== casterId && pieceDefinition(piece)?.type === 'unit')) {
    next = addInfection(next, enemy.instanceId, casterId);
  }
  return next;
};

/**
 * Plaga — Contagio: al final de CADA turno (de cualquiera de los dos
 * jugadores, no solo de quien lo termina), toda pieza Infectada pierde 1 de
 * Vida. Por eso no vive dentro de `resolveStructureUpkeep` (que solo mira las
 * piezas del jugador que termina turno): esto recorre el tablero entero.
 */
const resolveContagionDrain = (state: MatchState): MatchState => {
  let next = state;
  for (const infected of state.board.filter((piece) => piece.statuses.some((status) => status.kind === 'infected'))) {
    if (!next.board.some((piece) => piece.instanceId === infected.instanceId)) continue;
    next = damagePiece(next, infected.instanceId, 1, undefined, 'plaga-contagion-drain');
  }
  return next;
};

export const attackNexus = (
  state: MatchState,
  playerId: PlayerId,
  attackerId: string,
): ActionResult => {
  const turnError = validateTurn(state, playerId);
  if (turnError) return turnError;
  const attacker = state.board.find((piece) => piece.instanceId === attackerId);
  if (!attacker) return fail(state, 'piece-not-found', 'El atacante no existe.');
  if (attacker.owner !== playerId) return fail(state, 'not-owner', 'No controlas al atacante.');
  if (!canAttackEnemyNexus(state, attacker)) return fail(state, 'out-of-range', 'El Nexo no está al alcance.');
  const card = pieceDefinition(attacker);
  if (!card || card.attack === undefined) return fail(state, 'cannot-attack', 'La carta no puede atacar.');
  const amount = computeAttackAmount(state, attacker, card);
  const enemyId = opponentOf(playerId);
  let next = updatePiece(state, attackerId, (piece) => ({ ...piece, attackedThisTurn: true }));
  next = enqueue(next, {
    type: 'attack', actorId: attackerId, targetId: `${enemyId}-nexus`,
    from: attacker.position, cardId: card.id, faction: card.faction,
    effectId: card.vfx.attackEffect, durationMs: 380,
  });
  const struck = damageNexus(next, enemyId, amount, playerId, attackerId, card);
  next = struck.state;
  if (amount > 0 && card.faction === 'olimpo') next = applyHybrisGain(next, playerId, attackerId);
  // Vínculo vital: golpear el Nexo enemigo también cura el propio.
  if (amount > 0 && hasLifelink(next, attacker, playerId)) {
    next = healNexus(next, playerId, amount);
  }
  next = applyOnAttackExtras(next, playerId, attackerId, card, amount);
  if (struck.lethal) {
    next = { ...next, winner: playerId, phase: 'finished' };
    next = enqueue(next, {
      type: 'victory', actorId: playerId, targetId: `${enemyId}-nexus`, effectId: `${card.faction}-victory`, durationMs: 900,
    });
    return success(next);
  }
  next = applyMalacharDrain(next, playerId);
  return success(next);
};

export interface AttackPiecePreview {
  readonly sinksDefender?: boolean;
  readonly damageToDefender: number;
  readonly defenderHealthAfter: number;
  readonly defenderDies: boolean;
  /** Daño de vuelta que recibe la atacante, solo en combate cuerpo a cuerpo. */
  readonly retaliationToAttacker: number;
  readonly attackerHealthAfter: number;
  readonly attackerDies: boolean;
  /** Con Perforar, cuánto de ese golpe pasaría de largo hacia el Nexo enemigo. */
  readonly pierceOverkill: number;
}

/**
 * Cuánto dañaría (de verdad, tras escudos y reducciones) un ataque entre dos
 * fichas concretas, sin aplicar nada. Pensado para la vista previa al pasar
 * el cursor sobre un objetivo, antes de confirmar el ataque.
 *
 * Reutiliza `computeAttackAmount` y `damagePieceDetailed` — las mismas
 * funciones que usa `attackPiece` para resolver el combate de verdad — así
 * que la cifra que ve el jugador nunca puede desviarse de lo que ocurrirá
 * al confirmar.
 */
export const previewAttackPiece = (
  state: MatchState,
  attackerId: string,
  defenderId: string,
): AttackPiecePreview | undefined => {
  const attacker = state.board.find((piece) => piece.instanceId === attackerId);
  const defender = state.board.find((piece) => piece.instanceId === defenderId);
  if (!attacker || !defender) return undefined;
  const card = pieceDefinition(attacker);
  const defenderCard = pieceDefinition(defender);
  if (!card || card.attack === undefined) return undefined;
  if (attackSinksDefender(state, attacker, defender)) return {
    sinksDefender: true, damageToDefender: 0, defenderHealthAfter: defender.currentHealth,
    defenderDies: false, retaliationToAttacker: 0, attackerHealthAfter: attacker.currentHealth,
    attackerDies: false, pierceOverkill: 0,
  };
  const amount = computeAttackAmount(state, attacker, card, defender);
  const hit = damagePieceDetailed(state, defenderId, amount, attacker.owner, card.vfx.impactEffect, attacker.position, card);
  const defenderHealthAfter = Math.max(0, defender.currentHealth - hit.dealt);
  const defenderDies = defenderHealthAfter <= 0;
  const pierceOverkill = hasKeyword(attacker, 'pierce') && defenderDies
    ? Math.max(0, hit.dealt - hit.healthBefore)
    : 0;
  let retaliationToAttacker = 0;
  let attackerHealthAfter = attacker.currentHealth;
  // Mismo criterio que el combate real: la defensora devuelve el golpe si es
  // cuerpo a cuerpo, incluso si el ataque recibido la mata.
  if ((card.range ?? 1) === 1 && defenderCard?.attack !== undefined) {
    const raw = Math.max(0, defenderCard.attack + defender.attackModifier +
      (defenderCard.type === 'unit' ? runoAttackBonus(state.players[defender.owner].runo ?? 0) : 0) + formationAttackBonus(state, defender));
    const back = damagePieceDetailed(state, attackerId, raw, defender.owner, defenderCard.vfx.impactEffect, defender.position, defenderCard);
    retaliationToAttacker = back.dealt;
    attackerHealthAfter = Math.max(0, attacker.currentHealth - back.dealt);
  }
  return {
    damageToDefender: hit.dealt,
    defenderHealthAfter,
    defenderDies,
    retaliationToAttacker,
    attackerHealthAfter,
    attackerDies: attackerHealthAfter <= 0,
    pierceOverkill,
  };
};

export interface AttackNexusPreview {
  readonly damage: number;
  readonly nexusHealthAfter: number;
  readonly lethal: boolean;
}

/** Igual que `previewAttackPiece` pero para un ataque directo al Nexo enemigo. */
export const previewAttackNexus = (
  state: MatchState,
  attackerId: string,
): AttackNexusPreview | undefined => {
  const attacker = state.board.find((piece) => piece.instanceId === attackerId);
  if (!attacker) return undefined;
  const card = pieceDefinition(attacker);
  if (!card || card.attack === undefined) return undefined;
  const amount = computeAttackAmount(state, attacker, card);
  const enemy = state.players[opponentOf(attacker.owner)];
  const nexusHealthAfter = Math.max(0, enemy.nexusHealth - amount);
  return { damage: amount, nexusHealthAfter, lethal: nexusHealthAfter <= 0 };
};

/**
 * Mantenimiento de las estructuras: lo que hacen «al final de tu turno».
 *
 * Hasta la segunda oleada las estructuras solo tenían pasivas continuas
 * (descuentos, bloqueos, bonificaciones al atacar). Estas se disparan una vez
 * por turno de su dueño, que es lo que las convierte en motores lentos en
 * lugar de en estatuas.
 *
 * Se resuelven en el orden en que están sobre el tablero, y solo las del
 * jugador que termina el turno: una estructura no trabaja en el turno del
 * rival.
 */
const resolveStructureUpkeep = (state: MatchState, playerId: PlayerId): MatchState => {
  let next = state;
  const enemyId = opponentOf(playerId);
  // Se recorre la foto inicial del tablero: si una estructura muere a mitad
  // del mantenimiento (no puede hoy, pero podría), no queremos que el bucle
  // dependa de un array que cambia debajo.
  // Unidades también, no solo estructuras: el Embalsamador de Duna cura al
  // final del turno igual que un pozo, y separarlos obligaría a duplicar todo
  // esto para las piezas que no son edificios.
  const structures = state.board.filter((piece) => piece.owner === playerId);
  for (const structure of structures) {
    const card = pieceDefinition(structure);
    if (!card) continue;
    // Solo si sigue en pie: entre una estructura y otra puede haber muerto.
    if (!next.board.some((piece) => piece.instanceId === structure.instanceId)) continue;
    // Las ramas de Juicio se evalúan aquí, con la Vida tal como está al
    // terminar el turno: es justo el momento que describe la carta.
    // Palacio de Jade: si no tienes el Mandato, la propia estructura lo
    // reclama al final del turno — es la excepción que confirma la regla, así
    // que se mira aparte de las ramas normales de «Mandato: …».
    if (card.effects.some((effect) => effect.kind === 'passive' && effect.id === 'claim-mandate-if-missing') && next.mandate !== playerId) {
      next = { ...next, mandate: playerId };
    }
    for (const effect of activeEffects(card, { offered: false, judged: isUnderJudgement(next, playerId), hasMandate: next.mandate === playerId, tide: tidePhase(next), structures: countStructures(next, playerId) })) {
      if (effect.kind !== 'passive') continue;
      const value = effect.value ?? 1;
      if (effect.id === 'upkeep-heal-nexus') {
        next = healNexus(next, playerId, value);
      } else if (effect.id === 'upkeep-buff-automata') {
        // Forja — el Reloj del Gremio: la facción que acumula, acumulando.
        next = windUpAutomata(next, playerId, value);
      } else if (effect.id === 'upkeep-draw-if-structures') {
        if (countStructures(next, playerId) >= value) {
          next = resolveDrawAndDiscard(next, playerId, 1, 0);
        }
      } else if (effect.id === 'upkeep-damage-nearest') {
        // Forja — la Torre de Vapor suelta presión sobre lo que tenga más cerca.
        const source = next.board.find((piece) => piece.instanceId === structure.instanceId);
        const objetivo = source
          ? next.board
              .filter((piece) => piece.owner === enemyId && pieceDefinition(piece)?.type === 'unit')
              .slice()
              .sort((a, b) => distance(a.position, source.position) - distance(b.position, source.position))[0]
          : undefined;
        if (objetivo) {
          next = damagePiece(next, objetivo.instanceId, value, playerId, card.vfx.impactEffect, undefined, card);
        }
      } else if (effect.id === 'upkeep-heal-wounded-ally') {
        // Forja — el Taller Ambulante repara a la más maltrecha.
        const herida = next.board
          .filter((piece) => {
            if (piece.owner !== playerId) return false;
            const definition = pieceDefinition(piece);
            return definition?.type === 'unit' && piece.currentHealth < maximumPieceHealth(piece);
          })
          .slice()
          .sort((a, b) => a.currentHealth - b.currentHealth)[0];
        if (herida) {
          next = updatePiece(next, herida.instanceId, (piece) => ({
            ...piece,
            currentHealth: piece.currentHealth + value,
          }));
        }
      } else if (effect.id === 'upkeep-heal-if-high-tide') {
        // Marea — el Dique de Nácar solo devuelve algo con el agua alta.
        if (tidePhase(next) === 'high') next = healNexus(next, playerId, value);
      } else if (effect.id === 'upkeep-push-nearest') {
        // Marea — el Altar de la Resaca aparta a quien más se ha acercado al
        // Nexo propio. «Más cercana» se mide por distancia a la fila del Nexo,
        // que es exactamente la amenaza que la carta quiere quitarse de encima.
        const ownNexusRow = nexusRow(playerId);
        const closest = next.board
          .filter((piece) => piece.owner === enemyId && pieceDefinition(piece)?.type === 'unit')
          .slice()
          .sort((a, b) => Math.abs(a.position.y - ownNexusRow) - Math.abs(b.position.y - ownNexusRow))[0];
        if (closest) next = stabilizeFormation(pushOne(next, playerId, closest.instanceId, value));
      } else if (effect.id === 'upkeep-drain-nexus') {
        // Drena y cura en el mismo gesto, como la pasiva de Malachar.
        const result = damageNexus(next, enemyId, value, playerId, structure.instanceId, card);
        next = healNexus(result.state, playerId, value);
        if (result.lethal) {
          next = { ...next, winner: playerId, phase: 'finished' };
          next = enqueue(next, {
            type: 'victory', actorId: playerId, targetId: `${enemyId}-nexus`,
            effectId: `${card.faction}-victory`, durationMs: 900,
          });
          return next;
        }
      } else if (effect.id === 'upkeep-splash-weakest-enemy') {
        const weakest = next.board
          .filter((piece) => piece.owner === enemyId && pieceDefinition(piece)?.type === 'unit')
          .sort((left, right) =>
            left.currentHealth - right.currentHealth || left.instanceId.localeCompare(right.instanceId),
          )[0];
        if (weakest) {
          next = damagePiece(next, weakest.instanceId, value, playerId, card.vfx.impactEffect, undefined, card);
        }
      } else if (effect.id === 'upkeep-shield-ally') {
        // La unidad aliada más expuesta: la que menos Vida le queda. Escudar a
        // la que ya está sana desperdiciaría la estructura casi siempre.
        const ally = next.board
          .filter(
            (piece) =>
              piece.owner === playerId &&
              pieceDefinition(piece)?.type === 'unit' &&
              !piece.statuses.some((status) => status.kind === 'shielded'),
          )
          .sort((left, right) =>
            left.currentHealth - right.currentHealth || left.instanceId.localeCompare(right.instanceId),
          )[0];
        if (ally) {
          next = updatePiece(next, ally.instanceId, (piece) => ({
            ...piece,
            statuses: [...piece.statuses, { kind: 'shielded', amount: value }],
          }));
        }
      } else if (effect.id === 'upkeep-burn-nexus') {
        // Quema sin curar: la Devoradora se alimenta del veredicto, no drena.
        const result = damageNexus(next, enemyId, value, playerId, structure.instanceId, card);
        next = result.state;
        if (result.lethal) {
          next = { ...next, winner: playerId, phase: 'finished' };
          next = enqueue(next, {
            type: 'victory', actorId: playerId, targetId: `${enemyId}-nexus`,
            effectId: `${card.faction}-victory`, durationMs: 900,
          });
          return next;
        }
      } else if (effect.id === 'upkeep-draw') {
        next = resolveDrawAndDiscard(next, playerId, value, 0);
      } else if (effect.id === 'upkeep-grow-ally') {
        // Crece la unidad más expuesta: reforzar a la que ya está sana
        // desperdiciaría el turno casi siempre.
        const ally = next.board
          .filter((piece) => piece.owner === playerId && pieceDefinition(piece)?.type === 'unit')
          .sort((left, right) =>
            left.currentHealth - right.currentHealth || left.instanceId.localeCompare(right.instanceId),
          )[0];
        if (ally) {
          next = updatePiece(next, ally.instanceId, (piece) => ({
            ...piece,
            attackModifier: piece.attackModifier + value,
            currentHealth: piece.currentHealth + value,
            permanentAttackBonus: (piece.permanentAttackBonus ?? 0) + value,
          }));
        }
      } else if (effect.id === 'upkeep-loot') {
        next = resolveDrawAndDiscard(next, playerId, value, value);
      } else if (effect.id === 'upkeep-draw-if-low') {
        // Con la mano llena no roba: sin este tope, la Biblioteca convertía
        // cada turno en una carta gratis y ninguna partida larga se decidía
        // por otra cosa.
        if (next.players[playerId].hand.length <= UPKEEP_HAND_LIMIT) {
          next = resolveDrawAndDiscard(next, playerId, value, 0);
        }
      } else if (effect.id === 'furor-upkeep-damage-all-enemies' && isFurious(structure, card)) {
        // Gigante de la Escarcha: solo mientras esté malherido. Se relee la
        // pieza del tablero actual porque el bucle puede haberla dañado ya
        // en una vuelta anterior de este mismo mantenimiento.
        const self = next.board.find((piece) => piece.instanceId === structure.instanceId);
        if (self && isFurious(self, card)) {
          for (const target of next.board.filter(
            (piece) => piece.owner === enemyId && pieceDefinition(piece)?.type === 'unit',
          )) {
            next = damagePiece(next, target.instanceId, value, playerId, card.vfx.impactEffect, undefined, card);
          }
        }
      } else if (effect.id === 'upkeep-draw-if-challenged' && next.players[playerId].challengedThisTurn) {
        next = resolveDrawAndDiscard(next, playerId, value, 0);
      } else if (effect.id === 'upkeep-draw-and-heal-if-died' && next.players[playerId].unitDiedThisTurn) {
        next = resolveDrawAndDiscard(next, playerId, 1, 0);
        next = healNexus(next, playerId, value);
      } else if (effect.id === 'upkeep-draw-if-own-death' && (next.players[playerId].unitsDiedThisTurn ?? 0) > 0) {
        // Templo de la Rueda (Samsara).
        next = resolveDrawAndDiscard(next, playerId, 1, 0);
      } else if (effect.id === 'upkeep-heal-per-own-death') {
        // Asceta de la Ceniza (Samsara): cura por CADA unidad propia muerta este turno.
        const deaths = next.players[playerId].unitsDiedThisTurn ?? 0;
        if (deaths > 0) next = healNexus(next, playerId, value * deaths);
      } else if (effect.id === 'upkeep-scry') {
        // Oráculo de Delfos (Olimpo).
        next = enqueue(next, { type: 'spell', actorId: playerId, amount: value, effectId: 'scry-top-cards', durationMs: 300 });
      } else if (effect.id === 'upkeep-draw-if-hybris-high') {
        // Oráculo de Delfos: además roba si la Hybris ya está alta.
        if ((next.players[playerId].hybris ?? 0) >= 6) next = resolveDrawAndDiscard(next, playerId, value, 0);
      } else if (effect.id === 'upkeep-heal-half-hybris') {
        // Sacerdotisa de Eleusis (Olimpo): cura la mitad de la Hybris, redondeando abajo.
        const amount = Math.floor((next.players[playerId].hybris ?? 0) / 2);
        if (amount > 0) next = healNexus(next, playerId, amount);
      } else if (effect.id === 'upkeep-gain-hybris') {
        // Altar de los Doce (Olimpo): sube la Hybris igual que si hubieras golpeado el Nexo.
        next = withPlayer(next, playerId, { ...next.players[playerId], hybris: (next.players[playerId].hybris ?? 0) + value });
      } else if (effect.id === 'upkeep-heal-per-sacrifice') {
        // Señora de la Falda de Jade (Quinto Sol): cura por CADA unidad propia sacrificada este turno.
        const sacrifices = next.players[playerId].sacrificesThisTurn ?? 0;
        if (sacrifices > 0) next = healNexus(next, playerId, value * sacrifices);
      } else if (effect.id === 'upkeep-burn-nexus-if-sacrificed' && (next.players[playerId].sacrificesThisTurn ?? 0) > 0) {
        // Templo Mayor (Quinto Sol).
        const result = damageNexus(next, enemyId, value, playerId, structure.instanceId, card);
        next = result.state;
        if (result.lethal) {
          next = { ...next, winner: playerId, phase: 'finished' };
          next = enqueue(next, {
            type: 'victory', actorId: playerId, targetId: `${enemyId}-nexus`,
            effectId: `${card.faction}-victory`, durationMs: 900,
          });
          return next;
        }
      } else if (effect.id === 'upkeep-burn-infected-enemy') {
        // Laboratorio Clandestino (Plaga): una unidad enemiga Infectada, la que sea, pierde 1 de Vida extra.
        const victim = next.board.find(
          (piece) => piece.owner === enemyId && piece.statuses.some((status) => status.kind === 'infected'),
        );
        if (victim) next = damagePiece(next, victim.instanceId, value, playerId, card.vfx.impactEffect, undefined, card);
      } else if (effect.id === 'upkeep-draw-and-grow-if-infected-death' && next.players[playerId].infectedEnemyDiedThisTurn) {
        // Monumento a la Plaga (Plaga).
        next = resolveDrawAndDiscard(next, playerId, 1, 0);
        const ally = next.board
          .filter((piece) => piece.owner === playerId && pieceDefinition(piece)?.type === 'unit')
          .sort((left, right) => left.currentHealth - right.currentHealth || left.instanceId.localeCompare(right.instanceId))[0];
        if (ally) {
          next = updatePiece(next, ally.instanceId, (piece) => ({
            ...piece,
            attackModifier: piece.attackModifier + value,
            currentHealth: piece.currentHealth + value,
            permanentAttackBonus: (piece.permanentAttackBonus ?? 0) + value,
          }));
        }
      } else if (effect.id === 'metamorphosis-grow-if-wounded' && card.type === 'unit') {
        // Hidra de Lerna (Olimpo): si sigue en pie herida al final del turno, +N/+N. Se repite cada turno.
        const self = next.board.find((piece) => piece.instanceId === structure.instanceId);
        if (self && self.currentHealth > 0 && self.currentHealth < maximumPieceHealth(self)) {
          next = updatePiece(next, self.instanceId, (piece) => ({
            ...piece,
            attackModifier: piece.attackModifier + value,
            currentHealth: piece.currentHealth + value,
            permanentAttackBonus: (piece.permanentAttackBonus ?? 0) + value,
          }));
        }
      } else if (effect.id === 'metamorphose-into-constellation' && card.type === 'unit') {
        // Pegaso de Corinto (Olimpo): con Hybris 8+ se transforma una vez, a 5/5 fijos.
        const self = next.board.find((piece) => piece.instanceId === structure.instanceId);
        if (self && !self.metamorphosed && (next.players[playerId].hybris ?? 0) >= 8) {
          const targetStat = value || 5;
          next = updatePiece(next, self.instanceId, (piece) => ({
            ...piece,
            attackModifier: targetStat - (card.attack ?? 0),
            permanentAttackBonus: targetStat - (card.attack ?? 0),
            currentHealth: targetStat,
            metamorphosed: true,
          }));
        }
      }
    }
  }
  // Olimpo: al final de tu turno, si tu Hybris es 6 o más, tu Nexo pierde la
  // mitad de la Hybris (redondeando abajo) — el Templo de Columnas puede
  // rebajar esa pérdida, nunca por debajo de 0.
  const hybris = next.players[playerId].hybris ?? 0;
  if (hybris >= 6) {
    const reduction = next.board
      .filter((piece) => piece.owner === playerId)
      .reduce((total, piece) => {
        const relief = pieceDefinition(piece)?.effects.find(
          (effect) => effect.kind === 'passive' && effect.id === 'hybris-penalty-reduction',
        );
        return relief?.kind === 'passive' ? total + (relief.value ?? 1) : total;
      }, 0);
    const loss = Math.max(0, Math.floor(hybris / 2) - reduction);
    if (loss > 0) {
      const remaining = Math.max(0, next.players[playerId].nexusHealth - loss);
      next = withPlayer(next, playerId, { ...next.players[playerId], nexusHealth: remaining });
      next = enqueue(next, {
        type: 'nexus-damage', actorId: playerId, targetId: `${playerId}-nexus`,
        amount: loss, effectId: 'olimpo-hybris-backlash', durationMs: 420,
      });
      if (remaining <= 0) {
        next = { ...next, winner: enemyId, phase: 'finished' };
        next = enqueue(next, {
          type: 'victory', actorId: enemyId, targetId: `${playerId}-nexus`, effectId: 'olimpo-hybris-ruin', durationMs: 900,
        });
        return next;
      }
    }
  }
  return next;
};

/** Tope de mano por encima del cual el mantenimiento deja de robar. */
const UPKEEP_HAND_LIMIT = 5;

/** Jade — Generación: qué elemento genera al elemento dado, en el ciclo fijo de cinco. */
const elementGeneratorOf = (element: (typeof ELEMENTS)[number]): (typeof ELEMENTS)[number] => {
  const index = ELEMENTS.indexOf(element);
  return ELEMENTS[(index - 1 + ELEMENTS.length) % ELEMENTS.length]!;
};

/** Los textos de la nueva oleada dicen «al comienzo»: se resuelven tras el
 * robo y antes de dar control al jugador, independientemente del mantenimiento
 * histórico que se cobra al terminar el turno. */
const resolveExpansionStart = (state: MatchState, owner: PlayerId): MatchState => {
  let next = state;
  for (const source of state.board.filter((piece) => piece.owner === owner)) {
    if (!next.board.some((piece) => piece.instanceId === source.instanceId)) continue;
    const effects = pieceDefinition(source)?.effects ?? [];
    for (const effect of effects) {
      if (effect.kind !== 'passive') continue;
      const value = effect.value ?? 1;
      if (effect.id === 'start-sampo') {
        const id = `sampo-mana-${next.nextId}`;
        next = { ...next, nextId: next.nextId + 1 };
        next = withPlayer(next, owner, { ...next.players[owner], resources: [...next.players[owner].resources, { instanceId: id, cardId: 'fuente-kalevala', faction: 'kalevala', exhausted: false, temporary: true }] });
        next = gainRuno(next, owner, 1);
        next = enqueue(next, { type: 'resource', actorId: owner, targetId: id, faction: 'kalevala', effectId: 'kalevala-sampo', amount: 1, durationMs: 300 });
      } else if (effect.id === 'start-canto-adjacent') {
        if ((next.players[owner].runo ?? 0) >= value) next = queueDecision(next, owner, source.cardId, { kind: 'sink', remaining: 1, optional: false, adjacent: true, anchor: source.position });
      } else if (effect.id === 'start-choose-move') next = queueDecision(next, owner, source.cardId, { kind: 'move', remaining: 1, optional: true, distance: value });
      else if (effect.id === 'start-gain-runo') next = gainRuno(next, owner, value);
      else if (effect.id === 'start-scry') next = enqueue(next, { type: 'spell', actorId: owner, amount: value, effectId: 'scry-top-cards', durationMs: 300 });
      else if (effect.id === 'start-draw-if-three-units') {
        if (next.board.filter((piece) => piece.owner === owner && pieceDefinition(piece)?.type === 'unit').length >= 3) next = resolveDrawAndDiscard(next, owner, value, 0);
      } else if (effect.id === 'start-heal-unit' || effect.id === 'start-repair-structure' || effect.id === 'start-heal-and-form') {
        const structure = effect.id === 'start-repair-structure';
        const maximum = maximumPieceHealth;
        const target = next.board.filter((piece) => piece.owner === owner && pieceDefinition(piece)?.type === (structure ? 'structure' : 'unit') && piece.currentHealth < maximum(piece))
          .sort((a, b) => (maximum(b) - b.currentHealth) - (maximum(a) - a.currentHealth) || a.instanceId.localeCompare(b.instanceId))[0];
        if (target) {
          next = updatePiece(next, target.instanceId, (piece) => ({ ...piece,
            currentHealth: Math.min(maximum(piece), piece.currentHealth + value),
            grantedFormation: piece.grantedFormation || effect.id === 'start-heal-and-form',
          }));
          next = stabilizeFormation(next);
        }
      } else if (effect.id === 'start-cleanse-unit') {
        const negative = new Set(['frozen', 'stunned', 'cursed', 'infected', 'silenced']);
        const target = next.board.filter((piece) => piece.owner === owner && pieceDefinition(piece)?.type === 'unit' && piece.statuses.some((status) => negative.has(status.kind)))
          .sort((a, b) => a.instanceId.localeCompare(b.instanceId))[0];
        if (target) {
          let removed = false;
          next = updatePiece(next, target.instanceId, (piece) => ({ ...piece, statuses: piece.statuses.filter((status) => {
            if (!removed && negative.has(status.kind)) { removed = true; return false; }
            return true;
          }) }));
        }
      } else if (effect.id === 'start-grant-petardazo') {
        const target = next.board.filter((piece) => piece.owner === owner && pieceDefinition(piece)?.type === 'unit' && !piece.grantedPetardazo && !pieceDefinition(piece)?.effects.some((candidate) => candidate.kind === 'passive' && candidate.id === 'petardazo'))
          .sort((a, b) => (pieceDefinition(b)?.attack ?? 0) - (pieceDefinition(a)?.attack ?? 0) || a.instanceId.localeCompare(b.instanceId))[0];
        if (target) next = updatePiece(next, target.instanceId, (piece) => ({ ...piece, grantedPetardazo: 'permanent' }));
      } else if (effect.id === 'start-damage-nearest') {
        const target = next.board.filter((piece) => piece.owner !== owner && pieceDefinition(piece)?.type === 'unit')
          .sort((a, b) => distance(a.position, source.position) - distance(b.position, source.position) || a.instanceId.localeCompare(b.instanceId))[0];
        if (target) next = damagePiece(next, target.instanceId, value, owner, 'goblins-start-shot', source.position, pieceDefinition(source));
      }
    }
    if (next.phase === 'finished') break;
  }
  return next;
};

export const endTurn = (state: MatchState, playerId: PlayerId): ActionResult => {
  const turnError = validateTurn(state, playerId);
  if (turnError) return turnError;
  // Las estructuras cobran ANTES de que el turno pase: su texto dice «al final
  // de tu turno», no «al principio del turno del rival».
  const afterUpkeep = resolveStructureUpkeep(state, playerId);
  if (afterUpkeep.phase === 'finished') return success(afterUpkeep);
  state = afterUpkeep;
  // Plaga — Contagio: el drenaje de las Infectadas es de CUALQUIERA de los
  // dos turnos, no solo el de quien lo termina.
  state = resolveContagionDrain(state);
  if (state.phase === 'finished') return success(state);
  const rocDamage = state.players[playerId].rocroiEndDamage ?? 0;
  if (rocDamage > 0) {
    const targets = state.board.filter((enemy) => enemy.owner !== playerId && pieceDefinition(enemy)?.type === 'unit'
      && state.board.some((ally) => ally.owner === playerId && pieceDefinition(ally)?.type === 'unit' && distance(ally.position, enemy.position) === 1));
    for (const target of targets) state = damagePiece(state, target.instanceId, rocDamage, playerId, 'tercios-rocroi', undefined, CARD_BY_ID['rocroi']);
    if (state.phase === 'finished') return success(state);
  }
  state = returnSunkenUnits(state, playerId);
  // Jade: el Mandato Celestial se cae solo si terminas tu turno sin ninguna
  // unidad propia en el tablero — el Cielo no respalda a quien no tiene nada.
  if (state.mandate === playerId && !state.board.some((piece) => piece.owner === playerId)) {
    state = { ...state, mandate: undefined };
  }
  const nextPlayerId = opponentOf(playerId);
  const nextTurn = state.turn + 1;
  const incoming = state.players[nextPlayerId];
  const outgoing = state.players[playerId];
  let next: MatchState = {
    ...state,
    activePlayer: nextPlayerId,
    turn: nextTurn,
    phase: 'start',
    players: {
      ...state.players,
      [playerId]: {
        ...outgoing,
        resources: outgoing.resources.filter((resource) => !resource.temporary),
        resourcePlayedThisTurn: false,
        spellsCastThisTurn: 0,
        sparkRolledThisTurn: false,
        dischargeDamageBonusThisTurn: 0,
        attacksForbiddenThisTurn: false,
        formationInvulnerableTurn: undefined,
        rocroiEndDamage: 0,
        towerLootUsedThisTurn: false,
        forgeBuffUsedThisTurn: false,
        nexusDamagedThisTurn: false,
        firstUnitDeployedThisTurn: false,
        commanderKillHealUsedThisTurn: false,
        commanderControlDrawUsedThisTurn: false,
        commanderDrainCountThisTurn: 0,
        offeringsPaidThisTurn: 0,
        challengedThisTurn: false,
        unitDiedThisTurn: false,
        unitsDiedThisTurn: 0,
        unitsDiedThisTurnLog: [],
        firstUnitDeathDrawUsedThisTurn: false,
        firstCardDiscountUsedThisTurn: false,
        sacrificesThisTurn: 0,
        firstSacrificeDamageUsedThisTurn: false,
        firstInfectionDrawUsedThisTurn: false,
        infectedEnemyDiedThisTurn: false,
      },
      [nextPlayerId]: {
        ...incoming,
        resources: restoreMana(incoming.resources),
        resourcePlayedThisTurn: false,
        sparkRolledThisTurn: false,
        nexusDamagedThisTurn: false,
        firstUnitDeployedThisTurn: false,
        commanderKillHealUsedThisTurn: false,
        commanderControlDrawUsedThisTurn: false,
        commanderDrainCountThisTurn: 0,
        offeringsPaidThisTurn: 0,
        challengedThisTurn: false,
        unitDiedThisTurn: false,
        unitsDiedThisTurn: 0,
        unitsDiedThisTurnLog: [],
        firstUnitDeathDrawUsedThisTurn: false,
        firstCardDiscountUsedThisTurn: false,
        sacrificesThisTurn: 0,
        firstSacrificeDamageUsedThisTurn: false,
        firstInfectionDrawUsedThisTurn: false,
        infectedEnemyDiedThisTurn: false,
      },
    },
    board: state.board.map((piece) => ({
      ...piece,
      movedThisTurn: piece.owner === nextPlayerId ? false : piece.movedThisTurn,
      attackedThisTurn: piece.owner === nextPlayerId ? false : piece.attackedThisTurn,
      // Se vuelve al bono permanente, no a cero: lo que dio la Necrópolis se queda.
      attackModifier: piece.owner === playerId ? (piece.permanentAttackBonus ?? 0) : piece.attackModifier,
      // Las palabras clave prestadas caducan con el turno de quien las recibió.
      grantedKeywords: piece.owner === playerId ? undefined : piece.grantedKeywords,
      grantedPetardazo: piece.owner === playerId && piece.grantedPetardazo === 'turn' ? undefined : piece.grantedPetardazo,
      formationMarch: piece.owner === playerId ? undefined : piece.formationMarch,
      // Horror Abisal: la ralentización dura exactamente el siguiente turno del enemigo.
      movementModifier: piece.owner === playerId ? 0 : piece.movementModifier,
      statuses: piece.statuses.filter((status) => !('expiresOnTurn' in status) || status.expiresOnTurn > nextTurn),
    })),
    tileEffects: state.tileEffects.filter((tile) => tile.expiresOnTurn > nextTurn),
  };
  next = stabilizeFormation(next);
  // Maldición Sombra: cada unidad maldita pierde Vida al final de cada turno.
  for (const cursed of state.board.filter((piece) => piece.statuses.some((status) => status.kind === 'cursed'))) {
    const curse = cursed.statuses.find((status) => status.kind === 'cursed');
    if (curse?.kind === 'cursed') next = damagePiece(next, cursed.instanceId, curse.amount, undefined, 'curse-drain');
  }
  next = enqueue(next, {
    type: 'turn', actorId: nextPlayerId, effectId: 'turn-transition', durationMs: 400,
  });
  next = { ...next, phase: 'draw' };
  next = drawInternal(next, nextPlayerId);
  if (next.phase !== 'finished') next = resolveExpansionStart(next, nextPlayerId);
  if (next.phase !== 'finished') next = { ...next, phase: 'main' };
  return success(next);
};

/**
 * Si un bando puede tomar el mulligan: antes se exigía `state.turn === 1`,
 * pero `turn` es un contador COMPARTIDO que avanza en cada fin de turno de
 * cualquiera de los dos bandos (turno 1 = primer turno de quien empieza,
 * turno 2 = primer turno del otro bando, etc.) — en cuanto el primer
 * jugador terminaba su turno 1, `state.turn` pasaba a 2 y el SEGUNDO
 * jugador, que aún no había decidido su propio mulligan, se quedaba sin
 * poder hacerlo nunca (bug real en PvP: terminar tu turno le cerraba la
 * ventana de mulligan al rival). La condición correcta es por bando: sigue
 * disponible mientras ese jugador no haya jugado nada ni tomado ya su
 * mulligan, sin importar en qué turno global vaya la partida.
 */
export const canTakeMulligan = (state: MatchState, playerId: PlayerId): boolean => {
  const player = state.players[playerId];
  return !player.mulliganTaken && player.stats.cardsPlayed === 0 && !state.board.some((piece) => piece.owner === playerId);
};

export const mulliganOpeningHand = (
  state: MatchState,
  playerId: PlayerId,
  cardInstanceIds: readonly string[],
): ActionResult => {
  const player = state.players[playerId];
  if (!canTakeMulligan(state, playerId)) return fail(state, 'wrong-phase', 'El mulligan solo está disponible al comienzo de la partida.');
  const selected = new Set(cardInstanceIds);
  if (selected.size !== cardInstanceIds.length) {
    return fail(state, 'card-not-found', 'La selección de mulligan contiene cartas duplicadas.');
  }
  if (cardInstanceIds.some((id) => !player.hand.some((card) => card.instanceId === id))) {
    return fail(state, 'card-not-found', 'Una carta seleccionada no pertenece a la mano inicial.');
  }
  const kept = player.hand.filter((card) => !selected.has(card.instanceId));
  const returned = player.hand.filter((card) => selected.has(card.instanceId));
  const shuffled = shuffleSeeded(
    [...player.deck, ...returned],
    deriveSeed(state.seed, playerId === 'player' ? 31 + returned.length : 61 + returned.length),
  );
  const replacements = shuffled.slice(0, returned.length);
  return success(withPlayer(state, playerId, {
    ...player,
    hand: [...kept, ...replacements],
    deck: shuffled.slice(returned.length),
    mulliganTaken: true,
  }));
};

const sinkChosenUnits = (state: MatchState, decision: BoardDecision): MatchState => {
  let next = state;
  for (const id of decision.chosenIds) {
    const unit = next.board.find((piece) => piece.instanceId === id);
    if (!unit) continue;
    next = sinkUnit(next, unit);
    next = enqueue(next, { type: 'spell', actorId: decision.owner, targetId: id, to: unit.position, cardId: decision.sourceCardId, effectId: 'kalevala-canto', durationMs: 400 });
  }
  return stabilizeFormation(next);
};

const resolveBoardChoice = (state: MatchState, action: Extract<GameAction, { type: 'resolve-choice' }>): ActionResult => {
  const decision = state.pendingDecisions?.[0];
  if (state.phase === 'finished' || !decision || decision.id !== action.decisionId || decision.owner !== action.playerId) return fail(state, 'wrong-phase', 'La elección ya no está disponible.');
  const rest = state.pendingDecisions!.slice(1);
  const options = decisionOptions(state, decision);
  if (action.skip) {
    if (!decision.optional && options.length) return fail(state, 'target-required', 'Debes completar esta elección.');
    const skipped = { ...state, pendingDecisions: rest };
    return success(decision.kind === 'sink' ? sinkChosenUnits(skipped, decision) : skipped);
  }
  const option = options.find((candidate) => candidate.pieceId === action.pieceId && candidate.axis === action.axis && candidate.index === action.index
    && (candidate.to ? candidate.to.x === action.to?.x && candidate.to.y === action.to?.y : action.to === undefined));
  if (!option) return fail(state, 'target-required', 'La opción elegida no es válida.');
  let next: MatchState = { ...state, pendingDecisions: rest };
  const piece = action.pieceId ? state.board.find((candidate) => candidate.instanceId === action.pieceId) : undefined;
  const source = CARD_BY_ID[decision.sourceCardId];
  if (decision.kind === 'sink' && piece) {
    const updated = { ...decision, remaining: decision.remaining - 1, chosenIds: [...decision.chosenIds, piece.instanceId], anchor: decision.anchor ?? piece.position };
    if (updated.remaining > 0 && decisionOptions(state, updated).length) return success({ ...state, pendingDecisions: [updated, ...rest] });
    return success(sinkChosenUnits(next, updated));
  }
  if (decision.kind === 'formation' && piece) next = updatePiece(next, piece.instanceId, (unit) => ({ ...unit, grantedFormation: true }));
  else if (decision.kind === 'move' && piece && action.to) {
    const to = action.to;
    next = updatePiece(next, piece.instanceId, (unit) => ({ ...unit, position: to }));
    next = enqueue(next, { type: 'move', actorId: piece.instanceId, from: piece.position, to, effectId: 'card-slide', durationMs: 360 });
  } else if (decision.kind === 'line' && source) {
    const victims = next.board.filter((unit) => (action.axis === 'row' ? unit.position.y : unit.position.x) === action.index
      && (!decision.enemiesOnly || unit.owner !== decision.owner) && (!decision.unitsOnly || pieceDefinition(unit)?.type === 'unit'));
    for (const victim of victims) {
      next = damagePiece(next, victim.instanceId, decision.amount ?? 0, decision.owner, source.vfx.impactEffect, undefined, source);
      if (next.phase === 'finished') break;
    }
  }
  next = stabilizeFormation(next);
  if (decision.remaining > 1) {
    const updated: BoardDecision = { ...decision, remaining: decision.remaining - 1, chosenIds: [...decision.chosenIds, ...(piece ? [piece.instanceId] : [])], anchor: decision.anchor ?? piece?.position };
    if (decisionOptions(next, updated).length) next = { ...next, pendingDecisions: [updated, ...rest] };
  }
  return success(next);
};

export const applyAction = (state: MatchState, action: GameAction): ActionResult => {
  if (state.pendingSpark && action.type !== 'choose-spark') return fail(state, 'wrong-phase', 'Resuelve la Chispa antes de continuar.');
  if (state.pendingDecisions?.length && action.type !== 'resolve-choice') return fail(state, 'wrong-phase', 'Resuelve la elección pendiente antes de continuar.');
  switch (action.type) {
    case 'resolve-choice': return resolveBoardChoice(state, action);
    case 'choose-spark': {
      const pending = state.pendingSpark;
      if (!pending || pending.owner !== action.playerId || !pending.faces.includes(action.face)) return fail(state, 'wrong-phase', 'La elección no corresponde a esta Chispa.');
      const chosen = playCard({ ...state, pendingSpark: undefined }, action.playerId, pending.cardInstanceId, pending.position, action.target, pending.offering, action.face);
      return chosen.ok ? chosen : { ...chosen, state };
    }
    case 'draw':
      return drawCard(state, action.playerId ?? state.activePlayer);
    case 'play-resource':
      return playResource(state, action.playerId, action.cardInstanceId);
    case 'play-card':
      return playCard(state, action.playerId, action.cardInstanceId, action.position, action.target, action.offering);
    case 'move':
      return movePiece(state, action.playerId, action.pieceId, action.to);
    case 'attack-piece':
      return attackPiece(state, action.playerId, action.attackerId, action.defenderId);
    case 'attack-nexus':
      return attackNexus(state, action.playerId, action.attackerId);
    case 'commander-power':
      return activateCommanderPower(state, action.playerId, action.target);
    case 'end-turn':
      return endTurn(state, action.playerId);
  }
};

export const clearAnimationQueue = (state: MatchState): MatchState => ({ ...state, animations: [] });

export const shiftAnimationQueue = (
  state: MatchState,
): { readonly event?: AnimationEvent; readonly state: MatchState } => ({
  event: state.animations[0],
  state: { ...state, animations: state.animations.slice(1) },
});
