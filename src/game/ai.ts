import { BATTLE_TACTICAL_BUDGET, planTacticalAction, tacticalValue, type TacticalBudget } from './aiTactics';
import { distanceToCenter, distanceToEnemyNexusRow, nexusRow } from './board';
import { CARD_BY_ID } from './cards';
import { canPayOffering, offeringCost, offeringOf } from './duna';
import { COMMANDER_BY_ID } from './decks';
import {
  applyAction,
  effectiveCost,
  getValidAttacks,
  getValidDeploymentPositions,
  getValidMoves,
  spellNeedsPiece,
  validSpellTargets,
  decisionOptions,
} from './engine';
import { planManaPayment } from './mana';
import { attackSinksDefender, runoAttackBonus } from './kalevala';
import { sparkEffects } from './goblins';
import { dischargeLine, formationAttackBonus, hasDischarge } from './tercios';
import type {
  BoardPiece,
  CardDefinition,
  CardInstance,
  FactionId,
  GameAction,
  MatchState,
  PlayerId,
  Position,
  SpellTarget,
} from './types';

/**
 * Todas las rutinas de decisión reciben el asiento en el que juegan (`me`).
 * En la partida real siempre es 'ai' —el valor por defecto, para no cambiar
 * ninguna llamada existente—, pero dejarlo parametrizado permite enfrentar a
 * la IA contra sí misma en los dos bandos (ver la simulación de balance),
 * que es la única forma de medir el equilibrio entre facciones sin que el
 * resultado dependa de qué lado juega mejor.
 */
const rivalOf = (me: PlayerId): PlayerId => (me === 'player' ? 'ai' : 'player');

const MAX_AI_ACTIONS = 64;

/**
 * Nivel de la IA rival. Nunca cambia qué jugadas son legales, solo cuáles elige:
 *
 * - `easy`: no remata el Nexo, pelea solo en el tablero y deja respirar.
 * - `normal`: ataca el Nexo en cuanto puede y golpea al objetivo más amenazante,
 *   pieza por pieza en un orden fijo. Es directa y previsible.
 * - `hard`: evalúa TODOS los pares atacante-objetivo posibles antes de mover
 *   ficha y elige el mejor intercambio, midiendo qué muere de cada lado y el
 *   contragolpe que va a recibir. Solo golpea el Nexo cuando eso vale más que
 *   el mejor intercambio disponible (o cuando es letal).
 */
export type AiDifficulty = 'easy' | 'normal' | 'hard';

/**
 * Sesgo de puntuación por arquetipo de facción: cada IA rival prioriza sus
 * propias cartas y objetivos de forma distinta según su identidad temática
 * (ver src/game/factions.ts). Solo reordena candidatos ya válidos; nunca
 * habilita una jugada que el motor rechazaría.
 */
export const factionCardBias = (card: CardDefinition, faction: FactionId | undefined): number => {
  if (!faction) return 0;
  switch (faction) {
    case 'fury':
      return (card.attack ?? 0) * 1.5 + card.effects.reduce((sum, effect) => sum + (effect.kind === 'scorch' ? 5 : effect.kind === 'damage' ? effect.amount : 0), 0);
    case 'arcane':
      return card.effects.reduce((sum, effect) => sum + (effect.kind === 'freeze' ? 6 : effect.kind === 'draw' ? effect.amount * 3 : effect.kind === 'scry' ? effect.amount * 2 : 0), 0);
    case 'nature':
      return (card.health ?? card.resistance ?? 0) * 1.5 + card.effects.reduce((sum, effect) => sum + (effect.kind === 'heal-nexus' ? effect.amount * 2 : 0), 0);
    case 'order':
      return (card.type === 'structure' ? 6 : 0) + card.effects.reduce((sum, effect) => sum + (effect.kind === 'passive' && effect.id === 'target-attack-until-end' ? 4 : 0), 0);
    case 'shadow':
      return card.effects.reduce((sum, effect) => sum + (effect.kind === 'discard' ? effect.amount * 4 : effect.kind === 'adjacent-damage' ? effect.amount * 2 : effect.kind === 'splash-weakest-enemy' ? effect.amount * 2 : 0), 0);
    case 'void':
      return (card.unique ? 4 : 0) + card.effects.reduce((sum, effect) => sum + (effect.kind === 'refresh-move' ? 5 : effect.kind === 'passive' ? 2 : 0), 0);
    default:
      return 0;
  }
};

const seatFaction = (state: MatchState, me: PlayerId): FactionId | undefined =>
  COMMANDER_BY_ID[state.players[me].commanderId]?.faction;

const cardScore = (card: CardDefinition, faction?: FactionId): number => {
  const cost = card.cost.generic + Object.values(card.cost.colored).reduce<number>((sum, value) => sum + (value ?? 0), 0);
  const boardValue = (card.attack ?? 0) * 2 + (card.health ?? card.resistance ?? 0);
  const removalValue = card.effects.reduce(
    (sum, effect) => sum + (effect.kind === 'damage' ? effect.amount * 3 : effect.kind === 'freeze' || effect.kind === 'sink' ? 4 : effect.kind === 'draw' ? effect.amount * 2 : 0),
    0,
  );
  // Palabras clave que valen más de lo que dicen los números impresos: sin
  // esto la IA trataba a un Ariete con Perforar igual que a un 4/5 cualquiera.
  const keywordValue =
    (card.keywords.includes('pierce') ? (card.attack ?? 0) : 0) +
    (card.keywords.includes('lifelink') ? (card.attack ?? 0) : 0) +
    (card.keywords.includes('stun') ? 3 : 0) +
    (card.keywords.includes('guard') ? 2 : 0) +
    (card.keywords.includes('flying') ? 2 : 0);
  return boardValue + removalValue + keywordValue + cost + (card.unique ? 2 : 0) + factionCardBias(card, faction);
};

