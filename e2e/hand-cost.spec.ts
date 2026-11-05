import { expect, test } from '@playwright/test'
import { STARTER_DECKS, createMatch, type MatchState } from '../src/game'

for (const [width, height] of [[1920, 1080], [1366, 768], [390, 844]] as const) {
  test(`la mano muestra el coste de la copia y marca las jugadas disponibles a ${width}`, async ({ page }) => {
    const base = createMatch(STARTER_DECKS[0]!, STARTER_DECKS[1]!, 42)
    const match: MatchState = {
      ...base, activePlayer: 'player', phase: 'main', turn: 5, terrain: [], board: [],
      players: { ...base.players, ai: { ...base.players.ai, commanderId: 'farnesio-duque-de-parma' }, player: {
        ...base.players.player, mulliganTaken: true, resourcePlayedThisTurn: false,
        hand: [
          { instanceId: 'dragón', cardId: 'dragon-caldera', costDiscount: 3 },
          { instanceId: 'ceniza', cardId: 'lluvia-ceniza' },
          { instanceId: 'fuente', cardId: 'fuente-furia' },
        ],
        resources: Array.from({ length: 3 }, (_, i) => ({
          instanceId: `recurso-${i}`, cardId: 'fuente-furia', faction: 'fury', exhausted: false,
        })),
      } },
    }
    await page.setViewportSize({ width, height })
    await page.addInitScript((match) => {
      localStorage.setItem('cronicas-nexo-howto-visto', '1')
      localStorage.setItem('cronicas-nexo-preferences', JSON.stringify({ state: {
        muted: true, reducedMotion: true, scenario: 'caldera', graphicsQuality: 'medium',
      }, version: 7 }))
      localStorage.setItem('cronicas-nexo-match', JSON.stringify({ state: {
        match, history: [], matchLog: [], healthHistory: [], startedAtMs: Date.now(), elapsedSeconds: 0,
      }, version: 2 }))
    }, match)
    await page.goto('/battle')
    const hand = page.getByLabel('Tu mano', { exact: true })
    const dragon = hand.locator('[data-card-id="dragon-caldera"]')
    const ash = hand.locator('[data-card-id="lluvia-ceniza"]')
    await expect(dragon.locator('[title="Coste: 2 Furia y 2 genérico"]')).toBeVisible()
    await expect(dragon.getByText('LISTA', { exact: true })).toHaveCount(0)
    await expect(ash.locator('[title="Coste: 1 Furia y 2 genérico"]')).toHaveAttribute('data-affordable', 'true')
    await expect(ash.getByText('LISTA', { exact: true })).toHaveCount(0)
    await hand.locator('[data-card-id="fuente-furia"]').click()
    await expect(dragon.getByText('LISTA', { exact: true })).toBeVisible()
    await expect(ash.getByText('LISTA', { exact: true })).toHaveCount(0)
    const overlap = await page.locator('header').evaluate((header) => {
      const items = [...header.querySelectorAll('button')].filter((item) => {
        const bounds = item.getBoundingClientRect()
        return bounds.top >= 0 && bounds.width > 0 && bounds.height > 0
      })
      return items.flatMap((item, index) => items.slice(index + 1).flatMap((other) => {
        const a = item.getBoundingClientRect(), b = other.getBoundingClientRect()
        return Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1
          && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1
          ? [item.getAttribute('aria-label') ?? item.textContent] : []
      }))
    })
    expect(overlap).toEqual([])
    const reserve = page.getByLabel('Tu reserva de Esencia')
    await expect(reserve).toBeInViewport({ ratio: 1 })
    if (width < 761) {
      const ledgerBounds = (await reserve.boundingBox())!
      const endBounds = (await page.getByRole('button', { name: 'Finalizar turno', exact: true }).boundingBox())!
      expect(ledgerBounds.y + ledgerBounds.height).toBeLessThanOrEqual(endBounds.y)
    }
    await ash.click()
    await expect(page.locator('[class*="actionHint"]')).toHaveText('Esta carta no tiene una jugada válida ahora mismo.')
    await dragon.click()
    await expect(page.locator('[class*="contextCost"]')).toHaveText('Coste: 2 Furia y 2 genérico')
    await dragon.click({ button: 'right' })
    const inspector = page.getByRole('dialog', { name: 'Dragón de la Caldera', exact: true })
    await expect(inspector).toBeVisible()
    await expect(inspector.locator('dl')).toContainText('2 Furia y 2 genérico')
    await page.keyboard.press('Escape')
    if (process.env.RUN_SHOTS) await page.screenshot({ path: `tools/captures/coste-y-mano/${width}x${height}.png` })
  })
}
