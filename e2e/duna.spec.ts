import { expect, test } from '@playwright/test'
import { STARTER_DECKS, createMatch } from '../src/game'
import type { MatchState } from '../src/game'

/**
 * Duna en la mesa: la Ofrenda tiene que poder pagarse desde la interfaz, o la
 * mecánica insignia de la facción no existe para quien juega.
 */
const partidaDuna = (): MatchState => {
  const duna = STARTER_DECKS.find((deck) => deck.faction === 'duna')!
  const rival = STARTER_DECKS.find((deck) => deck.faction === 'fury')!
  const base = createMatch(duna, rival, 20240822)
  return {
    ...base,
    turn: 6,
    phase: 'main',
    activePlayer: 'player',
    players: {
      ...base.players,
      player: {
        ...base.players.player,
        mulliganTaken: true,
        nexusHealth: 13,
        hand: [
          { cardId: 'oro-de-la-camara', instanceId: 'oro' },
          { cardId: 'crecida-del-rio', instanceId: 'crecida' },
        ],
        resources: Array.from({ length: 6 }, (_, index) => ({
          instanceId: `duna-${index}`, cardId: 'fuente-duna', faction: 'duna' as const, exhausted: false,
        })),
      },
    },
  }
}

test('la Ofrenda de Duna se puede pagar desde la mesa', async ({ page }) => {
  test.setTimeout(120_000)
  await page.addInitScript(([match, version]) => {
    localStorage.setItem('cronicas-nexo-match', JSON.stringify({
      state: { match, history: [], matchLog: [], healthHistory: [], startedAtMs: Date.now(), elapsedSeconds: 0 },
      version,
    }))
    localStorage.setItem('cronicas-nexo-howto-visto', '1')
    localStorage.setItem('cronicas-nexo-preferences', JSON.stringify({
      state: { muted: true, selectedDeckId: 'tribunal-duna', confirmEndTurn: false },
      version: 7,
    }))
  }, [partidaDuna(), 2] as const)

  await page.goto('/battle')
  await expect(page.getByTestId('battle-board')).toBeVisible({ timeout: 25_000 })

  // Elegir «Oro de la Cámara» saca el interruptor de Ofrenda.
  await page.getByRole('button', { name: /Oro de la Cámara/ }).first().click()
  const ofrenda = page.getByRole('button', { name: /Ofrendar/ })
  await expect(ofrenda).toBeVisible()
  await expect(ofrenda).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByText('Si pagas, tu Nexo pasa de 13 a 10 de Vida.')).toBeVisible()
  await ofrenda.click()
  await expect(ofrenda).toHaveAttribute('aria-pressed', 'true')
  await expect(ofrenda).toContainText('Ofrendarás')
  if (process.env.RUN_SHOTS) await page.screenshot({ path: 'e2e/__shots__/duna-ofrenda.png' })
  await page.getByRole('button', { name: 'Resolver carta', exact: true }).click()
  const cast = page.getByTestId('cast-spotlight')
  await expect(cast).toContainText('Ofrenda · −3 Vida', { timeout: 15000 })
  await expect(cast.locator('[data-faction-art="duna"][data-kind="spell"]').first()).toBeVisible()
  await page.screenshot({ path: 'tools/captures/duelos-y-poderes/hechizo-duna.png' })
})