const stableTieBreaker = (value: string, seed: number): number => {
  let hash = seed >>> 0;
  for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 16_777_619) >>> 0;
  return hash;
};

const chooseEnemyTarget = (state: MatchState, card: CardDefinition, me: PlayerId): BoardPiece | undefined => {
  // `validSpellTargets` es la misma comprobación que usa el motor para
  // aceptar la jugada, así que ya filtra estructuras cuando el hechizo las
  // rechaza, y también casos por carta (Juicio Divino solo contra 2 Vida o
  // menos) que antes esta función no conocía — la IA podía elegir un
  // objetivo que el motor iba a rechazar siempre, con el mismo riesgo de
  // bucle que tuvo Maldición Sombra.
  const allowed = validSpellTargets(state, me, card).filter((piece) => piece.owner !== me);
  return [...allowed].sort((left, right) => {
    const leftCard = CARD_BY_ID[left.cardId];
    const rightCard = CARD_BY_ID[right.cardId];
    const leftThreat = (leftCard?.attack ?? 0) * 3 - left.currentHealth;
    const rightThreat = (rightCard?.attack ?? 0) * 3 - right.currentHealth;
    return rightThreat - leftThreat || left.currentHealth - right.currentHealth || left.instanceId.localeCompare(right.instanceId);
  })[0];
};

const targetForCard = (state: MatchState, card: CardDefinition, me: PlayerId): SpellTarget | undefined => {
  const refreshMove = card.effects.some((effect) => effect.kind === 'refresh-move');
  if (refreshMove) {
    const movedAlly = state.board
      .filter(
        (piece) =>
          piece.owner === me && piece.movedThisTurn && CARD_BY_ID[piece.cardId]?.type === 'unit',
      )
      .sort((left, right) => left.instanceId.localeCompare(right.instanceId))[0];
    return movedAlly ? { kind: 'piece', pieceId: movedAlly.instanceId } : undefined;
  }
  const friendlyBuff = card.effects.some((effect) => effect.kind === 'heal-unit' || effect.kind === 'grant-formation') || card.effects.some(
    (effect) => effect.kind === 'passive' && ['target-attack-until-end', 'target-permanent-buff', 'target-shield', 'target-petardazo'].includes(effect.id),
  );
  if (friendlyBuff) {
    const ally = state.board
      .filter((piece) => piece.owner === me && CARD_BY_ID[piece.cardId]?.type === 'unit')
      .sort((left, right) => {
        const attackDifference = (CARD_BY_ID[right.cardId]?.attack ?? 0) - (CARD_BY_ID[left.cardId]?.attack ?? 0);
        return attackDifference || left.instanceId.localeCompare(right.instanceId);
      })[0];
    return ally ? { kind: 'piece', pieceId: ally.instanceId } : undefined;
  }
  // A estas alturas ya se han resuelto los efectos con objetivo propio
  // (arriba); lo que quede que pida ficha es, por descarte, sobre una
  // enemiga. Usa la misma lista que valida el motor (`spellNeedsPiece`) en
  // vez de mantener aquí una copia — una copia separada fue justo lo que
  // dejó a Maldición Sombra sin detectar y a la IA lanzándola en vacío turno
  // tras turno sin que la partida avanzara nunca.
  if (!spellNeedsPiece(card)) return { kind: 'none' };
  const target = chooseEnemyTarget(state, card, me);
  return target ? { kind: 'piece', pieceId: target.instanceId } : undefined;
};

const chooseDeployment = (state: MatchState, me: PlayerId): Position | undefined => {
  const positions = getValidDeploymentPositions(state, me);
  if (positions.length === 0) return undefined;
  const enemyPieces = state.board.filter((piece) => piece.owner === rivalOf(me));
  return [...positions].sort((left, right) => {
    const proximity = (position: Position): number =>
      enemyPieces.length === 0
        ? distanceToCenter(position.x)
        : Math.min(...enemyPieces.map((piece) => Math.abs(position.x - piece.position.x)));
    return proximity(left) - proximity(right) || left.x - right.x;
  })[0];
};

/**
 * Colchón de Vida por debajo del cual la IA deja de pagar Ofrendas.
 *
 * Duna gana pagando con su Nexo, pero un bot que ofrenda siempre se suicida en
 * cinco turnos. Con este margen paga mientras va sobrada y aprieta el freno en
 * cuanto la partida se pone seria, que es más o menos lo que haría alguien.
 */
const AI_OFFERING_RESERVE = 12;

/** ¿Le conviene a la IA pagar la Ofrenda de esta carta? */
const shouldOffer = (state: MatchState, card: CardDefinition, me: PlayerId): boolean => {
  const base = offeringOf(card);
  if (base === undefined) return false;
  if (!canPayOffering(state, me, base)) return false;
  return state.players[me].nexusHealth - offeringCost(state, me, base) >= AI_OFFERING_RESERVE;
};

