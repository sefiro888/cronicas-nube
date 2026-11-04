import { describe, expect, it } from 'vitest'
import { CARD_BY_ID } from '../game'
import { attackKindFor, attackWeight, type AttackKind } from './attackStyle'

const card = (subtype: string, faction = 'nature', attack = 2, range = 1) =>
  ({ subtype, faction, attack, range }) as Parameters<typeof attackKindFor>[0]

describe('attackKindFor', () => {
  it('cada tipo de criatura golpea a su manera', () => {
    expect(attackKindFor(card('Humanoide'), true)).toBe('slash')
    expect(attackKindFor(card('Bestia'), true)).toBe('claw')
    expect(attackKindFor(card('Constructo'), true)).toBe('crush')
    expect(attackKindFor(card('Humanoide', 'nature', 6), true)).toBe('crush')
    expect(attackKindFor(card('No muerto'), true)).toBe('spectral')
    expect(attackKindFor(card('Dragón', 'fury', 5, 2), false)).toBe('breath')
    expect(attackKindFor(card('Arcabucero', 'tercios', 2, 2), false)).toBe('shot')
    expect(attackKindFor(card('Hechicera', 'arcane', 2, 2), false)).toBe('bolt')
    expect(attackKindFor(card('Cazador', 'nature', 2, 2), false)).toBe('arrow')
    expect(attackKindFor(card('Bestia', 'nature', 2, 2), false)).toBe('barbs')
  })

  /** El encargo era que no todos los ataques se vieran igual: con las cartas reales debe haber variedad. */
  it('las cartas reales reparten al menos seis estilos distintos', () => {
    const kinds = new Set<AttackKind>()
    for (const definition of Object.values(CARD_BY_ID)) {
      if (definition.type !== 'unit') continue
      kinds.add(attackKindFor(definition, (definition.range ?? 1) <= 1))
    }
    expect(kinds.size).toBeGreaterThanOrEqual(6)
  })

  it('el peso crece con el ataque y se queda entre 0 y 1', () => {
    expect(attackWeight(1)).toBe(0)
    expect(attackWeight(6)).toBe(1)
    expect(attackWeight(20)).toBe(1)
  })
})
