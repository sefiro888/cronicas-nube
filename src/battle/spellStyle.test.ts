import { describe, expect, it } from 'vitest'
import { CARD_BY_ID, COMMANDERS } from '../game'
import { spellKindFor, type SpellKind } from './spellStyle'

describe('spellKindFor', () => {
  it('los hechizos reales reparten al menos seis animaciones distintas', () => {
    const kinds = new Set<SpellKind>()
    for (const card of Object.values(CARD_BY_ID)) {
      if (card.type === 'unit' || card.type === 'mana' || card.type === 'structure') continue
      kinds.add(spellKindFor(card.id))
    }
    expect(kinds.size).toBeGreaterThanOrEqual(6)
  })

  it('el poder de Bromuro (Petardazo para todos) es una bendición', () => {
    const bromuro = COMMANDERS.find((commander) => commander.id === 'bromuro-el-afortunado')!
    expect(spellKindFor(bromuro.id, 'power')).toBe('blessing')
  })
})
