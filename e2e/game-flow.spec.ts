import { expect, test } from '@playwright/test'
import { CARDS } from '../src/game/cards'

test('recorre la galería y comienza una partida contra la IA', async ({ page }) => {
  test.setTimeout(90_000)
  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })

  // El e2e valida el flujo de juego, no los gráficos: calidad baja y
  // movimiento reducido para que el WebGL por software no agote el tiempo.
  await page.addInitScript(() => {
    localStorage.setItem(
      'cronicas-nexo-preferences',
      JSON.stringify({
        state: {
          masterVolume: 0, musicVolume: 0, effectsVolume: 0, muted: true,
          reducedMotion: true, aiDelayMs: 200, selectedDeckId: 'furia-caldera',
          graphicsQuality: 'low', scenario: 'aether-citadel', animationSpeed: 2,
        },
        version: 3,
      }),
    )
    // Sin esto, la guía "Cómo jugar" se abre sola la primera vez y su fondo
    // bloquea los clics del mulligan que hay debajo.
    localStorage.setItem('cronicas-nexo-howto-visto', '1')
  })

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'CRÓNICAS DEL NEXO' })).toBeVisible()

  await page.getByRole('link', { name: 'Explorar cartas' }).click()
  await expect(page).toHaveURL(/\/gallery$/)
  await expect(page.locator('[data-card-id]')).toHaveCount(CARDS.length)

  await page.getByRole('button', { name: /Sabueso de Brasa\. Unidad/ }).click()
  await expect(page.getByRole('dialog', { name: 'Sabueso de Brasa' })).toBeVisible()
  await page.getByRole('dialog', { name: 'Sabueso de Brasa' }).getByRole('term').filter({ hasText: /^Impulso/ }).hover()
  await expect(page.getByRole('tooltip').filter({ hasText: 'Impulso' }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar inspección' }).click()

  await page.getByRole('link', { name: 'Jugar' }).click()
  await expect(page.getByRole('heading', { name: 'Selecciona tu mazo' })).toBeVisible()
  await page.getByRole('button', { name: 'Entrar al tablero →' }).click()

  // Semilla fija: la mano inicial debe contener una fuente para el paso siguiente.
  await page.goto('/battle?seed=1311657807')
  // El tablero es un chunk aparte + una escena 3D: con varias pruebas
  // compitiendo por la CPU, los 5 s por defecto se quedan cortos.
  await expect(page.getByTestId('battle-board')).toBeVisible({ timeout: 25_000 })
  await expect(page.getByRole('heading', { name: 'Tu mano inicial' })).toBeVisible()
  await page.getByRole('button', { name: 'Conservar las diez' }).click()
  await expect(page.getByText('Turno 1 · Principal')).toBeVisible()
  await page.getByRole('button', { name: /Fuente de Furia\. Esencia — Fuente\./ }).first().click()
  await expect(page.getByText('1 / 1').first()).toBeVisible()
  // Aparece dos veces: el aviso central de eventos y la Crónica de batalla.
  await expect(page.getByText('Fuente de Furia entra en la reserva.').first()).toBeVisible()

  await page.getByRole('button', { name: 'Finalizar turno' }).click()
  // La IA reproduce su turno paso a paso y devuelve el control (turno 3 = jugador).
  await expect(page.getByText('Turno 3 · Principal')).toBeVisible({ timeout: 25_000 })
  expect(consoleErrors).toEqual([])
})