const actionForCard = (state: MatchState, instance: CardInstance, me: PlayerId): GameAction | undefined => {
  const card = CARD_BY_ID[instance.cardId];
  if (!card || card.type === 'mana') return undefined;
  if (!planManaPayment(state.players[me].resources, effectiveCost(state, me, card)).payable) return undefined;
  // El campo solo se añade cuando de verdad se ofrenda: así las acciones de
  // las otras seis facciones salen exactamente igual que antes.
  const offering = shouldOffer(state, card, me) ? { offering: true } : {};
  if (card.type === 'unit' || card.type === 'structure') {
    const position = chooseDeployment(state, me);
    return position
      ? { type: 'play-card', playerId: me, cardInstanceId: instance.instanceId, position, ...offering }
      : undefined;
  }
  const target = targetForCard(state, card, me);
  if (spellNeedsPiece(card) && (!target || target.kind !== 'piece')) return undefined;
  return { type: 'play-card', playerId: me, cardInstanceId: instance.instanceId, target, ...offering };
};

const chooseCardAction = (state: MatchState, skipped: ReadonlySet<string>, me: PlayerId, expired?: () => boolean): GameAction | undefined => {
  const faction = seatFaction(state, me);
  let baseline: number | undefined;
  const candidates = state.players[me].hand
    .filter((instance) => !skipped.has(instance.instanceId))
    .map((instance) => ({ instance, card: CARD_BY_ID[instance.cardId] }))
    .filter((candidate): candidate is { instance: CardInstance; card: CardDefinition } => Boolean(candidate.card))
    .sort((left, right) =>
      cardScore(right.card, faction) - cardScore(left.card, faction) ||
      stableTieBreaker(left.instance.instanceId, state.seed + state.turn) -
        stableTieBreaker(right.instance.instanceId, state.seed + state.turn),
    );
  const plans: { action: GameAction; score: number }[] = [];
  for (const candidate of candidates) {
    const displaces = candidate.card.type === 'instant' && candidate.card.effects.some(
      (effect) => effect.kind === 'push-target' || effect.kind === 'push-all-enemies',
    );
    if (displaces) {
      if (!planManaPayment(state.players[me].resources, effectiveCost(state, me, candidate.card)).payable) continue;
      if (expired?.()) continue;
      baseline ??= positionalValue(state, me, expired);
      if (expired?.()) continue;
      const plan = chooseDisplacement(state, candidate.instance, candidate.card, me, baseline, expired);
      if (plan) plans.push({ action: plan.action, score: cardScore(candidate.card, faction) + plan.value });
      continue;
    }
    const action = actionForCard(state, candidate.instance, me);
    if (action) plans.push({ action, score: cardScore(candidate.card, faction) });
  }
  return plans.sort((left, right) => right.score - left.score)[0]?.action;
};

const targetScore = (state: MatchState, pieceId: string): number => {
  const piece = state.board.find((candidate) => candidate.instanceId === pieceId);
  if (!piece) return Number.NEGATIVE_INFINITY;
  const definition = CARD_BY_ID[piece.cardId];
  return (definition?.attack ?? 0) * 4 + (definition?.type === 'structure' ? 2 : 0) - piece.currentHealth;
};

/** Lo que vale una ficha en el tablero: perderla o matarla pesa esto. */
const pieceValue = (piece: BoardPiece): number => {
  const definition = CARD_BY_ID[piece.cardId];
  if (!definition) return 0;
  const keywordBonus =
    (definition.keywords.includes('guard') ? 2 : 0) +
    (definition.keywords.includes('flying') ? 2 : 0) +
    (definition.keywords.includes('lifelink') ? 2 : 0) +
    (definition.keywords.includes('pierce') ? 2 : 0) +
    (definition.keywords.includes('stun') ? 2 : 0);
  return (definition.attack ?? 0) * 2 + piece.currentHealth + keywordBonus;
};

/** Daño que reparte `piece` al atacar, con sus modificadores ya aplicados. */
const attackPower = (state: MatchState, piece: BoardPiece, target?: Position): number => {
  const source = CARD_BY_ID[piece.cardId];
  const definition = source && piece.statuses.some((status) => status.kind === 'silenced')
    ? { ...source, effects: [] }
    : source && piece.sparkFace ? { ...source, effects: sparkEffects(source.effects, piece.sparkFace) } : source;
  if (!definition || definition.attack === undefined) return 0;
  const onAttackBuff = definition.effects.find((effect) => effect.kind === 'buff-self-on-attack');
  const dischargeBonus = target && hasDischarge(state, piece) && dischargeLine(state, piece, target).throughAlly
    ? 2 + (definition.id === 'mosquetero-veterano' ? 1 : 0) : 0;
  return Math.max(0, definition.attack + piece.attackModifier +
    (definition.type === 'unit' ? runoAttackBonus(state.players[piece.owner].runo ?? 0) : 0) +
    formationAttackBonus(state, piece) + (onAttackBuff?.kind === 'buff-self-on-attack' ? onAttackBuff.attack : 0) + dischargeBonus +
    (target && hasDischarge(state, piece) ? state.players[piece.owner].dischargeDamageBonusThisTurn ?? 0 : 0));
};

