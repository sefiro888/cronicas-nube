import { describe, expect, it } from 'vitest'
import { CARD_BY_ID } from '../game'
import { creatureKind, damageKind } from './creatureFx'

describe('creatureFx', () => {
  it('reconoce de qué está hecha cada criatura', () => {
    const find = (test: (subtype: string, faction: string) => boolean) =>
      Object.values(CARD_BY_ID).find((card) => card.type === 'unit' && test((card.subtype ?? '').toLowerCase(), card.faction))?.id
    expect(creatureKind(find((_, faction) => faction === 'goblins'))).toBe('goblin')
    expect(creatureKind(find((subtype, faction) => subtype.includes('constructo') && faction !== 'goblins'))).toBe('machine')
    expect(creatureKind(undefined)).toBe('stone')
  })

  it('el tipo de daño sale del efecto y, si no, de la facción', () => {
    expect(damageKind({ effectId: 'goblin-petardazo' })).toBe('fire')
    expect(damageKind({ effectId: 'freeze-unit' })).toBe('ice')
    expect(damageKind({ effectId: 'plague-contagio' })).toBe('poison')
    expect(damageKind({ effectId: 'strike', faction: 'shadow' })).toBe('shadow')
    expect(damageKind({ effectId: 'strike', faction: 'order' })).toBe('physical')
  })
})
