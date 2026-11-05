import { expect, test } from '@playwright/test'
import { CARD_BY_ID, STARTER_DECKS, createMatch } from '../src/game'
import { fiberModuleUrl } from './helpers/cameraSnapshot'
import type { RootState } from '@react-three/fiber'
import type { Mesh, MeshStandardMaterial } from 'three'

test.use({ actionTimeout: 10_000 })

for (const [width, height] of [[1920, 1080], [1366, 768]] as const) {
  test(`el chasis y las losas de Fimbul se leen juntos a ${width} × ${height}`, async ({ page }) => {
    test.setTimeout(150_000)
    const deck = STARTER_DECKS.find(({ faction }) => faction === 'fimbul')!
    const base = createMatch(deck, STARTER_DECKS[1]!, 42)
    const card = CARD_BY_ID['arquera-de-hielo']!
    const match = {
      ...base, turn: 5, phase: 'main', activePlayer: 'player', terrain: [], animations: [],
      board: [
        { instanceId: 'fimbul-review', cardId: card.id, owner: 'player', position: { x: 3, y: 5 },
          currentHealth: 2, attackModifier: 1, movedThisTurn: false, attackedThisTurn: false, enteredOnTurn: 1, statuses: [] },
        { instanceId: 'fimbul-rival', cardId: 'grifo-orden', owner: 'ai', position: { x: 5, y: 4 },
          currentHealth: 2, attackModifier: 0, movedThisTurn: false, attackedThisTurn: false, enteredOnTurn: 1, statuses: [] },
      ],
      players: { ...base.players, player: { ...base.players.player, mulliganTaken: true,
        hand: ['fuente-fimbul', 'arquera-de-hielo', 'gigante-de-la-escarcha', 'escudero-del-thing'].map(
          (cardId, index) => ({ cardId, instanceId: `fimbul-hand-${index}` })) } },
    }
    await page.setViewportSize({ width, height })
    await page.addInitScript(({ state, deckId }) => {
      localStorage.setItem('cronicas-nexo-howto-visto', '1')
      localStorage.setItem('cronicas-nexo-preferences', JSON.stringify({ state: {
        muted: true, reducedMotion: true, graphicsQuality: 'medium', scenario: 'auto', selectedDeckId: deckId,
      }, version: 7 }))
      localStorage.setItem('cronicas-nexo-match', JSON.stringify({ state: {
        match: state, history: [], matchLog: [], healthHistory: [], startedAtMs: Date.now(), elapsedSeconds: 0,
      }, version: 2 }))
    }, { state: match, deckId: deck.id })
    const fiber = fiberModuleUrl(page)
    await page.goto('/battle')
    const url = await fiber
    const label = page.locator('[class*="cardLabel"]').filter({ hasText: card.name }).first()
    await expect(label).toBeVisible({ timeout: 45_000 })
    await expect(page.locator('[aria-label="Tu mano"] article[data-frame="fimbul-hielo"]')).toHaveCount(4)

    const boardState = () => page.evaluate(async (moduleUrl) => {
      const { _roots } = await import(moduleUrl) as { _roots: ReadonlyMap<HTMLCanvasElement, { store: { getState: () => RootState } }> }
      const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="battle-board"] canvas')!
      const { scene } = _roots.get(canvas)!.store.getState()
      const floor = new Set<string>()
      let faces = 0
      let valid = 0
      scene.traverse((object) => {
        const mesh = object as Mesh<Mesh['geometry'], MeshStandardMaterial>
        if (object.userData.validCell === true) valid += 1
        const map = mesh.material?.map
        const image: unknown = map?.image
        if (image instanceof HTMLImageElement && image.src.endsWith('/suelo-fimbul-v1.webp')) floor.add(map!.offset.toArray().join(','))
        if (image instanceof HTMLCanvasElement && image.width === 512 && image.height === 768) faces += 1
      })
      return { tiles: floor.size, faces, valid }
    }, url)
    await expect.poll(boardState).toMatchObject({ tiles: 64, faces: match.board.length * 2 })
    const box = (await label.boundingBox())!
    await page.mouse.click(box.x + box.width / 2, box.y + box.height + 26)
    await expect.poll(async () => (await boardState()).valid).toBeGreaterThan(0)
    await page.mouse.move(8, 8)
    await page.screenshot({ path: `tools/captures/fimbul/batalla-${width}x${height}.png` })

    const handCard = page.locator('[aria-label="Tu mano"] [data-card-id="gigante-de-la-escarcha"]')
    await handCard.click({ button: 'right' })
    const dialog = page.getByRole('dialog', { name: 'Gigante de la Escarcha', exact: true })
    await dialog.getByRole('button', { name: 'Carta completa', exact: true }).click()
    const fullCard = dialog.locator('article[data-frame="fimbul-hielo"]')
    await expect(fullCard).toBeInViewport({ ratio: 1 })
    const printedRules = await fullCard.locator('[class*="rules"]').evaluate((rules) => {
      const copy = rules.cloneNode(true) as HTMLElement
      copy.querySelectorAll('[role="tooltip"]').forEach((tooltip) => tooltip.remove())
      return copy.textContent
    })
    expect(printedRules).toBe(CARD_BY_ID['gigante-de-la-escarcha']!.rules)
    await page.screenshot({ path: `tools/captures/fimbul/carta-${width}x${height}.png` })

    await page.keyboard.press('Escape')
    const shieldBearer = page.locator('[aria-label="Tu mano"] [data-card-id="escudero-del-thing"]')
    await shieldBearer.click({ button: 'right' })
    const shieldDialog = page.getByRole('dialog', { name: 'Escudero del Thing', exact: true })
    await shieldDialog.getByRole('button', { name: 'Carta completa', exact: true }).click()
    const shieldCard = shieldDialog.locator('article[data-frame="fimbul-hielo"]')
    for (const name of ['Guardia', 'adyacentes']) {
      const term = shieldCard.locator(`[role='term'][aria-label^='${name}:']`)
      await term.hover()
      const tip = term.getByRole('tooltip')
      await expect(tip).toBeVisible()
      const bounds = (await shieldCard.boundingBox())!
      const popup = (await tip.boundingBox())!
      expect(popup.x).toBeGreaterThan(bounds.x)
      expect(popup.x + popup.width).toBeLessThan(bounds.x + bounds.width)
      await page.mouse.move(8, 8)
      await expect(tip).toBeHidden()
    }
    await shieldCard.locator("[role='term'][aria-label^='Guardia:']").hover()
    await page.screenshot({ path: `tools/captures/fimbul/guardia-${width}x${height}.png` })
    await page.mouse.move(8, 8)
    await page.screenshot({ path: `tools/captures/fimbul/escudero-${width}x${height}.png` })

    await page.keyboard.press('Escape')
    await page.mouse.dblclick(box.x + box.width / 2, box.y + box.height + 26)
    const copyDialog = page.getByRole('dialog', { name: card.name, exact: true })
    await copyDialog.getByRole('button', { name: 'Carta completa', exact: true }).click()
    await expect(copyDialog.locator('[title="Ataque 3"]')).toBeVisible()
    await expect(copyDialog.locator('[title="Vida 2"]')).toBeVisible()
  })
}
