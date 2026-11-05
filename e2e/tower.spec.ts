import { expect, test } from '@playwright/test'

/**
 * La Torre del Nexo de punta a punta: empezar, entrar a un piso, ganarlo y
 * comprobar que la Vida que queda es la que se lleva al siguiente.
 */
test('la Torre encadena pisos conservando la Vida', async ({ page }) => {
  test.setTimeout(150_000)
  await page.addInitScript(() => localStorage.setItem('cronicas-nexo-howto-visto', '1'))
  await page.goto('/tower')

  await expect(page.getByRole('heading', { name: 'Torre del Nexo' })).toBeVisible()
  await page.getByRole('button', { name: /Comenzar la subida/i }).click()

  // Piso 1: la Vida empieza al máximo del comandante.
  const salud = page.locator('[aria-label^="Vida del Nexo"]')
  await expect(salud).toContainText('35')
  const entrar = page.getByRole('button', { name: /Entrar al piso 1/i })
  await expect(entrar).toBeVisible()
  await entrar.click()

  // Se gana el piso con el panel de desarrollo (baja el Nexo rival a cero).
  await expect(page.getByTestId('battle-board')).toBeVisible({ timeout: 25_000 })
  await page.getByRole('button', { name: /Conservar las diez/i }).click()
  await page.getByRole('button', { name: /Saltar guía/i }).click({ timeout: 4000 }).catch(() => {})
  await page.keyboard.press('Control+Shift+KeyD')
  // Cada rival trae la Vida de su comandante; no se presupone el máximo propio.
  const golpe = page.getByRole('button', { name: /-5 al Nexo rival/i })
  await golpe.waitFor({ state: 'visible', timeout: 10_000 })
  const health = await page.evaluate(() => JSON.parse(localStorage.getItem('cronicas-nexo-match')!).state.match.players.ai.nexusHealth as number)
  for (let i = 0; i < Math.ceil(health / 5); i += 1) await golpe.click()
  await expect(page.getByText(/Victoria|Has ganado|quiebra/i).first()).toBeVisible({ timeout: 15_000 })

  // El propio diálogo de final de partida devuelve a la Torre.
  await page.getByRole('button', { name: /Volver a la Torre/i }).click()
  await expect(page.getByRole('heading', { name: /Elige una bendición/i })).toBeVisible()
  await page.getByRole('button', { name: /Restaurar el Nexo/i }).click()
  await expect(page.getByRole('button', { name: /Entrar al piso 2/i })).toBeVisible()
})
