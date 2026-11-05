import { describe, expect, it } from 'vitest'
import { FACTION_IDS } from '../game'
import { resolveScenario } from './scenarioForFaction'

/**
 * «Según tu facción» existe porque el sitio donde se peleaba no decía nada de
 * la partida: se jugaba a Duna en una ciudadela de mármol al amanecer solo
 * porque era el valor por defecto.
 */
describe('escenario según la facción', () => {
  it('una elección manual manda siempre', () => {
    expect(resolveScenario('caldera', 'duna')).toBe('caldera')
    expect(resolveScenario('sanctuary', 'fury')).toBe('sanctuary')
  })

  it('«auto» le da a cada facción un escenario, y a Furia y Duna el suyo', () => {
    const maps = FACTION_IDS.map((faction) => resolveScenario('auto', faction))
    expect(new Set(maps).size).toBe(FACTION_IDS.length)
    expect(resolveScenario('auto', 'fury')).toBe('caldera')
    expect(resolveScenario('auto', 'duna')).toBe('duna')
  })

  it('sin facción todavía (la partida aún no existe) cae en un escenario válido', () => {
    expect(resolveScenario('auto', undefined)).toBe('aether-citadel')
  })

  it('Sol y Bestiario tienen casa propia sin desplazar a Furia ni Fimbul', () => {
    expect(resolveScenario('auto', 'sol')).toBe('solar-court')
    expect(resolveScenario('auto', 'bestiario')).toBe('bestiary-ravine')
    expect(resolveScenario('auto', 'fury')).toBe('caldera')
    expect(resolveScenario('auto', 'fimbul')).toBe('fimbul')
    expect(resolveScenario('fimbul', 'bestiario')).toBe('fimbul')
  })
})
