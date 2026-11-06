import { describe, expect, it } from 'vitest';
import { CARD_BY_ID, CARDS } from './cards';
import { STARTER_DECKS } from './decks';
import { applyAction, createMatch } from './engine';
import { effectiveAttack, isChallenge, isFurious } from './fimbul';
import type { BoardPiece, MatchState, PlayerId, Position } from './types';

/**
 * Fimbul, «El invierno que no termina»: sus dos mecánicas.
 *
 * **Desafío** premia atacar a lo grande, no a lo pequeño. **Furor** premia
 * haber recibido daño ya. Las dos son condiciones puras sobre datos que el
 * motor ya conocía, así que las pruebas se centran en verificar que cada
 * carta engancha bien con `isChallenge`/`isFurious`, no en reinventar su
 * lógica.
 */
const fimbulMatch = (): MatchState => {
  const fimbul = STARTER_DECKS.find((deck) => deck.faction === 'fimbul')!;
  const rival = STARTER_DECKS.find((deck) => deck.faction === 'fury')!;
  return { ...createMatch(fimbul, rival, 7), terrain: [] };
};

const withPlayer = (
  state: MatchState,
  playerId: PlayerId,
  values: Partial<MatchState['players'][PlayerId]>,
): MatchState => ({
  ...state,
  players: { ...state.players, [playerId]: { ...state.players[playerId], ...values } },
});

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

describe('el catálogo de Fimbul', () => {
  it('trae 31 cartas de la facción, con fuente propia y mazo jugable', () => {
    const fimbul = CARDS.filter((card) => card.faction === 'fimbul');
    expect(fimbul).toHaveLength(31);
    expect(fimbul.filter((card) => card.type === 'mana')).toHaveLength(1);
    const deck = STARTER_DECKS.find((candidate) => candidate.faction === 'fimbul');
    expect(deck?.commanderId).toBe('hildr-la-que-elige');
  });
});

describe('Desafío e Furor: las condiciones puras', () => {
  it('isChallenge se cumple cuando el defensor iguala o supera el Ataque del atacante', () => {
    const escudero = CARD_BY_ID['escudero-del-thing']!;
    const debil = makePiece('debil', 'escudero-del-thing', 'player', { x: 0, y: 0 });
    const fuerte = makePiece('fuerte', 'escudero-del-thing', 'ai', { x: 1, y: 0 }, { attackModifier: 5 });
    expect(isChallenge(debil, escudero, fuerte, escudero)).toBe(true);
    expect(isChallenge(fuerte, escudero, debil, escudero)).toBe(false);
    expect(effectiveAttack(fuerte, escudero)).toBe(7);
  });

  it('isFurious se cumple cuando a la pieza le falta la mitad o más de su Vida máxima', () => {
    const gigante = CARD_BY_ID['gigante-de-la-escarcha']!; // 7/7
    const sana = makePiece('sana', 'gigante-de-la-escarcha', 'player', { x: 0, y: 0 }, { currentHealth: 7 });
    const malherida = makePiece('malherida', 'gigante-de-la-escarcha', 'player', { x: 0, y: 0 }, { currentHealth: 3 });
    expect(isFurious(sana, gigante)).toBe(false);
    expect(isFurious(malherida, gigante)).toBe(true);
    // Un bono permanente sube también el umbral de Furor, no solo la Vida.
    const reforzada = makePiece('reforzada', 'gigante-de-la-escarcha', 'player', { x: 0, y: 0 }, {
      currentHealth: 4, permanentAttackBonus: 2,
    });
    expect(isFurious(reforzada, gigante)).toBe(true);
  });
});