/**
 * Cuánto gana la IA con un intercambio concreto. Positivo = le compensa.
 *
 * Suma lo que destruye y resta lo que va a perder por el contragolpe: por eso
 * la IA difícil no lanza un 2/2 contra un Guardia 4/5 solo porque «podía
 * atacar», que es justo lo que hace la normal.
 */
const tradeValue = (state: MatchState, attacker: BoardPiece, defender: BoardPiece): number => {
  // La retirada es temporal: conserva valor táctico, pero no equivale a
  // destruir definitivamente ni permite contar un contragolpe inexistente.
  if (attackSinksDefender(state, attacker, defender)) return pieceValue(defender) * 0.65;
  const attackerCard = CARD_BY_ID[attacker.cardId];
  const damage = attackPower(state, attacker, defender.position);
  const defenderDies = damage >= defender.currentHealth;
  // El contragolpe solo existe cuerpo a cuerpo y si la defensora tiene Ataque.
  const meleeRange = (attackerCard?.range ?? 1) === 1;
  const retaliation = meleeRange ? attackPower(state, defender) : 0;
  const attackerDies = retaliation >= attacker.currentHealth;
  let value = defenderDies ? pieceValue(defender) : Math.min(damage, defender.currentHealth);
  if (attackerDies) value -= pieceValue(attacker);
  // Rematar a la defensora con Perforar además empuja daño al Nexo.
  if (defenderDies && attackerCard?.keywords.includes('pierce')) {
    value += Math.max(0, damage - defender.currentHealth) * NEXUS_DAMAGE_WEIGHT;
  }
  return value;
};

/**
 * La distancia por sí sola engaña: un Sabueso empujado aún puede volver y
 * golpear. Se cede el turno con el motor para respetar mantenimiento, estados
 * y modificadores, y se prueba también cada movimiento legal antes del golpe.
 * Es una cota conservadora: las amenazas se miran por separado, sin planear
 * combinaciones de varias unidades ni las cartas de la mano rival.
 */
const nextNexusThreat = (state: MatchState, me: PlayerId, expired?: () => boolean): number => {
  const ended = applyAction(state, { type: 'end-turn', playerId: me });
  if (!ended.ok) return 0;
  const next = ended.state;
  if (next.phase === 'finished') return next.winner === me ? -1000 : 1000;
  let damage = 0;
  for (const piece of next.board) {
    if (expired?.()) break;
    if (piece.owner === me || CARD_BY_ID[piece.cardId]?.type !== 'unit') continue;
    const nexusDamage = (positioned: MatchState): number => {
      if (!getValidAttacks(positioned, piece.instanceId).canAttackNexus) return 0;
      const hit = applyAction(positioned, {
        type: 'attack-nexus', playerId: piece.owner, attackerId: piece.instanceId,
      });
      return hit.ok ? Math.max(0, positioned.players[me].nexusHealth - hit.state.players[me].nexusHealth) : 0;
    };
    let best = nexusDamage(next);
    for (const to of getValidMoves(next, piece.instanceId)) {
      if (expired?.()) break;
      const moved = applyAction(next, { type: 'move', playerId: piece.owner, pieceId: piece.instanceId, to });
      if (moved.ok) best = Math.max(best, nexusDamage(moved.state));
    }
    damage += best;
  }
  // Evitar un remate pesa más que todo el material; con Vida de sobra se
  // conserva el tempo de desplegar en vez de gastar todo en empujes menores.
  return damage * 4 + (damage >= next.players[me].nexusHealth ? 1000 : 0);
};

const positionalValue = (state: MatchState, me: PlayerId, expired?: () => boolean): number => {
  if (state.phase === 'finished') return state.winner === me ? 10000 : -10000;
  let value = (state.players[me].nexusHealth - state.players[rivalOf(me)].nexusHealth) * 4;
  for (const piece of state.board) {
    if (expired?.()) break;
    value += pieceValue(piece) * (piece.owner === me ? 1 : -1);
    if (piece.owner !== me) {
      // Un empuje que aún no evita daño compra distancia para turnos futuros,
      // pero ese valor pequeño no debe imponerse a una defensa inmediata.
      if (CARD_BY_ID[piece.cardId]?.type === 'unit') {
        value += distanceToEnemyNexusRow(piece.owner, piece.position.y) * 0.5;
      }
      continue;
    }
    const attacks = getValidAttacks(state, piece.instanceId);
    let best = attacks.canAttackNexus ? attackPower(state, piece, { x: piece.position.x, y: nexusRow(rivalOf(piece.owner)) }) * NEXUS_DAMAGE_WEIGHT : 0;
    for (const defenderId of attacks.pieceIds) {
      const defender = state.board.find((candidate) => candidate.instanceId === defenderId);
      if (defender) best = Math.max(best, tradeValue(state, piece, defender));
    }
    value += best;
  }
  return value - nextNexusThreat(state, me, expired);
};

