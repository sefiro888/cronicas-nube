import { expect, test } from '@playwright/test'
import { STARTER_DECKS, createMatch, type MatchState } from '../src/game'

for (const [width, height] of [[1920, 1080], [1366, 768]] as const) {
  test(`diez cartas caben entre los atriles y permiten consultar sus extremos a ${width}`, async ({ page }) => {
    const base = createMatch(STARTER_DECKS[0]!, STARTER_DECKS[1]!, 42)
    const match: MatchState = {
      ...base, phase: 'main', turn: 25, activePlayer: 'player', animations: [],
      players: { ...base.players, player: { ...base.players.player, mulliganTaken: true,
        resources: Array.from({ length: 12 }, (_, index) => ({
          instanceId: `fuente-${index}`, cardId: 'fuente-furia', faction: 'fury', exhausted: true,
        })),
      } },
    }
    await page.setViewportSize({ width, height })
    await page.addInitScript((match) => {
      localStorage.setItem('cronicas-nexo-howto-visto', '1')
      localStorage.setItem('cronicas-nexo-preferences', JSON.stringify({ state: {
        scenario: 'caldera', graphicsQuality: 'low', muted: true, reducedMotion: true,
      }, version: 7 }))
      localStorage.setItem('cronicas-nexo-match', JSON.stringify({ state: {
        match, history: [], matchLog: [], healthHistory: [], startedAtMs: Date.now(), elapsedSeconds: 0,
      }, version: 2 }))
    }, match)
    await page.goto('/battle')
    const rail = page.getByTestId('hand-scroll-rail')
    const cards = rail.locator('[data-card-id]')
    await expect(cards).toHaveCount(10)
    await expect(page.getByLabel('Tu reserva de Esencia')).toBeInViewport({ ratio: 1 })
    const check = async () => {
      const bounds = (await rail.boundingBox())!
      for (const card of await cards.all()) {
        const box = (await card.boundingBox())!
        expect(box.x).toBeGreaterThanOrEqual(bounds.x)
        expect(box.x + box.width).toBeLessThanOrEqual(bounds.x + bounds.width)
      }
    }
    await page.mouse.move(8, 8)
    await check()
    await cards.first().hover()
    await check()
    await cards.last().hover()
    await check()
    await page.mouse.move(8, 8)
    if (process.env.RUN_SHOTS) await page.screenshot({ path: `tools/captures/mano-completa/${width}x${height}.png` })
  })
}
