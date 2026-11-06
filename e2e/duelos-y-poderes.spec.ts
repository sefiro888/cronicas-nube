import { expect, test, type Page } from '@playwright/test'
import { CARD_BY_ID, STARTER_DECKS, createMatch, type BoardPiece, type FactionId, type GameAction, type MatchState } from '../src/game'
import type { useMatchStore as MatchStoreHook } from '../src/store/match'
import { fiberModuleUrl } from './helpers/cameraSnapshot'
import { matchStoreUrl } from './helpers/matchStoreUrl'

const deck = (faction: FactionId) => STARTER_DECKS.find((candidate) => candidate.faction === faction)!
const piece = (id: string, cardId: string, owner: BoardPiece['owner'], y: number, statuses: BoardPiece['statuses'] = []): BoardPiece => ({
  instanceId: id, cardId, owner, position: { x: 3, y }, currentHealth: CARD_BY_ID[cardId]!.health!,
  attackModifier: 0, movedThisTurn: false, attackedThisTurn: false, enteredOnTurn: 0, statuses,
})

async function openBattle(page: Page, match: MatchState, own: FactionId, rival: FactionId) {
  await page.addInitScript(([match, ownDeck, rivalDeck]) => {
    localStorage.setItem('cronicas-nexo-howto-visto', '1')
    localStorage.setItem('cronicas-nexo-preferences', JSON.stringify({ state: {
      selectedDeckId: ownDeck, opponentDeckId: rivalDeck, muted: true, graphicsQuality: 'medium', presentationPace: 'cinematic',
    }, version: 7 }))
    localStorage.setItem('cronicas-nexo-match', JSON.stringify({ state: {
      match, history: [], matchLog: [], healthHistory: [], startedAtMs: Date.now(), elapsedSeconds: 0,
    }, version: 2 }))
  }, [match, deck(own).id, deck(rival).id] as const)
  const module = matchStoreUrl(page)
  await page.goto('/battle')
  await expect(page.getByTestId('battle-board')).toBeVisible({ timeout: 25000 })
  return await module
}

const send = (page: Page, module: string, action: GameAction) => page.evaluate(async ({ module, action }) => {
  const { useMatchStore } = await import(/* @vite-ignore */ module) as { useMatchStore: typeof MatchStoreHook }
  const ok = useMatchStore.getState().dispatch(action)
  return { ok, message: useMatchStore.getState().message }
}, { module, action })