const chooseDisplacement = (
  state: MatchState,
  instance: CardInstance,
  card: CardDefinition,
  me: PlayerId,
  baseline: number,
  expired?: () => boolean,
): { action: GameAction; value: number } | undefined => {
  const targets: SpellTarget[] = spellNeedsPiece(card)
    ? validSpellTargets(state, me, card)
      .slice().sort((left, right) => left.instanceId.localeCompare(right.instanceId))
      .map((piece) => ({ kind: 'piece', pieceId: piece.instanceId }))
    : [{ kind: 'none' }];
  let best: { action: GameAction; value: number } | undefined;
  for (const target of targets) {
    if (expired?.()) break;
    const action: GameAction = { type: 'play-card', playerId: me, cardInstanceId: instance.instanceId, target };
    const result = applyAction(state, action);
    if (!result.ok) continue;
    const value = positionalValue(result.state, me, expired) - baseline;
    if (expired?.()) break;
    // No gastar una carta contra un inmune, un borde o una atracción que
    // solo acerca al rival al Nexo. El motor sigue permitiendo esas jugadas.
    if (value > 0 && (!best || value > best.value)) best = { action, value };
  }
  return best;
};

/**
 * Cuánto vale cada punto de daño al Nexo frente a un intercambio de fichas.
 *
 * Valor calibrado a base de simular, no elegido a ojo: ver
 * `ai-strength-sim.test.ts`. Pesos altos (10-40) hacen que la difícil corra al
 * Nexo ignorando el tablero y PIERDA contra la normal (45-48%); por debajo de
 * 1 se estabiliza en un 57% de victorias. Un golpe letal se trata aparte, como
 * infinito, así que bajar este peso nunca le hace perder un remate.
 */
const NEXUS_DAMAGE_WEIGHT = 0.5;

interface AttackPlan {
  readonly action: GameAction;
  readonly value: number;
  /** Solo para desempatar de forma determinista. */
  readonly key: string;
}

/**
 * Plan de ataque de la IA difícil: mira todos los pares atacante-objetivo del
 * tablero de una vez, en lugar de recorrer sus fichas en orden fijo y lanzar
 * la primera que tenga algo a tiro.
 */
const chooseBestAttack = (state: MatchState, me: PlayerId): GameAction | undefined => {
  const enemy = state.players[rivalOf(me)];
  const plans: AttackPlan[] = [];
  for (const piece of state.board) {
    if (piece.owner !== me) continue;
    const attacks = getValidAttacks(state, piece.instanceId);
    if (attacks.canAttackNexus) {
      const damage = attackPower(state, piece, { x: piece.position.x, y: nexusRow(rivalOf(piece.owner)) });
      const lethal = damage >= enemy.nexusHealth;
      plans.push({
        action: { type: 'attack-nexus', playerId: me, attackerId: piece.instanceId },
        // Un golpe letal termina la partida: nada puede valer más que eso.
        value: lethal ? Number.POSITIVE_INFINITY : damage * NEXUS_DAMAGE_WEIGHT,
        key: `nexus-${piece.instanceId}`,
      });
    }
    for (const defenderId of attacks.pieceIds) {
      const defender = state.board.find((candidate) => candidate.instanceId === defenderId);
      if (!defender) continue;
      plans.push({
        action: { type: 'attack-piece', playerId: me, attackerId: piece.instanceId, defenderId },
        value: tradeValue(state, piece, defender),
        key: `piece-${piece.instanceId}-${defenderId}`,
      });
    }
  }
  // Siempre se ataca si hay con qué: se probó a que la difícil rechazara los
  // intercambios malos y salía perdiendo (45-50% frente al 57% de atacar
  // siempre). Quedarse quieta le regala el tempo al rival, y la ficha que
  // «salva» acaba muriendo igual un turno después. Lo que la hace fuerte no es
  // atacar menos, sino elegir mejor con qué ficha y contra cuál.
  const best = plans.sort((left, right) => right.value - left.value || left.key.localeCompare(right.key))[0];
  return best?.action;
};

const chooseMove = (state: MatchState, pieceId: string, me: PlayerId): Position | undefined => {
  const moves = getValidMoves(state, pieceId);
  const rival = rivalOf(me);
  return [...moves].sort((left, right) => {
    // Avanza hacia el Nexo rival y prefiere casillas con objetivos adyacentes.
    const leftDistance = distanceToEnemyNexusRow(me, left.y);
    const rightDistance = distanceToEnemyNexusRow(me, right.y);
    const leftTargets = state.board.filter((piece) => piece.owner === rival && Math.abs(piece.position.x - left.x) + Math.abs(piece.position.y - left.y) === 1).length;
    const rightTargets = state.board.filter((piece) => piece.owner === rival && Math.abs(piece.position.x - right.x) + Math.abs(piece.position.y - right.y) === 1).length;
    return rightTargets - leftTargets || leftDistance - rightDistance || left.x - right.x;
  })[0];
};