describe('piezas propias de Fimbul', () => {
  it('el Berserker de Piel de Oso pega 3/4 sano y 6/4 en Furor', () => {
    let state = fimbulMatch();
    state = {
      ...state,
      board: [
        makePiece('berserker', 'berserker-de-piel-de-oso', 'player', { x: 3, y: 5 }),
        makePiece('victima', 'escudero-del-thing', 'ai', { x: 3, y: 4 }),
      ],
    };
    const sano = applyAction(state, {
      type: 'attack-piece', playerId: 'player', attackerId: 'berserker', defenderId: 'victima',
    });
    expect(sano.ok).toBe(true);
    expect(sano.state.board.find((piece) => piece.instanceId === 'victima')?.currentHealth).toBe(4 - 3);

    let herido = fimbulMatch();
    herido = {
      ...herido,
      board: [
        makePiece('berserker', 'berserker-de-piel-de-oso', 'player', { x: 3, y: 5 }, { currentHealth: 2 }),
        makePiece('victima', 'escudero-del-thing', 'ai', { x: 3, y: 4 }, { currentHealth: 10 }),
      ],
    };
    const furioso = applyAction(herido, {
      type: 'attack-piece', playerId: 'player', attackerId: 'berserker', defenderId: 'victima',
    });
    expect(furioso.ok).toBe(true);
    expect(furioso.state.board.find((piece) => piece.instanceId === 'victima')?.currentHealth).toBe(10 - 6);
  });

  it('el Húscarle gana un escudo de 2 al ganar un Desafío', () => {
    let state = fimbulMatch();
    state = {
      ...state,
      // Vida reforzada solo para que sobreviva al contragolpe del Gigante y
      // se pueda comprobar el escudo después del combate: el combate es
      // simultáneo, así que el contragolpe llega aunque el golpe fuera letal.
      board: [
        makePiece('huscarle', 'huscarle-del-rey', 'player', { x: 3, y: 5 }, { currentHealth: 10 }),
        makePiece('grande', 'gigante-de-la-escarcha', 'ai', { x: 3, y: 4 }),
      ],
    };
    const result = applyAction(state, {
      type: 'attack-piece', playerId: 'player', attackerId: 'huscarle', defenderId: 'grande',
    });
    expect(result.ok).toBe(true);
    const huscarle = result.state.board.find((piece) => piece.instanceId === 'huscarle')!;
    expect(huscarle.statuses).toContainEqual({ kind: 'shielded', amount: 2 });
    expect(result.state.players.player.challengedThisTurn).toBe(true);
  });

  it('el Lobo de Fenrir remata a la defensora si sobrevive un Desafío', () => {
    let state = fimbulMatch();
    state = {
      ...state,
      // Vida reforzada solo para que el Lobo sobreviva al contragolpe del
      // Gigante: si el atacante muriera en el intercambio, la comprobación de
      // Desafío no tendría a quién mirar y no se activaría.
      board: [
        makePiece('lobo', 'lobo-de-fenrir', 'player', { x: 3, y: 5 }, { currentHealth: 10 }),
        makePiece('grande', 'gigante-de-la-escarcha', 'ai', { x: 3, y: 4 }, { currentHealth: 7 }),
      ],
    };
    const result = applyAction(state, {
      type: 'attack-piece', playerId: 'player', attackerId: 'lobo', defenderId: 'grande',
    });
    expect(result.ok).toBe(true);
    // 7 de Vida, 5 de golpe: sobrevive al combate, pero Desafío la remata.
    expect(result.state.board.find((piece) => piece.instanceId === 'grande')).toBeUndefined();
  });

  it('el Draugr no puede ser aturdido y gana Perforar solo en Furor', () => {
    let sano = fimbulMatch();
    sano = {
      ...sano,
      board: [
        makePiece('draugr', 'draugr-del-tumulo', 'player', { x: 3, y: 5 }),
        makePiece('presa', 'escudero-del-thing', 'ai', { x: 3, y: 4 }, { currentHealth: 20 }),
      ],
    };
    const golpeSano = applyAction(sano, {
      type: 'attack-piece', playerId: 'player', attackerId: 'draugr', defenderId: 'presa',
    });
    expect(golpeSano.ok).toBe(true);
    expect(golpeSano.state.players.ai.nexusHealth).toBe(35); // sin Perforar, no traspasa

    let furioso = fimbulMatch();
    furioso = {
      ...furioso,
      board: [
        makePiece('draugr', 'draugr-del-tumulo', 'player', { x: 3, y: 5 }, { currentHealth: 2 }),
        makePiece('presa', 'escudero-del-thing', 'ai', { x: 3, y: 4 }, { currentHealth: 2 }),
      ],
    };
    const golpeFurioso = applyAction(furioso, {
      type: 'attack-piece', playerId: 'player', attackerId: 'draugr', defenderId: 'presa',
    });
    expect(golpeFurioso.ok).toBe(true);
    // 4 de Ataque contra 2 de Vida: el exceso perfora al Nexo.
    expect(golpeFurioso.state.players.ai.nexusHealth).toBe(35 - 2);
  });

  it('el Jarl de la Costa da +1 en Desafío a sus otras unidades, no a sí mismo', () => {
    let state = fimbulMatch();
    state = {
      ...state,
      board: [
        makePiece('jarl', 'jarl-de-la-costa', 'player', { x: 1, y: 5 }),
        makePiece('escudero', 'escudero-del-thing', 'player', { x: 3, y: 5 }),
        makePiece('grande', 'gigante-de-la-escarcha', 'ai', { x: 3, y: 4 }),
      ],
    };
    const result = applyAction(state, {
      type: 'attack-piece', playerId: 'player', attackerId: 'escudero', defenderId: 'grande',
    });
    expect(result.ok).toBe(true);
    // 2 base + 1 del Jarl = 3.
    expect(result.state.board.find((piece) => piece.instanceId === 'grande')?.currentHealth).toBe(7 - 3);
  });

  it('la Serpiente del Mundo daña a las demás unidades al entrar y conserva su Vida', () => {
    let state = fimbulMatch();
    state = withPlayer(state, 'player', {
      hand: [{ cardId: 'serpiente-del-mundo', instanceId: 'serpiente' }],
      resources: Array.from({ length: 10 }, (_, index) => ({
        instanceId: `essence-${index}`, cardId: 'fuente-fimbul', faction: 'fimbul' as const, exhausted: false,
      })),
    });
    state = {
      ...state,
      board: [
        makePiece('aliada', 'escudero-del-thing', 'player', { x: 3, y: 5 }),
        makePiece('enemiga', 'escudero-del-thing', 'ai', { x: 3, y: 4 }),
      ],
    };
    const result = applyAction(state, {
      type: 'play-card', playerId: 'player', cardInstanceId: 'serpiente', position: { x: 4, y: 5 },
    });
    expect(result.ok).toBe(true);
    expect(result.state.board.find((piece) => piece.cardId === 'serpiente-del-mundo')?.currentHealth).toBe(6);
    expect(result.state.board.find((piece) => piece.instanceId === 'aliada')?.currentHealth).toBe(4 - 3);
    expect(result.state.board.find((piece) => piece.instanceId === 'enemiga')?.currentHealth).toBe(4 - 3);
  });

  it('el Skald roba al final del turno si hubo un Desafío, sin que nadie muera', () => {
    let state = fimbulMatch();
    state = withPlayer(state, 'player', { hand: [], nexusHealth: 20 });
    state = {
      ...state,
      // Ataque igual (2 contra 2) y Vida de sobra en ambos lados: el
      // combate simultáneo no mata a nadie, así que solo se prueba el
      // disparador del Skald, no el del Salón.
      board: [
        makePiece('skald', 'skald-de-las-sagas', 'player', { x: 0, y: 6 }),
        makePiece('atacante', 'escudero-del-thing', 'player', { x: 3, y: 5 }),
        makePiece('victima', 'escudero-del-thing', 'ai', { x: 3, y: 4 }),
      ],
    };
    const golpe = applyAction(state, {
      type: 'attack-piece', playerId: 'player', attackerId: 'atacante', defenderId: 'victima',
    });
    expect(golpe.ok).toBe(true);
    expect(golpe.state.board.find((piece) => piece.instanceId === 'victima')).toBeDefined();
    expect(golpe.state.players.player.challengedThisTurn).toBe(true);
    expect(golpe.state.players.player.unitDiedThisTurn).toBeUndefined();

    const fin = applyAction(golpe.state, { type: 'end-turn', playerId: 'player' });
    expect(fin.ok).toBe(true);
    // Hildr roba 1 al ganar el Desafío (en el ataque) y el Skald otra al
    // final del turno: 2 en total. El Salón no está en juego en esta prueba.
    expect(fin.state.players.player.hand).toHaveLength(2);
    expect(fin.state.players.player.nexusHealth).toBe(20);
  });

  it('el Salón de los Caídos roba y cura si murió una unidad propia, y la marca se reinicia', () => {
    let state = fimbulMatch();
    state = withPlayer(state, 'player', { hand: [], nexusHealth: 20 });
    state = {
      ...state,
      // El escudero muere al contragolpe del Gigante durante el PROPIO turno
      // del jugador (el combate es simultáneo): así "murió este turno" se
      // cumple sin depender de lo que pase en el turno del rival.
      board: [
        makePiece('salon', 'salon-de-los-caidos', 'player', { x: 1, y: 6 }, { currentHealth: 7 }),
        makePiece('debil', 'escudero-del-thing', 'player', { x: 3, y: 5 }),
        makePiece('grande', 'gigante-de-la-escarcha', 'ai', { x: 3, y: 4 }),
      ],
    };
    const golpe = applyAction(state, {
      type: 'attack-piece', playerId: 'player', attackerId: 'debil', defenderId: 'grande',
    });
    expect(golpe.ok).toBe(true);
    expect(golpe.state.board.find((piece) => piece.instanceId === 'debil')).toBeUndefined();
    expect(golpe.state.players.player.unitDiedThisTurn).toBe(true);

    const fin = applyAction(golpe.state, { type: 'end-turn', playerId: 'player' });
    expect(fin.ok).toBe(true);
    expect(fin.state.players.player.hand).toHaveLength(1);
    expect(fin.state.players.player.nexusHealth).toBe(22);
    // Se reinicia al cambiar de turno, no se queda pegada para siempre.
    expect(fin.state.players.player.unitDiedThisTurn).toBe(false);
  });
});

