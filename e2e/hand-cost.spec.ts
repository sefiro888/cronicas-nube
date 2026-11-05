import { expect, test } from '@playwright/test'
import { STARTER_DECKS, createMatch, type MatchState } from '../src/game'

for (const [width, height] of [[1920, 1080], [1366, 768], [390, 844]] as const) {
  test(`la mano muestra el coste de la copia y marca las jugadas disponibles a ${width}`, async ({ page }) => {
    const base = createMatch(STARTER_DECKS[0]!, STARTER_DECKS[1]!, 42)
    const match: MatchState = {
      ...base, activePlayer: 'player', phase: 'main', turn: 5, terrain: [], board: [],
      players: { ...base.players, player: {
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
    if (process.env.RUN_SHOTS) await page.screenshot({ path: `tools/captures/coste-y-mano/${width}x${height}.png` })
  })
}