const actWithPiece = (state: MatchState, pieceId: string, me: PlayerId): MatchState => {
  let next = state;
  let attacks = getValidAttacks(next, pieceId);
  if (attacks.canAttackNexus) {
    const result = applyAction(next, { type: 'attack-nexus', playerId: me, attackerId: pieceId });
    return result.ok ? result.state : next;
  }
  if (attacks.pieceIds.length > 0) {
    const targetId = [...attacks.pieceIds].sort(
      (left, right) => targetScore(next, right) - targetScore(next, left) || left.localeCompare(right),
    )[0];
    if (targetId) {
      const result = applyAction(next, { type: 'attack-piece', playerId: me, attackerId: pieceId, defenderId: targetId });
      return result.ok ? result.state : next;
    }
  }
  const move = chooseMove(next, pieceId, me);
  if (move) {
    const result = applyAction(next, { type: 'move', playerId: me, pieceId, to: move });
    if (result.ok) next = result.state;
  }
  attacks = getValidAttacks(next, pieceId);
  if (attacks.canAttackNexus) {
    const result = applyAction(next, { type: 'attack-nexus', playerId: me, attackerId: pieceId });
    return result.ok ? result.state : next;
  }
  const targetId = [...attacks.pieceIds].sort(
    (left, right) => targetScore(next, right) - targetScore(next, left) || left.localeCompare(right),
  )[0];
  if (targetId) {
    const result = applyAction(next, { type: 'attack-piece', playerId: me, attackerId: pieceId, defenderId: targetId });
    if (result.ok) next = result.state;
  }
  return next;
};

/**
 * Decide la SIGUIENTE acción individual de la IA para el estado actual.
 * Permite reproducir el turno rival paso a paso, con una animación por acción.
 * Devuelve siempre una acción legal según las validaciones locales; si no queda
 * nada útil por hacer, devuelve el fin de turno.
 */
/**
 * Turno a partir del cual la IA se plantea gastar el poder del comandante aun
 * sin una jugada redonda. Antes de eso prefiere guardarlo: es una sola vez por
 * partida y quemarlo en el turno 2 contra una unidad de 2 de Vida es tirarlo.
 */
const POWER_PATIENCE_TURN = 8;

/**
 * El poder del comandante, una vez por partida.
 *
 * La IA no lo usaba NUNCA, así que el jugador tenía una jugada grande que su
 * rival jamás respondía. Aquí se decide cuándo merece la pena, mirando qué
 * hace el poder en concreto y no solo si se puede pagar.
 */
const choosePowerAction = (state: MatchState, me: PlayerId): GameAction | undefined => {
  const player = state.players[me];
  if (player.commanderPowerUsed) return undefined;
  const power = COMMANDER_BY_ID[player.commanderId]?.power;
  if (!power) return undefined;
  if (!planManaPayment(player.resources, power.cost).payable) return undefined;

  const enemyId: PlayerId = me === 'player' ? 'ai' : 'player';
  const enemyUnits = state.board.filter(
    (piece) => piece.owner === enemyId && CARD_BY_ID[piece.cardId]?.type === 'unit',
  );
  const maxHealth = COMMANDER_BY_ID[player.commanderId]?.nexusHealth ?? 35;
  const herido = player.nexusHealth <= maxHealth * 0.6;
  const tarde = state.turn >= POWER_PATIENCE_TURN;

  const efecto = (kind: string) => power.effects.find((candidate) => candidate.kind === kind);
  const ownUnits = state.board.filter((piece) => piece.owner === me && CARD_BY_ID[piece.cardId]?.type === 'unit');
  if (efecto('choose-sinks') && enemyUnits.length >= 2) return { type: 'commander-power', playerId: me };
  if (efecto('formation-protection') && enemyUnits.length && ownUnits.filter((piece) => formationAttackBonus(state, piece) > 0).length >= 2) return { type: 'commander-power', playerId: me };
  if (efecto('grant-petardazo-all') && ownUnits.length >= 2 && ownUnits.some((own) => enemyUnits.some((enemy) => Math.abs(own.position.x - enemy.position.x) + Math.abs(own.position.y - enemy.position.y) === 1))) return { type: 'commander-power', playerId: me };
  const barrido = efecto('damage-all-enemies');
  const cura = efecto('heal-nexus');
  const golpe = efecto('damage');

  // Barrido: se guarda para cuando haya al menos dos unidades a las que pillar,
  // o una sola que muera con él.
  if (barrido?.kind === 'damage-all-enemies') {
    const mata = enemyUnits.filter((piece) => piece.currentHealth <= barrido.amount).length;
    if (enemyUnits.length >= 2 || mata >= 1) {
      return { type: 'commander-power', playerId: me };
    }
  }

  // Golpe dirigido: contra la unidad más peligrosa, y mejor si la mata.
  if (golpe?.kind === 'damage' && power.needsEnemyTarget) {
    const objetivo = [...enemyUnits].sort((left, right) => {
      const muereL = left.currentHealth <= golpe.amount ? 1 : 0;
      const muereR = right.currentHealth <= golpe.amount ? 1 : 0;
      if (muereL !== muereR) return muereR - muereL;
      const atkL = (CARD_BY_ID[left.cardId]?.attack ?? 0) + left.attackModifier;
      const atkR = (CARD_BY_ID[right.cardId]?.attack ?? 0) + right.attackModifier;
      return atkR - atkL;
    })[0];
    if (objetivo && (objetivo.currentHealth <= golpe.amount || tarde)) {
      return { type: 'commander-power', playerId: me, target: { kind: 'piece', pieceId: objetivo.instanceId } };
    }
  }

  // Curación: solo cuando de verdad hace falta, y sin desperdiciarla estando
  // casi a tope.
  if (cura?.kind === 'heal-nexus' && herido && !power.needsEnemyTarget) {
    return { type: 'commander-power', playerId: me };
  }

  // Último recurso: partida larga, poder sin gastar y algo a lo que apuntar.
  if (tarde && !power.needsEnemyTarget && power.effects.length > 0) {
    return { type: 'commander-power', playerId: me };
  }
  if (tarde && power.needsEnemyTarget && enemyUnits[0]) {
    return { type: 'commander-power', playerId: me, target: { kind: 'piece', pieceId: enemyUnits[0].instanceId } };
  }
  return undefined;
};