describe('Hildr, La que Elige a los Caídos', () => {
  it('roba 1 carta la primera vez cada turno que gana un Desafío, no en las siguientes', () => {
    let state = fimbulMatch();
    state = withPlayer(state, 'player', { hand: [], nexusHealth: 20 });
    state = {
      ...state,
      // Ataque igual (2 contra 2) en las dos parejas: nadie muere en el
      // combate simultáneo, así que se puede probar el segundo Desafío del
      // turno sin que el primero ya haya destrozado el tablero.
      board: [
        makePiece('a1', 'escudero-del-thing', 'player', { x: 0, y: 5 }),
        makePiece('a2', 'escudero-del-thing', 'player', { x: 1, y: 5 }),
        makePiece('rival1', 'escudero-del-thing', 'ai', { x: 0, y: 4 }),
        makePiece('rival2', 'escudero-del-thing', 'ai', { x: 1, y: 4 }),
      ],
    };
    expect(state.players.player.commanderId).toBe('hildr-la-que-elige');
    const primero = applyAction(state, {
      type: 'attack-piece', playerId: 'player', attackerId: 'a1', defenderId: 'rival1',
    });
    expect(primero.ok).toBe(true);
    expect(primero.state.players.player.hand).toHaveLength(1);

    const segundo = applyAction(primero.state, {
      type: 'attack-piece', playerId: 'player', attackerId: 'a2', defenderId: 'rival2',
    });
    expect(segundo.ok).toBe(true);
    // Segundo Desafío del mismo turno: no roba de nuevo.
    expect(segundo.state.players.player.hand).toHaveLength(1);
  });
});
