import { expect, test } from '@playwright/test'
import { STARTER_DECKS, createMatch, type MatchState } from '../src/game'

for (const [width, height] of [[1920, 1080], [1366, 768]] as const) {
  test(`Duna usa Ofrenda para evitar un remate desde la batalla a ${width} × ${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    const own = STARTER_DECKS.find((deck) => deck.faction === 'fury')!
    const duna = STARTER_DECKS.find((deck) => deck.faction === 'duna')!
    const base = createMatch(own, duna, 471)
    const match: MatchState = {
      ...base, turn: 4, activePlayer: 'ai', phase: 'main', terrain: [],
      board: [{
        instanceId: 'amenaza', cardId: 'gigante-magma', owner: 'player', position: { x: 3, y: 0 },
        currentHealth: 5, attackModifier: 10, movedThisTurn: false, attackedThisTurn: false, enteredOnTurn: 0, statuses: [],
      }],
      players: {
        player: { ...base.players.player, mulliganTaken: true, hand: [] },
        ai: {
          ...base.players.ai, nexusHealth: 11, mulliganTaken: true, commanderPowerUsed: true, resourcePlayedThisTurn: true,
          hand: [{ instanceId: 'ofrenda', cardId: 'plegaria-al-sol' }],
          resources: [{ instanceId: 'fuente', cardId: 'fuente-duna', faction: 'duna', exhausted: false }],
        },
      },
    }
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.addInitScript(([state, ownId, rivalId]) => {
      localStorage.setItem('cronicas-nexo-howto-visto', '1')
      localStorage.setItem('cronicas-nexo-preferences', JSON.stringify({
        state: { selectedDeckId: ownId, opponentDeckId: rivalId, muted: true, graphicsQuality: 'medium', reducedMotion: true, presentationPace: 'fast' },
        version: 7,
      }))
      localStorage.setItem('cronicas-nexo-match', JSON.stringify({
        state: { match: state, history: [], matchLog: [], healthHistory: [], startedAtMs: Date.now(), elapsedSeconds: 0 }, version: 2,
      }))
    }, [match, own.id, duna.id] as const)
    await page.goto('/battle')
    await expect(page.getByTestId('battle-board')).toBeVisible({ timeout: 25000 })
    await expect.poll(() => page.evaluate(() => {
      const saved = JSON.parse(localStorage.getItem('cronicas-nexo-match')!).state.match as MatchState
      return { threatGone: !saved.board.some((unit) => unit.instanceId === 'amenaza'), health: saved.players.ai.nexusHealth, active: saved.activePlayer }
    }), { timeout: 30000 }).toEqual({ threatGone: true, health: 9, active: 'player' })
    await expect(page.getByRole('button', { name: /Finalizar turno/i })).toBeEnabled()
    await page.screenshot({ path: `tools/captures/ia-tactica/duna-${width}.png` })
    expect(errors).toEqual([])
  })
}
