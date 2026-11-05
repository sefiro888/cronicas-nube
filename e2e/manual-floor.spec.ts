import { expect, test } from '@playwright/test'
import type { RootState } from '@react-three/fiber'
import type { Mesh, MeshStandardMaterial } from 'three'
import { STARTER_DECKS, createMatch, type MatchState } from '../src/game'
import { fiberModuleUrl } from './helpers/cameraSnapshot'

for (const [scenario, floor, quality] of [
  ['duna', 'suelo-duna-v1.webp', 'low'],
  ['wheel-ghat', 'suelo-samsara-v2.webp', 'medium'],
] as const) {
  test(`el escenario manual ${scenario} conserva su suelo con comandante Fimbul y calidad ${quality}`, async ({ page }) => {
    const deck = STARTER_DECKS.find(({ faction }) => faction === 'fimbul')!
    const base = createMatch(deck, STARTER_DECKS[0]!, 42)
    const match: MatchState = {
      ...base, phase: 'main', activePlayer: 'player', animations: [],
      players: { ...base.players, player: { ...base.players.player, mulliganTaken: true } },
    }
    await page.setViewportSize({ width: 1366, height: 768 })
    await page.addInitScript(({ match, scenario, quality }) => {
      localStorage.setItem('cronicas-nexo-howto-visto', '1')
      localStorage.setItem('cronicas-nexo-preferences', JSON.stringify({ state: {
        scenario, graphicsQuality: quality, muted: true, reducedMotion: true,
      }, version: 7 }))
      localStorage.setItem('cronicas-nexo-match', JSON.stringify({ state: {
        match, history: [], matchLog: [], healthHistory: [], startedAtMs: Date.now(), elapsedSeconds: 0,
      }, version: 2 }))
    }, { match, scenario, quality })
    const fiber = fiberModuleUrl(page)
    await page.goto('/battle')
    const url = await fiber
    await expect.poll(() => page.evaluate(async ({ url, floor }) => {
      const { _roots } = await import(url) as { _roots: ReadonlyMap<HTMLCanvasElement, { store: { getState: () => RootState } }> }
      const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="battle-board"] canvas')!
      const scene = _roots.get(canvas)?.store.getState().scene
      let expected = 0, wrongFaction = 0
      scene?.traverse((object) => {
        const mesh = object as Mesh<Mesh['geometry'], MeshStandardMaterial>
        const image: unknown = mesh.material?.map?.image
        if (!(image instanceof HTMLImageElement)) return
        if (image.src.endsWith(`/${floor}`)) expected += 1
        if (image.src.endsWith('/suelo-fimbul-v1.webp')) wrongFaction += 1
      })
      return { expected, wrongFaction }
    }, { url, floor }), { timeout: 25_000 }).toEqual({ expected: 64, wrongFaction: 0 })
  })
}
