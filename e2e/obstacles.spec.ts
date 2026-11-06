import { writeFile } from 'node:fs/promises'
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
        scenario, muted: true, graphicsQuality: 'medium', presentationPace: 'cinematic', animationSpeed: 1, reducedMotion: false,
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
    await page.keyboard.press('ArrowUp')
    await page.keyboard.press('Enter')
    await expect.poll(async () => (await model()).selected).toBe('lobo')
    await page.keyboard.press('ArrowUp')
    await expect(page.getByText('Romper obstáculo', { exact: true })).toBeVisible()
    await page.screenshot({ path: `tools/captures/obstaculos/objetivo-${width}.png` })
    await page.evaluate(async ({ world, module }) => {
      const { _roots } = await import(world) as { _roots: ReadonlyMap<HTMLCanvasElement, { store: { getState(): RootState } }> }
      const { useMatchStore } = await import(module) as { useMatchStore: typeof MatchStore }
      const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="battle-board"] canvas')!
      const scene = _roots.get(canvas)?.store.getState()
      if (!scene) throw new Error('No se encontró el tablero para observar el impacto.')
      const audit = { event: false, model: false, shot: '' }
      Object.assign(window, { obstacleAudit: audit })
      const expires = performance.now() + 8000
      const observe = () => {
        const event = useMatchStore.getState().currentEvent
        audit.event ||= event?.type === 'obstacle-break'
        const effect = scene.scene.getObjectByName('derrumbe-obstaculo')
        audit.model ||= Boolean(effect)
        if (effect && Number(effect.userData.ruptureProgress) >= .51) {
          scene.gl.render(scene.scene, scene.camera)
          audit.shot = canvas.toDataURL('image/png').split(',')[1]!
          return
        }
        if (performance.now() < expires) requestAnimationFrame(observe)
      }
      requestAnimationFrame(observe)
    }, { world, module })
    await page.keyboard.press('Enter')
    const impact = () => page.evaluate(() => (window as unknown as { obstacleAudit: { event: boolean; model: boolean; shot: string } }).obstacleAudit)
    await expect.poll(async () => {
      const { event, model, shot } = await impact()
      return { event, model, captured: Boolean(shot) }
    }, { timeout: 9_000 }).toEqual({ event: true, model: true, captured: true })
    const folder = 'tools/captures/obstaculos'
    await writeFile(`${folder}/derrumbe-${width}.png`, Buffer.from((await impact()).shot, 'base64'))
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