for (const [width, height] of [[1920, 1080], [1366, 768]] as const) {
  test(`Mandato, Cuenta del Sol y lanzamiento de Jade a ${width} × ${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    const base = createMatch(deck('jade'), deck('sol'), 781)
    const fiber = fiberModuleUrl(page)
    const module = await openBattle(page, {
      ...base, turn: 4, phase: 'main', activePlayer: 'player', mandate: 'ai',
      players: {
        ...base.players,
        player: {
          ...base.players.player, mulliganTaken: true, hand: [{ cardId: 'mandato-revocado', instanceId: 'sello' }],
          resources: Array.from({ length: 4 }, (_, i) => ({ instanceId: `jade-${i}`, cardId: 'fuente-jade', faction: 'jade', exhausted: false })),
        },
        ai: { ...base.players.ai, sunCount: 4, mulliganTaken: true },
      },
    }, 'jade', 'sol')
    const powers = page.getByRole('region', { name: 'Poderes de facción' })
    await expect(powers).toContainText('MandatoRival')
    await expect(powers).toContainText('Cuenta del Sol4')
    const url = await fiber
    await expect.poll(() => page.evaluate(async (url) => {
      const { _roots } = await import(/* @vite-ignore */ url)
      const canvas = document.querySelector('[data-testid="battle-board"] canvas')
      const scene = _roots.get(canvas)?.store.getState().scene
      let panorama = false
      scene?.traverse((mesh: { material?: { map?: { image?: unknown } } }) => {
        const image = mesh.material?.map?.image
        if (image instanceof HTMLImageElement && image.src.includes('/scenarios/')) panorama = true
      })
      return panorama
    }, url), { timeout: 25000 }).toBe(true)
    await page.screenshot({ path: `tools/captures/duelos-y-poderes/poderes-${width}.png` })
    const result = await send(page, module, { type: 'play-card', playerId: 'player', cardInstanceId: 'sello', target: { kind: 'none' } })
    expect(result.ok, result.message).toBe(true)
    await expect(powers).toContainText('MandatoTuyo')
    const cast = page.getByTestId('cast-spotlight')
    await expect(cast).toContainText('Mandato · Tuyo', { timeout: 15000 })
    await expect(cast.locator('[data-faction-art="jade"][data-kind="spell"]')).toBeVisible()
    await expect(cast.locator('section').filter({ hasText: 'Caligrafía imperial' })).toHaveCSS('opacity', '1')
    await page.screenshot({ path: `tools/captures/duelos-y-poderes/hechizo-jade-${width}.png` })
  })

  test(`duelo de Fimbul y Duna con protección y Vida a ${width} × ${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    test.setTimeout(90000)
    const base = createMatch(deck('fimbul'), deck('duna'), 921)
    const module = await openBattle(page, {
      ...base, turn: 4, phase: 'main', activePlayer: 'player', terrain: [],
      players: {
        player: { ...base.players.player, mulliganTaken: true, hand: [] },
        ai: { ...base.players.ai, mulliganTaken: true },
      },
      board: [
        piece('atacante', 'huscarle-del-rey', 'player', 4),
        piece('defensora', 'devoradora-del-inframundo', 'ai', 3, [{ kind: 'shielded', amount: 2 }]),
      ],
    }, 'fimbul', 'duna')
    const result = await send(page, module, { type: 'attack-piece', playerId: 'player', attackerId: 'atacante', defenderId: 'defensora' })
    expect(result.ok, result.message).toBe(true)
    const duel = page.getByTestId('combat-duel')
    await expect(duel).toContainText('Desafío', { timeout: 15000 })
    await expect(duel.locator('[data-faction-art="fimbul"][data-kind="strike"]')).toBeVisible({ timeout: 15000 })
    const defender = duel.locator('[data-role="defender"]')
    await expect(defender).toContainText('2 absorbidos', { timeout: 20000 })
    await expect(defender.getByTestId('battle-plate').filter({ hasText: 'Absorbe 2 de daño' })).toHaveAttribute('data-active', 'true')
    await expect(defender).toContainText('Vida 5 → 3', { timeout: 20000 })
    await page.screenshot({ path: `tools/captures/duelos-y-poderes/duelo-${width}.png` })
  })
}
test('Olimpo y Marea muestran el riesgo de cerrar turno y la fase pública', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  const base = createMatch(deck('olimpo'), deck('marea'), 129)
  await openBattle(page, {
    ...base, turn: 4, phase: 'main', activePlayer: 'player',
    players: {
      player: { ...base.players.player, mulliganTaken: true, hybris: 6 },
      ai: { ...base.players.ai, mulliganTaken: true },
    },
  }, 'olimpo', 'marea')
  const powers = page.getByRole('region', { name: 'Poderes de facción' })
  await expect(powers).toContainText('Pleamar→ Bajamar')
  await expect(powers).toContainText('Hybris6')
  await expect(page.getByText('Hybris · perderías 3 de Vida al cerrar el turno')).toBeVisible()
})
test('el duelo contra el Nexo conserva su Vida de apertura y muestra su pérdida real', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 })
  const base = createMatch(deck('fimbul'), deck('duna'), 761)
  const module = await openBattle(page, {
    ...base, turn: 4, phase: 'main', activePlayer: 'player', terrain: [],
    board: [piece('atacante', 'huscarle-del-rey', 'player', 0)],
    players: {
      player: { ...base.players.player, mulliganTaken: true },
      ai: { ...base.players.ai, nexusHealth: 22, mulliganTaken: true },
    },
  }, 'fimbul', 'duna')
  const result = await send(page, module, { type: 'attack-nexus', playerId: 'player', attackerId: 'atacante' })
  expect(result.ok, result.message).toBe(true)
  const nexus = page.getByTestId('duel-nexus')
  await expect(nexus.getByLabel(/Vida del Nexo: 22 de /)).toBeVisible({ timeout: 15000 })
  await expect(nexus.getByLabel(/Vida del Nexo: 18 de /)).toBeVisible({ timeout: 15000 })
  await expect(nexus.locator('[data-faction-art="duna"]')).toBeVisible()
  await page.screenshot({ path: 'tools/captures/duelos-y-poderes/duelo-nexo-1366.png' })
})
