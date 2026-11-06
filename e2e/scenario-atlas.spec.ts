import { mkdir } from 'node:fs/promises'
import { SCENARIO_ATLAS } from '../src/battle/scenarioEnvironments'
import { FACTION_BY_ID } from '../src/game/factions'
import { expect, test } from '@playwright/test'
import type { RootState } from '@react-three/fiber'
import type { Light, Mesh, MeshStandardMaterial } from 'three'
import { fiberModuleUrl, poseCamera } from './helpers/cameraSnapshot'

for (const width of [1920, 1366, 390]) {
  test(`el atlas explora mundos y solo aplica cambios expresos a ${width}`, async ({ page }) => {
    test.setTimeout(90_000)
    await page.setViewportSize({ width, height: width === 390 ? 844 : width === 1366 ? 768 : 1080 })
    await page.addInitScript(() => {
      localStorage.setItem('cronicas-nexo-preferences', JSON.stringify({ state: { scenario: 'auto', selectedDeckId: 'invierno-fimbul', graphicsQuality: 'medium', reducedMotion: true, muted: true }, version: 7 }))
    })
    const fiber = fiberModuleUrl(page)
    await page.goto('/atlas')
    await expect(page.getByRole('heading', { name: 'Atlas de escenarios' })).toBeVisible()
    const places = page.getByRole('navigation', { name: 'Territorios del atlas' })
    await expect(places.getByRole('button')).toHaveCount(19)
    await places.locator('img[width="1881"]').evaluate((image: HTMLImageElement) => image.decode())
    if (width === 1920) {
      for (const scene of SCENARIO_ATLAS) {
        const marker = places.getByRole('button', { name: `${FACTION_BY_ID[scene.faction].name} ${scene.name}`, exact: true })
        await marker.click()
        await expect(marker).toHaveAttribute('aria-pressed', 'true')
        await expect(page.getByRole('heading', { name: scene.name, exact: true })).toBeVisible()
      }
    }
    await places.getByRole('button', { name: /Olimpo Acrópolis/ }).click()
    await expect(places).toBeInViewport({ ratio: 0.99 })
    await mkdir('tools/captures/atlas', { recursive: true })
    await page.screenshot({ path: `tools/captures/atlas/mapa-ilustrado-${width}.png` })
    await page.getByRole('link', { name: 'Ver ficha del escenario' }).click()
    await expect(page.getByRole('heading', { name: 'Acrópolis de Olimpo', exact: true })).toBeInViewport()
    await page.getByRole('button', { name: 'Luna y brasas', exact: true }).click()
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('cronicas-nexo-preferences')!).state.scenario)).toBe('auto')
    expect(await page.evaluate(() => localStorage.getItem('cronicas-nexo-luz-escenario'))).toBeNull()
    await page.getByRole('button', { name: /Explorar el escenario en 3D/ }).click()
    const url = await fiber
    await expect(page.getByTestId('battle-board').locator('canvas')).toBeVisible()
    await expect.poll(() => page.evaluate(async (url) => {
      const { _roots } = await import(url) as { _roots: ReadonlyMap<HTMLCanvasElement, { store: { getState: () => RootState } }> }
      const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="battle-board"] canvas')!
      const scene = _roots.get(canvas)?.store.getState().scene
      let tiles = 0
      scene?.traverse((object) => {
        const mesh = object as Mesh<Mesh['geometry'], MeshStandardMaterial>
        const source: unknown = mesh.material?.map?.image
        if (source instanceof HTMLImageElement && source.src.endsWith('/suelo-olimpo-v1.webp')) tiles += 1
      })
      return tiles
    }, url)).toBe(64)
    const measureKey = () => page.evaluate(async (url) => {
      const { _roots } = await import(url) as { _roots: ReadonlyMap<HTMLCanvasElement, { store: { getState: () => RootState } }> }
      const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="battle-board"] canvas')!
      const scene = _roots.get(canvas)?.store.getState().scene
      let key = 0
      scene?.traverse((object) => { const light = object as Light; if (light.type === 'DirectionalLight' && light.castShadow) key = Math.max(key, light.intensity) })
      return key
    }, url)
    await expect.poll(measureKey, { timeout: 25000 }).toBeGreaterThan(0)
    const moon = await measureKey()
    expect(moon).toBeGreaterThan(0)
    expect(moon).toBeLessThan(1.5)
    await page.getByRole('button', { name: 'Luz del mundo', exact: true }).click()
    const native = await page.evaluate(async (url) => {
      const { _roots } = await import(url) as { _roots: ReadonlyMap<HTMLCanvasElement, { store: { getState: () => RootState } }> }
      const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="battle-board"] canvas')!
      const scene = _roots.get(canvas)?.store.getState().scene
      let key = 0
      scene?.traverse((object) => { const light = object as Light; if (light.type === 'DirectionalLight' && light.castShadow) key = Math.max(key, light.intensity) })
      return key
    }, url)
    expect(native).toBeGreaterThan(moon)
    await poseCamera(page, url, [9, 9, 9])
    await page.getByRole('button', { name: 'Usar este escenario y su luz' }).click()
    await expect(page.getByRole('status')).toContainText('preparados para jugar')
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('cronicas-nexo-preferences')!).state.scenario)).toBe('acropolis-olimpo')
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('cronicas-nexo-preferences')!).state.selectedDeckId)).toBe('invierno-fimbul')
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('cronicas-nexo-luz-escenario')!).state.mood)).toBe('native')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.getByRole('heading', { name: 'Atlas de escenarios' }).scrollIntoViewIfNeeded()
    await page.screenshot({ path: `tools/captures/atlas/atlas-${width}.png` })
  })
}
