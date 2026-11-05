import { expect, test } from '@playwright/test'
import { CARD_BY_ID, STARTER_DECKS, createMatch, type MatchState } from '../src/game'
import { matchStoreUrl } from './helpers/matchStoreUrl'

test.use({ hasTouch: true, isMobile: true })

test('deslizar la mano de diez cartas en móvil no juega ni arrastra una fuente', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  const base = createMatch(STARTER_DECKS[0]!, STARTER_DECKS[1]!, 42)
  const match: MatchState = { ...base, terrain: [], players: { ...base.players,
    player: { ...base.players.player, mulliganTaken: true,
      hand: [...base.players.player.hand].sort((a, b) => Number(CARD_BY_ID[b.cardId]?.type === 'mana') - Number(CARD_BY_ID[a.cardId]?.type === 'mana')),
    },
  } }
  await page.addInitScript((match) => {
    localStorage.setItem('cronicas-nexo-howto-visto', '1')
    localStorage.setItem('cronicas-nexo-preferences', JSON.stringify({ state: {
      scenario: 'aether-citadel', graphicsQuality: 'low', muted: true, reducedMotion: true,
    }, version: 7 }))
    localStorage.setItem('cronicas-nexo-match', JSON.stringify({ state: {
      match, history: [], matchLog: [], healthHistory: [], startedAtMs: Date.now(), elapsedSeconds: 0,
    }, version: 2 }))
  }, match)
  const request = matchStoreUrl(page)
  await page.goto('/battle')
  const url = await request
  await page.getByRole('button', { name: /Saltar guía/i }).click({ timeout: 2000 }).catch(() => {})
  const rail = page.getByTestId('hand-scroll-rail')
  await expect(rail).toBeVisible()
  const intro = page.getByTestId('battle-intro')
  if (await intro.isVisible()) await intro.click()
  await expect(intro).toBeHidden()
  const source = page.locator('[class*="fanCard"] [data-card-id="fuente-furia"]').nth(2)
  const box = (await source.boundingBox())!
  const x = box.x + 15, y = 784
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
  for (let step = 1; step <= 7; step += 1) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - step * 15, y }] })
    await page.waitForTimeout(20)
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cdp.detach()
  await expect.poll(() => rail.evaluate((element) => element.scrollLeft)).toBeGreaterThan(20)
  const after = await page.evaluate(async (url) => {
    const module = await import(url) as { useMatchStore: { getState: () => { match: MatchState } } }
    return module.useMatchStore.getState().match
  }, url)
  expect(after.players.player.hand).toHaveLength(10)
  expect(after.players.player.resources).toEqual([])
  expect(after.board).toEqual([])
  if (process.env.RUN_SHOTS) await page.screenshot({ path: 'e2e/__shots__/mano-diez-deslizada-375x812.png' })
})
