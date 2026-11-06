import { expect, test } from '@playwright/test'
import type { RootState } from '@react-three/fiber'
import type { Mesh, MeshStandardMaterial, PointLight } from 'three'
import { STARTER_DECKS, createMatch, type MatchState } from '../src/game'
import { fiberModuleUrl } from './helpers/cameraSnapshot'
import type { Page } from '@playwright/test'

async function furnaceState(page: Page, url: string) {
  return page.evaluate(async (url) => {
    const module = await import(url) as {
      _roots: ReadonlyMap<HTMLCanvasElement, { store: { getState: () => RootState } }>
    }
    const canvas = document.querySelector('[data-testid="battle-board"] canvas') as HTMLCanvasElement | null
    const state = canvas ? module._roots.get(canvas)?.store.getState() : undefined
    const light = state?.scene.getObjectByName('foundry-fire-light') as PointLight | undefined
    const bed = state?.scene.getObjectByName('foundry-fire-bed') as Mesh | undefined
    const drive = state?.scene.getObjectByName('foundry-drive-gear')
    if (!light || !bed || !drive) throw new Error('Falta el horno o su transmisión')
    return { light: light.intensity, emissive: (bed.material as MeshStandardMaterial).emissiveIntensity, gear: drive.rotation.z }
  }, url)
}

for (const [width, height] of [[1920, 1080], [1366, 768]] as const) {
  test(`el horno conserva presión y se calma tras curar realmente el Nexo a ${width} × ${height}`, async ({ page }) => {
    test.setTimeout(90000)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    const base = createMatch(STARTER_DECKS[0]!, STARTER_DECKS[1]!, 42)
    const match: MatchState = { ...base, turn: 18, phase: 'main', terrain: [], board: [],
      players: { ...base.players, player: { ...base.players.player, nexusHealth: 8, mulliganTaken: true,
        hand: [{ instanceId: 'heal', cardId: 'bendicion-de-la-luna' }],
        resources: Array.from({ length: 3 }, (_, index) => ({ instanceId: `r${index}`,
          cardId: 'fuente-marea', faction: 'marea' as const, exhausted: false })),
      } },
    }
    await page.setViewportSize({ width, height })
    await page.addInitScript((saved) => {
      localStorage.setItem('cronicas-nexo-howto-visto', '1')
      localStorage.setItem('cronicas-nexo-preferences', JSON.stringify({ state: {
        selectedDeckId: 'furia-caldera', scenario: 'foundry', graphicsQuality: 'high', muted: true, reducedMotion: true,
      }, version: 7 }))
      localStorage.setItem('cronicas-nexo-match', JSON.stringify({ state: {
        match: saved, history: [], matchLog: [], healthHistory: [], startedAtMs: Date.now(), elapsedSeconds: 0,
      }, version: 2 }))
    }, match)
    const fiber = fiberModuleUrl(page)
    await page.goto('/battle')
    const url = await fiber
    await expect(page.locator('[data-integrity="critical"]')).toHaveCount(1, { timeout: 25000 })
    await page.getByRole('button', { name: /Saltar guía/i }).click({ timeout: 2000 }).catch(() => {})
    await page.waitForTimeout(1500)
    const before = await furnaceState(page, url)
    await page.waitForTimeout(350)
    expect(await furnaceState(page, url)).toEqual(before)
    if (process.env.RUN_CLIMATE_SHOTS) await page.screenshot({ path: `e2e/__shots__/gremio-presion-${width}x${height}.png` })
    await page.getByRole('button', { name: /Bendición de la Luna/ }).first().click()
    await page.getByRole('button', { name: 'Resolver carta' }).click()
    await expect(page.getByText('TU NEXO · 16', { exact: true })).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('[data-integrity="critical"]')).toHaveCount(0)
    await expect.poll(async () => (await furnaceState(page, url)).light).toBeLessThan(before.light)
    const after = await furnaceState(page, url)
    expect(after.emissive).toBeLessThan(before.emissive)
    expect(after.gear).toBe(before.gear)
    await page.waitForTimeout(350)
    expect(await furnaceState(page, url)).toEqual(after)
    if (process.env.RUN_CLIMATE_SHOTS) await page.screenshot({ path: `e2e/__shots__/gremio-presion-curada-${width}x${height}.png` })
    expect(errors).toEqual([])
  })
}
