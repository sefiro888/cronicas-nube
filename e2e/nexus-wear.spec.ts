import { expect, test } from '@playwright/test'
import { STARTER_DECKS, createMatch, type MatchState } from '../src/game'

for (const [width, height] of [[1920, 1080], [1366, 768]] as const) {
  test(`el desgaste del Nexo se repara al curarlo a ${width} × ${height}`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
    const base = createMatch(STARTER_DECKS[0]!, STARTER_DECKS[1]!, 42)
    const match: MatchState = {
      ...base, turn: 6, phase: 'main', terrain: [], board: [],
      players: {
        player: {
          ...base.players.player, nexusHealth: 8, mulliganTaken: true,
          hand: [{ instanceId: 'heal', cardId: 'bendicion-de-la-luna' }],
          resources: Array.from({ length: 3 }, (_, index) => ({
            instanceId: `r${index}`, cardId: 'fuente-marea', faction: 'marea' as const, exhausted: false,
          })),
        },
        ai: { ...base.players.ai, nexusHealth: 20 },
      },
    }
    await page.setViewportSize({ width, height })
    await page.addInitScript((saved) => {
      localStorage.setItem('cronicas-nexo-howto-visto', '1')
      localStorage.setItem('cronicas-nexo-preferences', JSON.stringify({ state: {
        selectedDeckId: 'furia-caldera', scenario: 'aether-citadel', graphicsQuality: 'high',
        muted: true, reducedMotion: true,
      }, version: 7 }))
      localStorage.setItem('cronicas-nexo-match', JSON.stringify({ state: {
        match: saved, history: [], matchLog: [], healthHistory: [], startedAtMs: Date.now(), elapsedSeconds: 0,
      }, version: 2 }))
    }, match)
    await page.goto('/battle')
    await expect(page.locator('[data-nexus-form="fury"][data-wear="3"]')).toHaveCount(1, { timeout: 25_000 })
    await expect(page.locator('[data-integrity="critical"]')).toHaveCount(1)
    await expect(page.locator('[data-integrity="wounded"]')).toHaveCount(1)
    await page.getByRole('button', { name: /Saltar guía/i }).click({ timeout: 2000 }).catch(() => {})
    if (process.env.RUN_SHOTS) {
      await page.waitForTimeout(1500)
      await page.screenshot({ path: `e2e/__shots__/nexo-critico-${width}x${height}.png` })
    }
    await page.getByRole('button', { name: /Bendición de la Luna/ }).first().click()
    await page.getByRole('button', { name: 'Resolver carta' }).click()
    await expect(page.getByText('TU NEXO · 16', { exact: true })).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('[data-nexus-form="fury"]')).toHaveAttribute('data-wear', '2')
    await expect(page.locator('[data-integrity="critical"]')).toHaveCount(0)
    await expect(page.locator('[data-integrity="wounded"]')).toHaveCount(2)
    if (process.env.RUN_SHOTS) {
      await page.waitForTimeout(300)
      await page.screenshot({ path: `e2e/__shots__/nexo-curado-${width}x${height}.png` })
    }
    expect(errors).toEqual([])
  })
}
