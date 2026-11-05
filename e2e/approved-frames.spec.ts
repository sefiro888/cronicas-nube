import { expect, test } from '@playwright/test'
import { CARD_BY_ID, STARTER_DECKS, createMatch, type MatchState } from '../src/game'

const samples = [
  ['hoplita-de-la-falange', 'olimpo', 2, 5],
  ['pegaso-celestial', 'order', 5, 5],
  ['vampiro-siniestro', 'shadow', 2, 2],
  ['basilisco-caos', 'void', 5, 2],
  ['lobo-salvaje', 'nature', 4, 6],
] as const

for (const [width, height] of [[1920, 1080], [1366, 768], [390, 844]] as const) {
  test(`marcos aprobados y medallones en batalla a ${width}`, async ({ page }) => {
    const base = createMatch(STARTER_DECKS[0]!, STARTER_DECKS[1]!, 54)
    const match: MatchState = {
      ...base, turn: 5, phase: 'main', activePlayer: 'player', terrain: [],
      players: { ...base.players, player: { ...base.players.player, mulliganTaken: true } },
      board: samples.map(([cardId, , x, y], index) => ({
        instanceId: `muestra-${index}`, cardId, owner: index < 2 || index === 4 ? 'player' : 'ai',
        position: { x, y }, currentHealth: 2, attackModifier: index === 4 ? 1 : 0,
        movedThisTurn: false, attackedThisTurn: false, enteredOnTurn: 0, statuses: [],
      })),
    }
    await page.setViewportSize({ width, height })
    await page.addInitScript((match) => {
      localStorage.setItem('cronicas-nexo-howto-visto', '1')
      localStorage.setItem('cronicas-nexo-preferences', JSON.stringify({ state: { muted: true, reducedMotion: true, graphicsQuality: 'low', scenario: 'caldera' }, version: 7 }))
      localStorage.setItem('cronicas-nexo-match', JSON.stringify({ state: { match, history: [], matchLog: [], healthHistory: [], startedAtMs: Date.now() }, version: 2 }))
    }, match)
    const loaded = new Set<string>()
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('response', (response) => {
      const name = new URL(response.url()).pathname.split('/').at(-1)
      if (name?.endsWith('-v2.webp') && response.ok() && response.headers()['content-type']?.startsWith('image/')) loaded.add(name)
    })
    await page.goto('/battle')
    await expect(page.getByTestId('battle-board')).toBeVisible()
    const labels = page.locator('[class*="labelInner"]')
    await expect(labels).toHaveCount(5, { timeout: 25000 })
    for (const [cardId, faction] of samples) {
      const label = page.locator(`[class*="labelInner"][data-faction="${faction}"]`)
      await expect(label).toContainText(CARD_BY_ID[cardId]!.name)
      await expect(label.getByLabel(/^Vida 2 de /)).toBeVisible()
    }
    await expect.poll(() => samples.slice(0, 4).every(([, faction]) => loaded.has(`${faction}-v2.webp`)), { timeout: 20000 }).toBe(true)
    await page.screenshot({ path: `tools/captures/32-mejoras/fichas-${width}.png` })
    expect(errors).toEqual([])
  })
}
