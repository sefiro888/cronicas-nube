import { expect, test } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { PLAYABLE_FACTIONS } from '../src/game'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('cronicas-nexo-preferences', JSON.stringify({
    state: { muted: true, reducedMotion: true }, version: 3,
  })))
})

for (const viewport of [{ width: 1920, height: 1080 }, { width: 1366, height: 768 }, { width: 390, height: 844 }]) {
  test(`atlas y Torre legibles con arte completo a ${viewport.width}`, async ({ page }) => {
    test.setTimeout(90_000)
    await page.setViewportSize(viewport)
    await mkdir('tools/captures/interface-2026-11', { recursive: true })
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'CRÓNICAS DEL NEXO', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Iniciar partida', exact: true })).toBeVisible()
    await page.locator('main img').first().evaluate((image: HTMLImageElement) => image.decode())
    const factions = page.locator('[data-faction]')
    await expect(factions).toHaveCount(PLAYABLE_FACTIONS.length)
    // La cobertura se comprueba por identidad, no solo por cantidad: duplicar
    // una facción para rellenar un hueco no debe esconder a ninguna otra.
    for (const faction of PLAYABLE_FACTIONS) {
      await expect(page.getByRole('link', { name: `Elegir ${faction.name}`, exact: true })).toHaveCount(1)
    }
    await page.screenshot({ path: `tools/captures/interface-2026-11/inicio-${viewport.width}.png` })
    for (const id of ['hierro', 'imperios', 'salvajes', 'umbrales']) {
      const realm = page.locator(`#territorio-${id}`)
      await realm.scrollIntoViewIfNeeded()
      await expect.poll(() => realm.locator('img').evaluateAll((images) =>
        images.every((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0),
      )).toBe(true)
      // Tener dimensiones no garantiza que el navegador haya decodificado y
      // pintado las imágenes recién cargadas al saltar a una sección lejana.
      await realm.locator('img').evaluateAll(async (images) => {
        await Promise.all(images.map((image) => (image as HTMLImageElement).decode()))
        await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
      })
      await page.screenshot({ path: `tools/captures/interface-2026-11/${id}-${viewport.width}.png` })
    }
    await expect(page.locator('[data-quiet="true"]').first()).toBeAttached()
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0)
    await page.goto('/tower')
    await expect(page.getByRole('heading', { name: 'Torre del Nexo', exact: true })).toBeVisible()
    await expect(page.getByRole('img', { name: /Una torre colosal/ })).toHaveJSProperty('complete', true)
    await page.getByRole('img', { name: /Una torre colosal/ }).evaluate((image: HTMLImageElement) => image.decode())
    await page.screenshot({ path: `tools/captures/interface-2026-11/torre-${viewport.width}.png` })
    await expect(page.getByRole('button', { name: /Comenzar la subida/ })).toBeVisible()
    if (viewport.width >= 720) await expect(page.getByRole('button', { name: /Comenzar la subida/ })).toBeInViewport()
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0)
  })
}

test('el atlas elige el mazo y la Torre conserva la expedición y su Vida real', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Elegir Tercios', exact: true }).click()
  await expect(page).toHaveURL(/\/play$/)
  await page.getByRole('link', { name: 'Torre', exact: true }).click()
  await expect(page.getByRole('button', { name: /El Cuadro de Picas/ })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: /Comenzar la subida/ }).click()
  await expect(page.getByLabel('Vida del Nexo: 34 de 34', { exact: true })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Recorrido de la Torre' }).getByRole('listitem')).toHaveCount(19)
  await expect(page.locator('[aria-current="step"]')).toContainText('Tu próximo rival')
  await page.reload()
  await expect(page.getByRole('button', { name: /Entrar al piso 1/ })).toBeVisible()
  await expect(page.getByLabel('Vida del Nexo: 34 de 34', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Abandonar la Torre', exact: true }).click()
  await expect(page.getByRole('button', { name: /Comenzar la subida/ })).toBeVisible()
})
