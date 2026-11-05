import { describe, expect, it } from 'vitest';
import { CARD_BY_ID } from './cards';
import { STARTER_DECKS } from './decks';
import { applyAction, canPlayHandCard, createMatch, handCardCost, validSpellTargets } from './engine';
import type { BoardPiece, MatchState, PlayerId, Position } from './types';

/**
 * Regresión de dos bugs reales de resaltado de objetivo: `BattlePage.tsx`
 * mantenía su propio filtro a mano (enemyOnly/friendlyOnly/unitsOnly) que no
 * conocía dos reglas del motor, así que resaltaba fichas como «objetivo
 * válido» que el motor iba a rechazar igual al clicarlas. `validSpellTargets`
 * reemplaza ese filtro reutilizando la validación real del motor.
 */

/**
 * Partida de pruebas SIN terreno: estos tests colocan piezas en casillas
 * concretas y disparan en línea recta, así que unas ruinas repartidas por la
 * semilla romperían el caso por un motivo que no es el que se está probando.
 * El terreno tiene sus propios tests en `terrain.test.ts`.
 */
const freshMatch = (seed = 42): MatchState => ({ ...createMatch(STARTER_DECKS[0]!, STARTER_DECKS[1]!, seed), terrain: [] });

const makePiece = (
  instanceId: string,
  cardId: string,
  owner: PlayerId,
  position: Position,
  options: Partial<BoardPiece> = {},
): BoardPiece => {
  const card = CARD_BY_ID[cardId]!;
  return {
    instanceId,
    cardId,
    owner,
    position,
    currentHealth: card.health ?? card.resistance ?? 1,
    attackModifier: 0,
    movedThisTurn: false,
    attackedThisTurn: false,
    enteredOnTurn: 0,
    statuses: [],
    ...options,
  };
};

describe('validSpellTargets', () => {
  it('Maldición Sombra solo resalta fichas enemigas, nunca las propias', () => {
    const state = {
      ...freshMatch(),
      board: [
        makePiece('propia', 'sabueso-brasa', 'player', { x: 1, y: 1 }),
        makePiece('rival', 'sabueso-brasa', 'ai', { x: 1, y: 2 }),
      ],
    };
    const targets = validSpellTargets(state, 'player', CARD_BY_ID['maldicion-sombra']!);
    expect(targets.map((piece) => piece.instanceId)).toEqual(['rival']);
  });

  it('Juicio Divino solo resalta enemigos con 2 Vida o menos', () => {
    const state = {
      ...freshMatch(),
      board: [
        makePiece('debil', 'sabueso-brasa', 'ai', { x: 1, y: 1 }, { currentHealth: 2 }),
        makePiece('fuerte', 'oso-forestal', 'ai', { x: 1, y: 2 }, { currentHealth: 4 }),
      ],
    };
    const targets = validSpellTargets(state, 'player', CARD_BY_ID['juicio-divino']!);
    expect(targets.map((piece) => piece.instanceId)).toEqual(['debil']);
  });

  it('lanzar Juicio Divino sobre un objetivo con más de 2 Vida lo rechaza el motor, como dice el resaltado', () => {
    const base = freshMatch();
    const state: MatchState = {
      ...base,
      board: [makePiece('fuerte', 'oso-forestal', 'ai', { x: 1, y: 2 }, { currentHealth: 4 })],
      players: {
        ...base.players,
        player: {
          ...base.players.player,
          hand: [{ instanceId: 'hand-juicio', cardId: 'juicio-divino' }],
          resources: [
            { instanceId: 'r1', cardId: 'fuente-orden', faction: 'order', exhausted: false },
            { instanceId: 'r2', cardId: 'fuente-orden', faction: 'order', exhausted: false },
            { instanceId: 'r3', cardId: 'fuente-orden', faction: 'order', exhausted: false },
            { instanceId: 'r4', cardId: 'fuente-orden', faction: 'order', exhausted: false },
          ],
        },
      },
    };
    // Sin la carta ni la ficha rechazadas de antemano, la falta de objetivo
    // válido es la ÚNICA razón por la que el motor puede rechazar la jugada.
    expect(validSpellTargets(state, 'player', CARD_BY_ID['juicio-divino']!)).toHaveLength(0);
    const result = applyAction(state, {
      type: 'play-card', playerId: 'player', cardInstanceId: 'hand-juicio',
      target: { kind: 'piece', pieceId: 'fuerte' },
    });
    expect(result.ok).toBe(false);
    expect(result.ok || result.error?.message).toBe('Solo puede destruir una unidad enemiga con 2 Vida o menos.');
  });

  it('el mensaje de rechazo dice CUÁL es la regla incumplida, no solo que el objetivo no vale', () => {
    const base = freshMatch();
    const state: MatchState = {
      ...base,
      board: [makePiece('propia', 'sabueso-brasa', 'player', { x: 1, y: 1 })],
      players: {
        ...base.players,
        player: {
          ...base.players.player,
          hand: [{ instanceId: 'hand-curse', cardId: 'maldicion-sombra' }],
          resources: [
            { instanceId: 'r1', cardId: 'fuente-furia', faction: 'shadow', exhausted: false },
            { instanceId: 'r2', cardId: 'fuente-furia', faction: 'shadow', exhausted: false },
            { instanceId: 'r3', cardId: 'fuente-furia', faction: 'shadow', exhausted: false },
          ],
        },
      },
    };
    // Maldición Sombra sobre la propia ficha: el motor lo rechaza por ser
    // propia, no por falta de objetivo — antes ambos casos decían lo mismo.
    const result = applyAction(state, {
      type: 'play-card', playerId: 'player', cardInstanceId: 'hand-curse',
      target: { kind: 'piece', pieceId: 'propia' },
    });
    expect(result.ok).toBe(false);
    expect(result.ok || result.error?.message).toBe('Solo puede apuntar a una ficha enemiga.');
  });

  it('una carta sin objetivo no propone ninguna ficha', () => {
    const state = {
      ...freshMatch(),
      board: [makePiece('cualquiera', 'sabueso-brasa', 'ai', { x: 1, y: 1 })],
    };
    expect(validSpellTargets(state, 'player', CARD_BY_ID['pacto-ascuas']!)).toHaveLength(0);
  });
});

