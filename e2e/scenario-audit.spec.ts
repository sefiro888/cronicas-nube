import { expect, test } from '@playwright/test'
import type { RootState } from '@react-three/fiber'
import type { Mesh, MeshStandardMaterial } from 'three'
import { CARD_BY_ID, STARTER_DECKS, createMatch, type MatchState } from '../src/game'
import { SCENARIO_ENVIRONMENTS } from '../src/battle/scenarioEnvironments'
import { resolveScenario } from '../src/battle/scenarioForFaction'
import { fiberModuleUrl, poseCamera } from './helpers/cameraSnapshot'

test.skip(!process.env.RUN_SCENARIO_AUDIT, 'Auditoría gráfica de los 19 mundos con RUN_SCENARIO_AUDIT=1')
for (const deck of STARTER_DECKS) for (const width of [1920, 1366]) {
  test(`auditoría de escenario ${deck.faction} a ${width}`, async ({ page }) => {
    test.setTimeout(100000)
    await page.setViewportSize({ width, height: width === 1920 ? 1080 : 768 })
    const scenario = resolveScenario('auto', deck.faction)
    const environment = SCENARIO_ENVIRONMENTS[scenario]
    const unit = deck.cards.map(({ cardId }) => CARD_BY_ID[cardId]!).find((card) => card.type === 'unit')!
    const base = createMatch(deck, STARTER_DECKS.find((other) => other.id !== deck.id)!, 73)
    const match: MatchState = { ...base, turn: 5, phase: 'main', activePlayer: 'player', terrain: [], animations: [],
      players: { ...base.players, player: { ...base.players.player, mulliganTaken: true, hand: [] }, ai: { ...base.players.ai, mulliganTaken: true } },
      board: [{ instanceId: 'audit-near', cardId: unit.id, owner: 'player', position: { x: 3, y: 5 }, currentHealth: unit.health!, attackModifier: 0, movedThisTurn: false, attackedThisTurn: false, enteredOnTurn: 1, statuses: [] },
        { instanceId: 'audit-middle', cardId: unit.id, owner: 'ai', position: { x: 5, y: 3 }, currentHealth: unit.health!, attackModifier: 0, movedThisTurn: false, attackedThisTurn: false, enteredOnTurn: 1, statuses: [] },
        { instanceId: 'audit-far', cardId: unit.id, owner: 'ai', position: { x: 2, y: 1 }, currentHealth: unit.health!, attackModifier: 0, movedThisTurn: false, attackedThisTurn: false, enteredOnTurn: 1, statuses: [] }],
    }
    await page.addInitScript(({ match, scenario, deck }) => {
      localStorage.setItem('cronicas-nexo-howto-visto', '1')
      localStorage.setItem('cronicas-nexo-preferences', JSON.stringify({ state: { muted: true, reducedMotion: true, graphicsQuality: 'medium', scenario, selectedDeckId: deck }, version: 7 }))
      localStorage.setItem('cronicas-nexo-match', JSON.stringify({ state: { match, history: [], matchLog: [], healthHistory: [], startedAtMs: Date.now(), elapsedSeconds: 0 }, version: 2 }))
    }, { match, scenario, deck: deck.id })
    const assetFailures: string[] = []
    const pageErrors: string[] = []
    page.on('response', (response) => { if (response.status() >= 400 && response.url().includes('/assets/')) assetFailures.push(response.url()) })
    page.on('pageerror', (error) => pageErrors.push(error.message))
    const fiber = fiberModuleUrl(page)
    await page.goto('/battle')
    const url = await fiber
    await expect.poll(() => page.evaluate(async ({ url, floor, panorama }) => {
      const { _roots } = await import(url) as { _roots: ReadonlyMap<HTMLCanvasElement, { store: { getState: () => RootState } }> }
      const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="battle-board"] canvas')!
      const scene = _roots.get(canvas)?.store.getState().scene
      let tiles = 0, vista = 0
      scene?.traverse((object) => {
        const mesh = object as Mesh<Mesh['geometry'], MeshStandardMaterial>
        const image: unknown = mesh.material?.map?.image
        if (!(image instanceof HTMLImageElement)) return
        if (image.src.endsWith(floor)) tiles += 1
        if (image.src.endsWith(panorama)) vista += 1
      })
      return { tiles, vista }
    }, { url, floor: environment.floor, panorama: environment.panorama }), { timeout: 40000 }).toEqual({ tiles: 64, vista: 1 })
    const labels = page.locator('[class*="cardLabel"]').filter({ hasText: unit.name })
    await expect(labels).toHaveCount(3)
    const poses = [[9, 9, 9], [-9, 9, -9]] as const
    for (let index = 0; index < poses.length; index += 1) {
      await poseCamera(page, url, poses[index]!)
      for (let label = 0; label < 3; label += 1) await expect(labels.nth(label)).toBeInViewport({ ratio: .8 })
      await page.screenshot({ path: `tools/captures/auditoria-escenarios/${deck.faction}-${width}-camara${index + 1}.png` })
    }
    expect(assetFailures).toEqual([])
    expect(pageErrors).toEqual([])
  })
}
