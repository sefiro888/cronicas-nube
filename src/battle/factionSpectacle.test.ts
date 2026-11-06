import { describe, expect, it } from 'vitest'
import { CARD_BY_ID, FACTION_IDS } from '../game'
import { EMBLEMATIC_SPELLS, emblematicSpell } from './emblematicSpells'
import { NEXUS_FORMS, nexusWear } from './nexusForms'

describe('identidad de facción en batalla', () => {
  it('asigna las escenas emblemáticas a dieciséis conjuros existentes de facciones distintas', () => {
    const factions = new Set<string>(['jade', 'marea', 'fimbul'])
    for (const [id, design] of Object.entries(EMBLEMATIC_SPELLS)) {
      expect(CARD_BY_ID[id]).toMatchObject({ faction: design.faction, type: 'instant' })
      expect(factions.has(design.faction)).toBe(false)
      factions.add(design.faction)
    }
    expect(factions).toEqual(new Set(FACTION_IDS))
    expect(emblematicSpell('constructor')).toBeUndefined()
  })

  it('conserva una silueta distinta por facción y aplica el desgaste por cuartos de Vida', () => {
    expect(Object.keys(NEXUS_FORMS).sort()).toEqual([...FACTION_IDS].sort())
    expect(new Set(Object.values(NEXUS_FORMS).map((form) => form.outline)).size).toBe(FACTION_IDS.length)
    expect([1, .75, .5, .25, 0].map(nexusWear)).toEqual([0, 1, 2, 3, 3])
  })
})
