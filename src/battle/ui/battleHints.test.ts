import { describe, expect, it } from 'vitest'
import { CARD_BY_ID, type BoardPiece } from '../../game'
import { actionHintFor, attackNexusVerdicts, attackPieceVerdicts, cardStatLine, isBoardCard, pieceStatLine, requiresPieceTarget } from './battleHints'

const piece = (overrides: Partial<BoardPiece> = {}): BoardPiece => ({
  instanceId: 'p1',
  cardId: 'sabueso-brasa',
  owner: 'player',
  position: { x: 3, y: 1 },
  currentHealth: 2,
  attackModifier: 0,
  movedThisTurn: false,
  attackedThisTurn: false,
  enteredOnTurn: 1,
  statuses: [],
  ...overrides,
})

/** Contexto de una selección vacía en tu propio turno: base de los casos de abajo. */
const idleContext = {
  finished: false,
  isMyTurn: true,
  viewingForeign: false,
  canPaySelectedCard: true,
  moveCount: 0,
  canAttackPiece: false,
  canAttackNexus: false,
}

describe('battleHints', () => {
  it('la línea de estadísticas de una ficha aplica los modificadores de ataque', () => {
    const card = CARD_BY_ID['sabueso-brasa']!
    const line = pieceStatLine(piece({ attackModifier: 2, currentHealth: 1 }), card)
    expect(line).toContain(`ATQ ${(card.attack ?? 0) + 2}`)
    expect(line).toContain('VID 1')
  })

  it('el ataque de una ficha nunca se muestra en negativo', () => {
    const card = CARD_BY_ID['sabueso-brasa']!
    expect(pieceStatLine(piece({ attackModifier: -99 }), card)).toContain('ATQ 0')
  })

  it('la línea de una carta de la mano usa los valores impresos, no los de tablero', () => {
    const card = CARD_BY_ID['sabueso-brasa']!
    expect(cardStatLine(card)).toContain(`ATQ ${card.attack}`)
    expect(cardStatLine(card)).toContain(`VID ${card.health}`)
  })

  it('reconoce qué cartas ocupan casilla y cuáles piden objetivo', () => {
    expect(isBoardCard(CARD_BY_ID['sabueso-brasa']!)).toBe(true)
    expect(isBoardCard(CARD_BY_ID['fuente-furia']!)).toBe(false)
    expect(requiresPieceTarget(CARD_BY_ID['sabueso-brasa']!)).toBe(false)
  })

  it('consultar una ficha rival manda sobre el aviso de turno rival', () => {
    const hint = actionHintFor({
      ...idleContext,
      isMyTurn: false,
      viewedPiece: piece({ owner: 'ai' }),
      viewingForeign: true,
    })
    expect(hint).toContain('unidad rival')
  })

  it('avisa del turno rival cuando no hay nada consultado', () => {
    expect(actionHintFor({ ...idleContext, isMyTurn: false })).toBe('Turno rival: observa sus movimientos.')
  })

  it('la falta de Esencia manda sobre cualquier otra pista de la carta elegida', () => {
    const hint = actionHintFor({
      ...idleContext,
      selectedCard: CARD_BY_ID['sabueso-brasa'],
      canPaySelectedCard: false,
    })
    expect(hint).toBe('No tienes Esencia suficiente para esta carta.')
  })

  it('una unidad pagable pide casilla de despliegue', () => {
    const hint = actionHintFor({ ...idleContext, selectedCard: CARD_BY_ID['sabueso-brasa'] })
    expect(hint).toContain('casilla iluminada')
  })

  it('una unidad congelada lo dice antes que nada', () => {
    const hint = actionHintFor({
      ...idleContext,
      selectedPiece: piece({ statuses: [{ kind: 'frozen', expiresOnTurn: 4 }] }),
      moveCount: 3,
      canAttackPiece: true,
    })
    expect(hint).toBe('Unidad congelada: no puede actuar este turno.')
  })

  it('distingue entre poder mover, poder atacar y poder ambas cosas', () => {
    expect(actionHintFor({ ...idleContext, selectedPiece: piece(), moveCount: 2 }))
      .toBe('Elige una casilla azul para mover.')
    expect(actionHintFor({ ...idleContext, selectedPiece: piece(), canAttackNexus: true }))
      .toBe('Elige un objetivo dorado para atacar.')
    expect(actionHintFor({ ...idleContext, selectedPiece: piece(), moveCount: 2, canAttackPiece: true }))
      .toBe('Casillas azules: mover · Objetivos dorados: atacar.')
  })

  it('una unidad que ya actuó lo explica en vez de decir que no tiene acciones', () => {
    const hint = actionHintFor({ ...idleContext, selectedPiece: piece({ movedThisTurn: true, attackedThisTurn: true }) })
    expect(hint).toBe('Esta unidad ya ha agotado sus acciones este turno.')
  })

  it('con la partida terminada no hay ninguna pista', () => {
    expect(actionHintFor({ ...idleContext, finished: true, selectedPiece: piece() })).toBeUndefined()
  })
})

describe('veredictos de la previsión', () => {
  it('cada ficha dice lo que le va a pasar', () => {
    const verdicts = attackPieceVerdicts({ damageToDefender: 3, defenderHealthAfter: 0, defenderDies: true, retaliationToAttacker: 2, attackerHealthAfter: 1, attackerDies: false, pierceOverkill: 1 })
    expect(verdicts.target.map((v) => v.title)).toEqual(['Muere', '+1 al Nexo'])
    expect(verdicts.attacker.map((v) => v.title)).toEqual(['Devuelve 2'])
  })

  it('avisa si la atacante muere en el contragolpe y del golpe letal al Nexo', () => {
    const verdicts = attackPieceVerdicts({ damageToDefender: 1, defenderHealthAfter: 3, defenderDies: false, retaliationToAttacker: 4, attackerHealthAfter: 0, attackerDies: true, pierceOverkill: 0 })
    expect(verdicts.target[0]!.title).toBe('Sobrevive con 3')
    expect(verdicts.attacker[0]!.tone).toBe('counterKill')
    expect(attackNexusVerdicts({ damage: 5, nexusHealthAfter: 0, lethal: true })[0]!.title).toBe('¡Golpe letal!')
  })
})
