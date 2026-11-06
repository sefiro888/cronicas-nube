import { expect, test } from '@playwright/test'
import { STARTER_DECKS, createMatch, type MatchState } from '../src/game'
import { fiberModuleUrl } from './helpers/cameraSnapshot'
import { matchStoreUrl } from './helpers/matchStoreUrl'
import type { RootState } from '@react-three/fiber'
import type { useMatchStore as MatchStore } from '../src/store/match'

for (const [width, height, scenario] of [[1920, 1080, 'caldera'], [1366, 768, 'aether-citadel']] as const) {
  test(`derriba la ruina y cruza por la casilla a ${width} × ${height}`, async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (entry) => { if (entry.type() === 'error') errors.push(entry.text()) })
    const base = createMatch(STARTER_DECKS[0]!, STARTER_DECKS[1]!, 712)
    const state: MatchState = {
      ...base, turn: 4, activePlayer: 'player', phase: 'main', animations: [],
      terrain: [{ kind: 'rubble', position: { x: 4, y: 4 } }, { kind: 'cover', position: { x: 2, y: 4 } }],
      players: { ...base.players, player: { ...base.players.player, mulliganTaken: true } },
      board: [{ instanceId: 'lobo', cardId: 'lobo-salvaje', owner: 'player', position: { x: 4, y: 5 }, currentHealth: 2,
        attackModifier: 0, movedThisTurn: false, attackedThisTurn: false, enteredOnTurn: 1, statuses: [] }],
    }
    await page.setViewportSize({ width, height })
    await page.addInitScript(([match, scenario]) => {
      localStorage.setItem('cronicas-nexo-howto-visto', '1')
      localStorage.setItem('cronicas-nexo-preferences', JSON.stringify({ version: 7, state: {
        scenario, muted: true, graphicsQuality: 'medium', presentationPace: 'cinematic', animationSpeed: .5,
      } }))
      localStorage.setItem('cronicas-nexo-match', JSON.stringify({ version: 2, state: {
        match, history: [], matchLog: [], healthHistory: [], startedAtMs: Date.now(), elapsedSeconds: 0,
      } }))
    }, [state, scenario] as const)
    const fiber = fiberModuleUrl(page)
    const store = matchStoreUrl(page)
    await page.goto('/battle')
    await expect(page.getByTestId('battle-board')).toBeVisible({ timeout: 25_000 })
    await page.getByRole('button', { name: /Saltar guía/i }).click({ timeout: 1500 }).catch(() => {})
    const module = await store
    const world = await fiber
    const model = () => page.evaluate(async (url) => {
      const { useMatchStore } = await import(url) as { useMatchStore: typeof MatchStore }
      const match = useMatchStore.getState().match!
      return { tile: match.terrain.find((tile) => tile.position.x === 4 && tile.position.y === 4),
        piece: match.board.find((piece) => piece.instanceId === 'lobo'), selected: useMatchStore.getState().selectedPieceId,
        playing: Boolean(useMatchStore.getState().currentEvent || useMatchStore.getState().pendingAnimations.length) }
    }, module)
    const ruptureProgress = () => page.evaluate(async (url) => {
      const { _roots } = await import(url) as { _roots: ReadonlyMap<HTMLCanvasElement, { store: { getState(): RootState } }> }
      const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="battle-board"] canvas')!
      return Number(_roots.get(canvas)?.store.getState().scene.getObjectByName('derrumbe-obstaculo')?.userData.ruptureProgress ?? 0)
    }, world)
    await page.keyboard.press('ArrowUp')
    await page.keyboard.press('Enter')
    await expect.poll(async () => (await model()).selected).toBe('lobo')
    await page.keyboard.press('ArrowUp')
    await expect(page.getByText('Romper obstáculo', { exact: true })).toBeVisible()
    await page.screenshot({ path: `tools/captures/obstaculos/objetivo-${width}.png` })
    await page.keyboard.press('Enter')
    await expect.poll(ruptureProgress, { intervals: [40, 80, 120] }).toBeGreaterThan(.49)
    await page.screenshot({ path: `tools/captures/obstaculos/derrumbe-${width}.png` })
    await expect.poll(async () => (await model()).playing).toBe(false)
    expect(await model()).toMatchObject({ tile: undefined, piece: { attackedThisTurn: true } })
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await page.keyboard.press('ArrowUp')
    await page.keyboard.press('Enter')
    await expect.poll(async () => (await model()).piece?.position).toEqual({ x: 4, y: 4 })
    expect(errors).toEqual([])
  })
}
