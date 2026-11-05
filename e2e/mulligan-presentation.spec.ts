import { expect, test } from '@playwright/test'
import { writeFileSync } from 'node:fs'
import { COMMANDER_BY_ID, STARTER_DECKS, createMatch } from '../src/game'
import { cameraSnapshot, fiberModuleUrl } from './helpers/cameraSnapshot'

for (const [width, height, reducedMotion] of [[1920, 1080, false], [1366, 768, false], [375, 812, true]] as const) {
  test(`comandantes, escenario y preparación accesible a ${width} × ${height}`, async ({ page }) => {
    test.setTimeout(90000)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
    const own = STARTER_DECKS.find((deck) => deck.faction === 'forja')!
    const rival = STARTER_DECKS.find((deck) => deck.faction === 'sol')!
    const match = createMatch(own, rival, 42)
    await page.setViewportSize({ width, height })
    await page.addInitScript(({ match, deckId, reducedMotion }) => {
      localStorage.setItem('cronicas-nexo-howto-visto', '1')
      localStorage.setItem('cronicas-nexo-preferences', JSON.stringify({ state: {
        selectedDeckId: deckId, scenario: 'foundry', muted: true, reducedMotion,
        graphicsQuality: 'medium', confirmEndTurn: false,
      }, version: 7 }))
      localStorage.setItem('cronicas-nexo-match', JSON.stringify({ state: {
        match, history: [], matchLog: [], healthHistory: [], startedAtMs: Date.now(), elapsedSeconds: 0,
      }, version: 2 }))
    }, { match, deckId: own.id, reducedMotion })
    const fiberRequest = fiberModuleUrl(page)
    await page.goto('/battle')
    const fiberUrl = await fiberRequest
    const dialog = page.getByRole('dialog', { name: 'Tu mano inicial', exact: true })
    await expect(dialog).toBeVisible({ timeout: 25000 })
    await expect(dialog.getByRole('heading', { name: COMMANDER_BY_ID[match.players.player.commanderId]!.name, exact: true })).toBeVisible()
    await expect(dialog.getByRole('heading', { name: COMMANDER_BY_ID[match.players.ai.commanderId]!.name, exact: true })).toBeVisible()
    await expect(dialog.getByRole('heading', { name: 'Patio del Gremio', exact: true })).toBeVisible()
    const cards = dialog.locator('button[class*="mulliganCard"]')
    await expect(cards).toHaveCount(10)
    await expect(cards.first()).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    const keep = dialog.getByRole('button', { name: 'Conservar las diez', exact: true })
    await expect(keep).toBeFocused()
    await page.waitForTimeout(1100)
    await expect(keep).toBeFocused()
    const bounds = (await keep.boundingBox())!
    expect(bounds.y).toBeGreaterThan(0)
    expect(bounds.y + bounds.height).toBeLessThan(height)
    await page.keyboard.press('Tab')
    await expect(cards.first()).toBeFocused()
    await page.keyboard.press('h')
    await expect(page.locator('footer').first()).not.toHaveAttribute('data-tucked', 'true')
    if (process.env.RUN_SHOTS) {
      await page.screenshot({ path: `e2e/__shots__/presentacion-${width}x${height}.png` })
    }
    await cards.first().click()
    await expect(dialog.getByRole('button', { name: 'Cambiar 1 carta', exact: true })).toBeVisible()
    await dialog.getByRole('button', { name: 'Cambiar 1 carta', exact: true }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByTestId('battle-board')).toBeVisible()
    await expect(page.locator('[class*="fanCard"]')).toHaveCount(10)
    if (width < 760) {
      const rail = page.getByTestId('hand-scroll-rail')
      const handCards = page.locator('[class*="fanCard"] [data-card-id]')
      for (const index of [0, 9, 0]) {
        await handCards.nth(index).focus()
        const box = (await handCards.nth(index).boundingBox())!
        expect(box.x).toBeGreaterThanOrEqual(0)
        expect(box.x + box.width).toBeLessThanOrEqual(width)
      }
      expect(await rail.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true)
    }
    if (process.env.RUN_SHOTS) await page.screenshot({ path: `e2e/__shots__/mano-diez-${width}x${height}.png` })
    if (process.env.RUN_SHOTS) {
      await page.getByRole('button', { name: /Saltar guía/i }).click({ timeout: 2000 }).catch(() => {})
      const camera = await cameraSnapshot(page, fiberUrl)
      writeFileSync(`tools/captures/camera-foundry-${width}x${height}.json`, JSON.stringify(camera, null, 2))
    }
    expect(errors).toEqual([])
  })
}
