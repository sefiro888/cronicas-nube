import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { FACTION_IDS } from '../game'
import { resolveScenario } from './scenarioForFaction'
import { SCENARIO_ATLAS, SCENARIO_ENVIRONMENTS, scenarioMaterialForFloor } from './scenarioEnvironments'
import { MOOD_LIGHT } from '../store/scenarioMood'

describe('atlas y materiales propios de cada territorio', () => {
  it('cada facción conserva un escenario, un suelo y un panorama distintos y disponibles', () => {
    expect(SCENARIO_ATLAS).toHaveLength(FACTION_IDS.length)
    expect(new Set(SCENARIO_ATLAS.map((entry) => entry.floor)).size).toBe(FACTION_IDS.length)
    expect(new Set(SCENARIO_ATLAS.map((entry) => entry.panorama)).size).toBe(FACTION_IDS.length)
    for (const faction of FACTION_IDS) {
      const scene = SCENARIO_ENVIRONMENTS[resolveScenario('auto', faction)]
      expect(scene.faction).toBe(faction)
      expect(existsSync(resolve('public', scene.floor.slice(1)))).toBe(true)
      expect(existsSync(resolve('public', scene.panorama.slice(1)))).toBe(true)
      expect(existsSync(resolve('public', scene.panorama.replace('.webp', '-low.webp').slice(1)))).toBe(true)
    }
  })
  it('el material de un suelo manual pertenece a ese suelo y conserva lectura mate', () => {
    const duna = scenarioMaterialForFloor('suelo-duna-v1.webp')
    const forge = scenarioMaterialForFloor('suelo-forja-v1.webp')
    expect(duna.metalness).toBeLessThan(.1)
    expect(forge.metalness).toBeGreaterThan(duna.metalness)
    for (const { material } of SCENARIO_ATLAS) {
      expect(material.roughness).toBeGreaterThanOrEqual(.5)
      expect(material.bumpScale).toBeLessThanOrEqual(.02)
      expect(material.environment).toBeLessThanOrEqual(1)
    }
  })
  it('la variante nocturna conserva relleno y ambiente para no ocultar cartas ni casillas', () => {
    expect(MOOD_LIGHT.moonlight.key).toBeLessThan(MOOD_LIGHT.native.key)
    expect(MOOD_LIGHT.moonlight.fill).toBeGreaterThanOrEqual(.85)
    expect(MOOD_LIGHT.moonlight.ambient).toBeGreaterThanOrEqual(.85)
  })
})