describe('coste y disponibilidad de una carta en mano', () => {
  it('cobra a la copia el mismo coste que anuncia tras Renacer y el Mandato', () => {
    const state = freshMatch();
    const card = CARD_BY_ID['dragon-caldera']!;
    const copy = { instanceId: 'dragón-rebajado', cardId: card.id, costDiscount: 2 };
    const resources = Array.from({ length: 4 }, (_, i) => ({
      instanceId: `fuente-${i}`, cardId: 'fuente-furia', faction: 'fury' as const, exhausted: false,
    }));
    const match: MatchState = {
      ...state, activePlayer: 'player', phase: 'main', mandate: 'player', board: [],
      players: { ...state.players, player: {
        ...state.players.player, commanderId: 'xiwangmu-la-reina-madre',
        firstCardDiscountUsedThisTurn: false, hand: [copy], resources,
      } },
    };
    expect(handCardCost(match, 'player', card, copy)).toEqual({ generic: 2, colored: { fury: 2 } });
    expect(canPlayHandCard(match, 'player', card, copy)).toBe(true);
    const played = applyAction(match, { type: 'play-card', playerId: 'player', cardInstanceId: copy.instanceId, position: { x: 3, y: 7 } });
    expect(played.ok).toBe(true);
    expect(played.state.players.player.resources.every(({ exhausted }) => exhausted)).toBe(true);
    expect(played.state.players.player.firstCardDiscountUsedThisTurn).toBe(true);
  });

  it('solo indica que un hechizo está listo si hay un objetivo válido', () => {
    const state = freshMatch();
    const card = CARD_BY_ID['lluvia-ceniza']!;
    const copy = { instanceId: 'ceniza', cardId: card.id };
    const match: MatchState = {
      ...state, activePlayer: 'player', phase: 'main', board: [],
      players: { ...state.players, player: {
        ...state.players.player, hand: [copy],
        resources: Array.from({ length: 3 }, (_, i) => ({
          instanceId: `fuente-${i}`, cardId: 'fuente-furia', faction: 'fury' as const, exhausted: false,
        })),
      } },
    };
    expect(canPlayHandCard(match, 'player', card, copy)).toBe(false);
    const rival = makePiece('rival', 'sabueso-brasa', 'ai', { x: 3, y: 3 });
    expect(canPlayHandCard({ ...match, board: [rival] }, 'player', card, copy)).toBe(true);
  });
});
