import { expect, test } from '@playwright/test'
import type { MatchState } from '../src/game'
import type { useMatchStore as MatchStoreHook } from '../src/store/match'
import { matchStoreUrl } from './helpers/matchStoreUrl'

test('un guardián cambia de fase en batalla y su desenlace vuelve a la aventura', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('cronicas-nexo-howto-visto', '1')
    localStorage.setItem('cronicas-nexo-preferences', JSON.stringify({ state: { muted: true, reducedMotion: true, graphicsQuality: 'low', presentationPace: 'fast' }, version: 7 }))
  })
  const loaded = matchStoreUrl(page)
  await page.goto('/adventures')
  await page.getByRole('tab', { name: 'Guardianes del Nexo' }).click()
  await page.getByRole('combobox', { name: 'Guardián', exact: true }).selectOption('hambre-vacio')
  await page.getByRole('button', { name: 'Preparar desafío' }).click()
  await page.getByRole('button', { name: 'Entrar en batalla' }).click()
  const url = await loaded
  await expect(page).toHaveURL(/\/battle\?adventure=1$/, { timeout: 25000 })
  await expect(page.getByTestId('battle-board')).toBeVisible({ timeout: 25000 })
  const status = page.getByRole('complementary', { name: 'Estado de la aventura' })
  await expect(status).toContainText('Fase 1/2')
  const attack = () => page.evaluate(async (url) => {
    const { useMatchStore } = await import(/* @vite-ignore */ url) as { useMatchStore: typeof MatchStoreHook }
    const store = useMatchStore.getState()
    const current = store.match!
    const prepared: MatchState = {
      ...current, phase: 'main', activePlayer: 'player', turn: 5, terrain: [],
      players: { ...current.players, player: { ...current.players.player, mulliganTaken: true } },
      board: [{ instanceId: 'unidad-de-prueba', cardId: 'sabueso-brasa', owner: 'player', position: { x: 3, y: 0 }, currentHealth: 5, attackModifier: 100, movedThisTurn: false, attackedThisTurn: false, enteredOnTurn: 0, statuses: [] }],
    }
    store.replaceMatch(prepared)
    const ok = store.dispatch({ type: 'attack-nexus', playerId: 'player', attackerId: 'unidad-de-prueba' })
    store.skipAnimations()
    return { ok, winner: useMatchStore.getState().match?.winner, health: useMatchStore.getState().match?.players.ai.nexusHealth }
  }, url)
  expect(await attack()).toEqual({ ok: true, winner: undefined, health: 10 })
  await expect(status).toContainText('Fase 2/2')
  expect(await attack()).toEqual({ ok: true, winner: 'player', health: 0 })
  await status.getByRole('button', { name: /Ver desenlace/ }).click()
  await expect(page).toHaveURL(/\/adventures$/)
})

for (const [width, height] of [[1920, 1080], [1366, 768]] as const) {
  test(`la ruta del Atlas guarda sus sellos y la bifurcación a ${width}`, async ({ page }) => {
    test.setTimeout(90000)
    await page.setViewportSize({ width, height })
    await page.addInitScript(() => {
      localStorage.setItem('cronicas-nexo-howto-visto', '1')
      if (!localStorage.getItem('cronicas-nexo-preferences')) {
        localStorage.setItem('cronicas-nexo-preferences', JSON.stringify({ state: { scenario: 'caldera', muted: true, reducedMotion: true, graphicsQuality: 'low', presentationPace: 'fast' }, version: 7 }))
      }
    })
    const loaded = matchStoreUrl(page)
    await page.goto('/adventures')
    await page.getByRole('tab', { name: 'Ruta del sello partido' }).click()
    const atlas = page.getByRole('navigation', { name: 'Mapa de la expedición' })
    await expect(atlas.getByRole('button', { name: /Jade.*Bloqueado/ })).toBeVisible()
    await page.getByRole('button', { name: 'Preparar expedición' }).click()
    await page.getByRole('button', { name: 'Entrar en batalla' }).click()
    const url = await loaded
    await expect(page).toHaveURL(/\/battle\?adventure=1$/)
    await expect(page.getByText('Fiordo de Fimbul', { exact: true })).toBeVisible()
    const result = await page.evaluate(async (url) => {
      const { useMatchStore } = await import(/* @vite-ignore */ url) as { useMatchStore: typeof MatchStoreHook }
      const store = useMatchStore.getState()
      const match = store.match!
      store.replaceMatch({ ...match, phase: 'main', activePlayer: 'player', turn: 5, terrain: [],
        players: { ...match.players, player: { ...match.players.player, mulliganTaken: true } },
        board: [{ instanceId: 'ariete', cardId: 'sabueso-brasa', owner: 'player', position: { x: 3, y: 0 }, currentHealth: 5,
          attackModifier: 100, movedThisTurn: false, attackedThisTurn: false, enteredOnTurn: 0, statuses: [] }] })
      const ok = store.dispatch({ type: 'attack-nexus', playerId: 'player', attackerId: 'ariete' })
      store.skipAnimations()
      return { ok, winner: useMatchStore.getState().match?.winner, initialHealth: match.players.ai.nexusHealth }
    }, url)
    expect(result).toEqual({ ok: true, winner: 'player', initialHealth: 28 })
    await page.getByRole('button', { name: /Volver al mapa/ }).click()
    await page.reload()
    await expect(atlas.getByRole('button', { name: /Fimbul.*Superado/ })).toBeVisible()
    await expect(atlas.getByRole('button', { name: /Tercios.*Disponible/ })).toBeVisible()
    await atlas.getByRole('button', { name: /Jade.*Disponible/ }).click()
    await expect(page.getByText(/El rival comienza con el Mandato/)).toBeVisible()
    await atlas.locator('img[width="1881"]').evaluate((image: HTMLImageElement) => image.decode())
    await atlas.scrollIntoViewIfNeeded()
    await page.screenshot({ path: `tools/captures/adventures/ruta-atlas-${width}.png` })
    await page.getByRole('button', { name: 'Elegir este camino' }).click()
    await page.reload()
    await expect(atlas.getByRole('button', { name: /Jade.*Tu posición/ })).toHaveAttribute('aria-pressed', 'true')
    await expect(atlas.getByRole('button', { name: /Tercios.*Ruta alternativa/ })).toBeVisible()
    await page.getByRole('button', { name: 'Entrar en batalla' }).click()
    await expect(page.getByText('Corte de Jade', { exact: true })).toBeVisible()
    const preferences = await page.evaluate(() => JSON.parse(localStorage.getItem('cronicas-nexo-preferences')!).state)
    expect(preferences.scenario).toBe('caldera')
  })
}
