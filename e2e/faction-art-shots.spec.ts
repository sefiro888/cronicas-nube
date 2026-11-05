import { expect, test } from '@playwright/test'
import { CARD_BY_ID, STARTER_DECKS, createMatch, type MatchState } from '../src/game'
import { resolveScenario } from '../src/battle/scenarioForFaction'
import { cardFrameFor } from '../src/presentation/cardFrames'
import { fiberModuleUrl } from './helpers/cameraSnapshot'
import type { RootState } from '@react-three/fiber'
import type { Mesh, MeshStandardMaterial } from 'three'

test.skip(!process.env.RUN_FACTION_SHOTS, 'revisión visual bajo demanda con RUN_FACTION_SHOTS=1')
test.use({ actionTimeout: 10_000 })
const quality = process.env.FACTION_SHOTS_QUALITY === 'high' ? 'high'
  : process.env.FACTION_SHOTS_QUALITY === 'low' ? 'low' : 'medium'

for (const deck of STARTER_DECKS) {
  for (const [width, height] of [[1920, 1080], [1366, 768]] as const) {
    test(`carta y suelo de ${deck.faction} en batalla a ${width}`, async ({ page }) => {
      test.setTimeout(120_000)
      const card = deck.cards.map(({ cardId }) => CARD_BY_ID[cardId]!).find(({ type }) => type === 'unit')!
      const rival = STARTER_DECKS.find(({ faction }) => faction !== deck.faction)!
      const base = createMatch(deck, rival, 42)
      const frame = cardFrameFor(deck.faction)
      const floor = deck.faction === 'fury' ? 'lava-caldera-roca-v1.webp'
        : deck.faction === 'samsara' || deck.faction === 'sol' ? `suelo-${deck.faction}-v2.webp`
        : `suelo-${deck.faction}-v1.webp`
      const match: MatchState = {
        ...base, turn: 5, phase: 'main', activePlayer: 'player', terrain: [], animations: [],
        board: [{ instanceId: 'review', cardId: card.id, owner: 'player', position: { x: 3, y: 5 },
          currentHealth: card.health!, attackModifier: 1, movedThisTurn: false, attackedThisTurn: false, enteredOnTurn: 1, statuses: [] }],
        players: { ...base.players, player: { ...base.players.player, mulliganTaken: true,
          hand: [...new Set([card.id, ...deck.cards.map(({ cardId }) => cardId)])].slice(0, 4).map(
            (cardId, index) => ({ cardId, instanceId: `review-${index}` })) } },
      }
      await page.setViewportSize({ width, height })
      await page.addInitScript(({ match, deckId, scenario, quality }) => {
        localStorage.setItem('cronicas-nexo-howto-visto', '1')
        localStorage.setItem('cronicas-nexo-preferences', JSON.stringify({ state: {
          muted: true, reducedMotion: true, graphicsQuality: quality, scenario, selectedDeckId: deckId,
        }, version: 7 }))
        localStorage.setItem('cronicas-nexo-match', JSON.stringify({ state: {
          match, history: [], matchLog: [], healthHistory: [], startedAtMs: Date.now(), elapsedSeconds: 0,
        }, version: 2 }))
      }, { match, deckId: deck.id, scenario: width === 1920 ? 'auto' : resolveScenario('auto', deck.faction), quality })
      const fiber = fiberModuleUrl(page)
      await page.goto('/battle')
      const url = await fiber
      const label = page.locator('[class*="cardLabel"]').filter({ hasText: card.name }).first()
      await expect(label).toBeVisible({ timeout: 40_000 })
      const boardState = () => page.evaluate(async ({ url, floor }) => {
        const { _roots } = await import(url) as { _roots: ReadonlyMap<HTMLCanvasElement, { store: { getState: () => RootState } }> }
        const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="battle-board"] canvas')!
        const { scene } = _roots.get(canvas)!.store.getState()
        let tiles = 0, faces = 0, valid = 0
        scene.traverse((object) => {
          const mesh = object as Mesh<Mesh['geometry'], MeshStandardMaterial>
          if (object.userData.validCell === true) valid += 1
          const image: unknown = mesh.material?.map?.image
          if (image instanceof HTMLImageElement && image.src.endsWith(`/${floor}`)) tiles += 1
          if (image instanceof HTMLCanvasElement && image.width === 512 && image.height === 768) faces += 1
        })
        return { tiles, faces, valid }
      }, { url, floor })
      await expect.poll(boardState, { timeout: 15_000 }).toMatchObject({ tiles: 64, faces: frame ? 2 : 0 })
      const box = (await label.boundingBox())!
      await page.mouse.click(box.x + box.width / 2, box.y + box.height + 26)
      await expect.poll(async () => (await boardState()).valid).toBeGreaterThan(0)
      await page.mouse.move(8, 8)
      const captures = `tools/captures/facciones/${deck.faction}${quality === 'medium' ? '' : `/${quality}`}`
      await page.screenshot({ path: `${captures}/batalla-${width}x${height}.png` })
      if (width !== 1366) return

      const hand = page.locator(`[aria-label="Tu mano"] [data-card-id="${card.id}"]`)
      await hand.click({ button: 'right' })
      const dialog = page.getByRole('dialog', { name: card.name, exact: true })
      await dialog.getByRole('button', { name: 'Carta completa', exact: true }).click()
      const exhibit = dialog.locator(`[data-view="card"] article[data-card-id="${card.id}"]`)
      await expect(exhibit).toBeInViewport({ ratio: frame ? 1 : .95 })
      if (frame) await expect(exhibit).toHaveAttribute('data-frame', frame.id)
      await exhibit.screenshot({ path: `${captures}/carta.png` })
    })
  }
}