const chooseBoardAction = (state: MatchState, me: PlayerId): GameAction | undefined => {
  const decision = state.pendingDecisions?.[0];
  if (!decision || decision.owner !== me) return undefined;
  const score = (position: MatchState): number => position.winner ? (position.winner === me ? 1e6 : -1e6) :
    position.board.reduce((sum, piece) => sum + ((CARD_BY_ID[piece.cardId]?.attack ?? 0) * 2 + piece.currentHealth
      + formationAttackBonus(position, piece) * 2 - distanceToEnemyNexusRow(piece.owner, piece.position.y) * 0.15) * (piece.owner === me ? 1 : -1), 0)
    + (position.players[me].nexusHealth - position.players[rivalOf(me)].nexusHealth) * 3;
  const skip: GameAction = { type: 'resolve-choice', playerId: me, decisionId: decision.id, skip: true };
  let best: { action: GameAction; value: number } | undefined = decision.optional ? { action: skip, value: score(state) } : undefined;
  for (const option of decisionOptions(state, decision)) {
    const action: GameAction = { type: 'resolve-choice', playerId: me, decisionId: decision.id, ...option };
    const result = applyAction(state, action);
    if (!result.ok) continue;
    const value = score(result.state);
    if (!best || value > best.value) best = { action, value };
  }
  return best?.action ?? skip;
};

const chooseSparkAction = (state: MatchState, me: PlayerId, tactical = false): GameAction | undefined => {
  const pending = state.pendingSpark;
  if (!pending || pending.owner !== me) return undefined;
  const instance = state.players[me].hand.find((card) => card.instanceId === pending.cardInstanceId);
  const card = instance ? CARD_BY_ID[instance.cardId] : undefined;
  if (!card) return undefined;
  let best: { action: GameAction; value: number } | undefined;
  for (const face of [...new Set(pending.faces)]) {
    const resolved = { ...card, effects: sparkEffects(card.effects, face) };
    const targets = card.type === 'instant' ? validSpellTargets(state, me, resolved) : [];
    // Una cara sin objetivo legal se puede consumir sin blanco. El motor
    // distingue un objetivo ausente de una selección explícita inválida.
    const options: (SpellTarget | undefined)[] = targets.length
      ? targets.map((piece) => ({ kind: 'piece', pieceId: piece.instanceId }))
      : [undefined];
    for (const target of options) {
      const action: GameAction = { type: 'choose-spark', playerId: me, face, target };
      const result = applyAction(state, action);
      if (!result.ok) continue;
      const next = result.state;
      const material = next.board.reduce((sum, piece) => sum + ((CARD_BY_ID[piece.cardId]?.attack ?? 0) * 2 + piece.currentHealth) * (piece.owner === me ? 1 : -1), 0);
      const value = next.winner ? (next.winner === me ? 1e6 : -1e6) : material + (next.players[me].nexusHealth - next.players[rivalOf(me)].nexusHealth) * 3 + (next.players[me].hand.length - next.players[rivalOf(me)].hand.length) * 2;
      const score = tactical ? tacticalValue(next, me) : value;
      if (!best || score > best.value) best = { action, value: score };
    }
  }
  return best?.action;
};

export const chooseBaselineAiAction = (
  state: MatchState,
  skippedCardIds: ReadonlySet<string> = new Set(),
  difficulty: AiDifficulty = 'normal',
  me: PlayerId = 'ai',
  expired?: () => boolean,
): GameAction => {
  const endTurn: GameAction = { type: 'end-turn', playerId: me };
  if (state.activePlayer !== me || state.phase === 'finished') return endTurn;
  if (state.pendingSpark) return chooseSparkAction(state, me) ?? endTurn;
  if (state.pendingDecisions?.length) return chooseBoardAction(state, me) ?? endTurn;

  const resource = state.players[me].hand.find((instance) => CARD_BY_ID[instance.cardId]?.type === 'mana');
  if (resource && !state.players[me].resourcePlayedThisTurn && !skippedCardIds.has(resource.instanceId)) {
    return { type: 'play-resource', playerId: me, cardInstanceId: resource.instanceId };
  }

  // El poder va ANTES de jugar cartas: un barrido que despeja el tablero
  // cambia qué despliegue tiene sentido después.
  const powerAction = choosePowerAction(state, me);
  if (powerAction) return powerAction;

  const cardAction = chooseCardAction(state, skippedCardIds, me, expired);
  if (cardAction) return cardAction;

  // En difícil el combate se decide mirando el tablero entero de una vez y
  // eligiendo el mejor intercambio, no ficha por ficha en orden fijo.
  if (difficulty === 'hard') {
    const best = chooseBestAttack(state, me);
    if (best) return best;
  }

  const pieces = state.board
    .filter((piece) => piece.owner === me)
    .sort((left, right) => left.instanceId.localeCompare(right.instanceId));
  if (difficulty !== 'hard') {
    for (const piece of pieces) {
      const attacks = getValidAttacks(state, piece.instanceId);
      // En fácil la IA no remata el Nexo: pelea en el tablero y deja respirar al jugador.
      if (attacks.canAttackNexus && difficulty !== 'easy') {
        return { type: 'attack-nexus', playerId: me, attackerId: piece.instanceId };
      }
      if (attacks.pieceIds.length > 0) {
        const targetId = [...attacks.pieceIds].sort(
          (left, right) => targetScore(state, right) - targetScore(state, left) || left.localeCompare(right),
        )[0];
        if (targetId) {
          return { type: 'attack-piece', playerId: me, attackerId: piece.instanceId, defenderId: targetId };
        }
      }
    }
  }
  for (const piece of pieces) {
    if (piece.movedThisTurn) continue;
    const move = chooseMove(state, piece.instanceId, me);
    if (move) return { type: 'move', playerId: me, pieceId: piece.instanceId, to: move };
  }
  return endTurn;
};

