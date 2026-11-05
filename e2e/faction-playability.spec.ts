import { expect, test } from '@playwright/test'
import { CARD_BY_ID, STARTER_DECKS, createMatch, handCardCost, type MatchState } from '../src/game'

test.skip(!process.env.RUN_FACTION_FLOW, 'recorrido de los diecinueve marcos bajo demanda con RUN_FACTION_FLOW=1')

for (const deck of STARTER_DECKS) {
  test(`${deck.faction} permite seleccionar su marco, desplegar y pagar desde la mano`, async ({ page }) => {
    const card = deck.cards.map(({ cardId }) => CARD_BY_ID[cardId]!).find(({ type }) => type === 'unit')!
    const source = deck.cards.map(({ cardId }) => CARD_BY_ID[cardId]!).find(({ type }) => type === 'mana')!
    const copy = { cardId: card.id, instanceId: 'unidad-de-prueba' }
    const base = createMatch(deck, STARTER_DECKS.find(({ faction }) => faction !== deck.faction)!, 42)
    const match: MatchState = {
      ...base, phase: 'main', turn: 5, activePlayer: 'player', board: [], terrain: [], animations: [],
      players: { ...base.players, player: {
        ...base.players.player, mulliganTaken: true, resourcePlayedThisTurn: false,
        hand: [copy, { cardId: source.id, instanceId: 'fuente-de-prueba' }],
        resources: Array.from({ length: 8 }, (_, index) => ({
          cardId: source.id, instanceId: `reserva-${index}`, faction: deck.faction, exhausted: false,
        })),
      } },
    }
    const cost = handCardCost(match, 'player', card, copy)
    const expectedSpent = cost.generic + Object.values(cost.colored).reduce((sum, amount) => sum + (amount ?? 0), 0)
    await page.setViewportSize({ width: 1366, height: 768 })
    await page.addInitScript(({ match, deckId }) => {
      localStorage.setItem('cronicas-nexo-howto-visto', '1')
      localStorage.setItem('cronicas-nexo-preferences', JSON.stringify({ state: {
        selectedDeckId: deckId, scenario: 'auto', graphicsQuality: 'medium', muted: true,
        reducedMotion: true, presentationPace: 'fast', confirmEndTurn: false,
      }, version: 7 }))
      localStorage.setItem('cronicas-nexo-match', JSON.stringify({ state: {
        match, history: [], matchLog: [], healthHistory: [], startedAtMs: Date.now(), elapsedSeconds: 0,
      }, version: 2 }))
    }, { match, deckId: deck.id })
    await page.goto('/battle')
    const hand = page.getByLabel('Tu mano', { exact: true })
    await hand.locator(`[data-card-id="${source.id}"]`).click()
    await expect(hand.locator(`[data-card-id="${source.id}"]`)).toHaveCount(0)
    const unit = hand.locator(`[data-card-id="${card.id}"]`)
    await expect(unit.getByText('LISTA', { exact: true })).toBeVisible()
    await unit.click()
    await expect(unit).toHaveAttribute('aria-pressed', 'true')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')
    await expect.poll(() => page.evaluate((cardId) => {
      const saved = JSON.parse(localStorage.getItem('cronicas-nexo-match')!) as { state: { match: MatchState } }
      const player = saved.state.match.players.player
      return {
        deployed: saved.state.match.board.some((piece) => piece.cardId === cardId && piece.owner === 'player'),
        sources: player.resources.length,
        spent: player.resources.filter(({ exhausted }) => exhausted).length,
        copyInHand: player.hand.some(({ instanceId }) => instanceId === 'unidad-de-prueba'),
      }
    }, card.id)).toEqual({ deployed: true, sources: 9, spent: expectedSpent, copyInHand: false })
  })
}
