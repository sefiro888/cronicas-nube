import { expect, test, type Page } from '@playwright/test'

/**
 * Fichas pegadas: el propietario no conseguía seleccionar su carta junto a
 * otra ni atacar a la rival que tenía justo detrás. Causas: el aura de
 * motas de raras y míticas se tragaba los clics (raycast de puntos) y la
 * carta propia tapaba desde la cámara a la rival. Esta prueba lo hace con el
 * ratón de verdad: seleccionar, ver el sello al apuntar y atacar.
 */
import { CARD_BY_ID, STARTER_DECKS, createMatch } from '../src/game'
import type { BoardPiece, CardDefinition, MatchState, PlayerId, Position } from '../src/game'

const pieza = (instanceId: string, cardId: string, owner: PlayerId, position: Position): BoardPiece => {
  const card = CARD_BY_ID[cardId]!
  return { instanceId, cardId, owner, position, currentHealth: card.health ?? 1, attackModifier: 0, movedThisTurn: false, attackedThisTurn: false, enteredOnTurn: 0, statuses: [] }
}
const unit = (test: (card: CardDefinition) => boolean) => Object.values(CARD_BY_ID).find((card) => card.type === 'unit' && test(card))!

const store = (page: Page) => page.evaluate(async () => {
  const path = '/src/store/match.ts'
  const { useMatchStore } = await import(/* @vite-ignore */ path)
  const state = useMatchStore.getState()
  return { selected: state.selectedPieceId as string | undefined, rivalOnBoard: state.match.board.filter((p: BoardPiece) => p.owner === 'ai').length, rivalHealth: state.match.board.find((p: BoardPiece) => p.instanceId === 'suya')?.currentHealth as number | undefined, events: state.pendingAnimations.length + (state.currentEvent ? 1 : 0) }
})

/** Punto de pantalla de una ficha: justo debajo de su rótulo de nombre/estadísticas. */
const pieceSpot = async (page: Page, name: string) => {
  const label = page.locator('[class*="cardLabel"]').filter({ hasText: name }).first()
  const box = (await label.boundingBox())!
  return { x: box.x + box.width / 2, y: box.y + box.height + 30 }
}

test('fichas pegadas: seleccionar, apuntar y atacar con el ratón', async ({ page }) => {
  test.setTimeout(300_000)
  const mythic = unit((card) => card.rarity === 'mythic' && (card.range ?? 1) <= 1 && (card.attack ?? 0) >= 3 && !card.keywords.includes('flying'))
  const buddy = unit((card) => card.rarity === 'rare' && (card.range ?? 1) <= 1 && card.id !== mythic.id)
  const enemy = unit((card) => card.rarity === 'common' && (card.health ?? 0) >= 6)
  const base = createMatch(STARTER_DECKS[0]!, STARTER_DECKS[1]!, 1311657807)
  const match: MatchState = { ...base, turn: 6, phase: 'main', activePlayer: 'player', terrain: [], board: [
    pieza('mia', mythic.id, 'player', { x: 3, y: 4 }),
    pieza('vecina', buddy.id, 'player', { x: 4, y: 4 }),
    pieza('suya', enemy.id, 'ai', { x: 3, y: 3 }),
  ] }
  await page.addInitScript(([state]) => {
    localStorage.setItem('cronicas-nexo-match', JSON.stringify({ state: { match: state, history: [], matchLog: [], healthHistory: [], startedAtMs: Date.now(), elapsedSeconds: 0 }, version: 2 }))
    localStorage.setItem('cronicas-nexo-howto-visto', '1')
    localStorage.setItem('cronicas-nexo-preferences', JSON.stringify({ state: { muted: true, scenario: 'sanctuary', confirmEndTurn: false, selectedDeckId: 'furia-caldera' }, version: 7 }))
  }, [match] as const)
  await page.setViewportSize({ width: 1366, height: 768 })
  await page.goto('/battle')
  await expect(page.getByTestId('battle-board')).toBeVisible({ timeout: 60_000 })
  await page.waitForTimeout(4000)

  const mine = await pieceSpot(page, mythic.name)
  await page.mouse.click(mine.x, mine.y)
  await page.waitForTimeout(800)
  expect((await store(page)).selected, 'seleccionar mi mítica pegada a otra').toBe('mia')

  const label = (await page.locator('[class*="cardLabel"]').filter({ hasText: enemy.name }).first().boundingBox())!
  let target = { x: 0, y: 0 }
  const tried: string[] = []
  for (const dy of [-10, 0, 10, 20, 30, 40, 50, 60, 70, 80]) {
    for (const dx of [-20, 0, 20]) {
      target = { x: label.x + label.width / 2 + dx, y: label.y + label.height + dy }
      await page.mouse.move(target.x, target.y, { steps: 3 })
      await page.waitForTimeout(250)
      if (await page.locator('[class*="verdict"]').count()) break
      tried.push(`${dx},${dy}`)
    }
    if (await page.locator('[class*="verdict"]').count()) break
  }
  await expect(page.locator('[class*="verdict"]').first(), 'sello de previsión al apuntar').toBeVisible({ timeout: 3000 })
  await page.screenshot({ path: (process.env.SHOT_DIR ?? 'e2e/__shots__') + '/pegadas.png' })
  await page.mouse.click(target.x, target.y)
  await page.waitForTimeout(1500)
  const after = await store(page)
  expect(after.rivalHealth === undefined || after.rivalHealth < (enemy.health ?? 0), 'el ataque se hace').toBe(true)
})