/** La simulación A/B usa esta misma entrada con un límite de nodos fijo. */
export const chooseNextAiAction = (
  state: MatchState,
  skipped: ReadonlySet<string> = new Set(),
  difficulty: AiDifficulty = 'normal',
  me: PlayerId = 'ai',
  budget: TacticalBudget = BATTLE_TACTICAL_BUDGET,
): GameAction => {
  const faction = seatFaction(state, me);
  const scoped = difficulty !== 'easy' && (faction === 'tercios' || faction === 'marea' || faction === 'duna' || faction === 'goblins');
  const started = performance.now();
  const timeout = scoped ? budget.maxMs : undefined;
  const fallback = chooseBaselineAiAction(state, skipped, difficulty, me,
    timeout === undefined ? undefined : () => performance.now() - started >= timeout * .5);
  if (difficulty === 'easy' || state.winner || state.activePlayer !== me || state.pendingDecisions?.length) return fallback;
  if (faction === 'goblins' && state.pendingSpark) return chooseSparkAction(state, me, true) ?? fallback;
  if (state.pendingSpark || (faction !== 'tercios' && faction !== 'marea' && faction !== 'duna' && faction !== 'goblins')) return fallback;
  if (fallback.type === 'play-resource' || fallback.type === 'commander-power') return fallback;
  const card = fallback.type === 'play-card' ? CARD_BY_ID[state.players[me].hand.find((item) => item.instanceId === fallback.cardInstanceId)?.cardId ?? ''] : undefined;
  if (card?.effects.some((effect) => effect.kind === 'spark')) return fallback;
  if (faction === 'duna' && (!card || (offeringOf(card) === undefined && !card.effects.some((effect) => effect.kind === 'judgement')))) return fallback;
  if (!state.board.length && faction !== 'duna') return fallback;
  return planTacticalAction(state, me, faction, skipped, fallback, timeout === undefined ? budget : {
    ...budget, maxMs: Math.max(0, timeout - (performance.now() - started)),
  });
};

/** Runs a complete, bounded and deterministic AI turn, always yielding control when possible. */
export const runAiTurn = (state: MatchState, me: PlayerId = 'ai'): MatchState => {
  if (state.activePlayer !== me || state.phase === 'finished') return state;
  let next = state;
  let actions = 0;
  const resource = next.players[me].hand.find((instance) => CARD_BY_ID[instance.cardId]?.type === 'mana');
  if (resource && !next.players[me].resourcePlayedThisTurn && !next.pendingSpark && !next.pendingDecisions?.length) {
    const result = applyAction(next, { type: 'play-resource', playerId: me, cardInstanceId: resource.instanceId });
    if (result.ok) {
      next = result.state;
      actions += 1;
    }
  }

  const skipped = new Set<string>();
  while (actions < MAX_AI_ACTIONS && next.phase !== 'finished') {
    if (next.pendingDecisions?.length) {
      const choice = chooseBoardAction(next, me);
      if (!choice) break;
      const chosen = applyAction(next, choice);
      if (!chosen.ok) break;
      next = chosen.state;
      actions += 1;
      continue;
    }
    if (next.pendingSpark) {
      const choice = chooseSparkAction(next, me);
      if (!choice) break;
      const chosen = applyAction(next, choice);
      if (!chosen.ok) break;
      next = chosen.state;
      actions += 1;
      continue;
    }
    const action = chooseCardAction(next, skipped, me);
    if (!action || action.type !== 'play-card') break;
    const result = applyAction(next, action);
    if (!result.ok) {
      skipped.add(action.cardInstanceId);
    } else {
      next = result.state;
      actions += 1;
    }
  }

  const pieceIds = next.board
    .filter((piece) => piece.owner === me)
    .map((piece) => piece.instanceId)
    .sort();
  for (const pieceId of pieceIds) {
    if (actions >= MAX_AI_ACTIONS || next.phase === 'finished') break;
    const before = next;
    next = actWithPiece(next, pieceId, me);
    if (next !== before) actions += 1;
  }
  if (next.phase === 'finished') return next;
  const ended = applyAction(next, { type: 'end-turn', playerId: me });
  return ended.ok ? ended.state : next;
};
