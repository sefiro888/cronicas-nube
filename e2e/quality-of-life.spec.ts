import { expect, test, type Locator, type Page } from '@playwright/test'

/** La guía puede permanecer abierta para comprobar que no roba los clics. */
const enterBattle = async (page: Page, seed?: number, skipTutorial = true) => {
  await page.goto(seed === undefined ? '/battle' : `/battle?seed=${seed}`)
  await page.getByRole('button', { name: /Entendido, a jugar/i }).click()
  const keep = page.getByRole('button', { name: /Conservar las diez/i })
  await keep.click()
  await expect(keep).toBeHidden()
  // El coach interactivo solo sale la primera vez: si no está, no hay que
  // esperarle los 30 s del test entero — con varios workers en paralelo, esa
  // espera bastaba para agotar el tiempo antes de empezar la prueba.
  if (skipTutorial) await page.getByRole('button', { name: /Saltar guía/i }).click({ timeout: 3000 }).catch(() => {})
}

test('la tecla E finaliza el turno como el botón', async ({ page }) => {
  // Con el aviso de acciones pendientes apagado (el ajuste existe justo para
  // quien juega rápido), la tecla cede el turno a la primera.
  await page.addInitScript(() => {
    localStorage.setItem('cronicas-nexo-preferences', JSON.stringify({
      state: { confirmEndTurn: false }, version: 7,
    }))
  })
  await enterBattle(page)
  const banner = page.getByTestId('battle-turn').locator('strong')
  await expect(banner).toHaveText('Tu turno')
  await page.keyboard.press('e')
  await expect(banner).toHaveText('Turno rival', { timeout: 10_000 })
})

test('la tecla H recoge y muestra la mano como el botón', async ({ page }) => {
  await enterBattle(page)
  const footer = page.locator('footer')
  await expect(footer).not.toHaveAttribute('data-tucked', 'true')
  await page.keyboard.press('h')
  await expect(footer).toHaveAttribute('data-tucked', 'true')
  await page.keyboard.press('h')
  await expect(footer).not.toHaveAttribute('data-tucked', 'true')
})

test('fijar una carta la mueve al principio del abanico', async ({ page }) => {
  test.setTimeout(60_000)
  await enterBattle(page)
  const cards = page.locator('[class*="fanCard"]')
  const count = await cards.count()
  expect(count).toBeGreaterThan(1)
  // Fija la ÚLTIMA carta del abanico: debe pasar a ser la primera. Se compara
  // el nombre de la carta (primera línea), no el icono de la estrella, que
  // cambia de ☆ a ★ al fijarla.
  const cardName = (locator: Locator) => locator.locator('h3, strong').first().innerText()
  const lastName = await cardName(cards.nth(count - 1))
  await cards.nth(count - 1).locator('[class*="favoriteToggle"]').click()
  await expect(cards.nth(0).locator('[class*="favoriteToggle"]')).toHaveAttribute('data-favorite', 'true')
  expect(await cardName(cards.nth(0))).toBe(lastName)
})

test('modo foto muestra el aviso y bloquea el despliegue en el tablero', async ({ page }) => {
  test.setTimeout(60_000)
  // Semilla fija: la prueba necesita una unidad desplegable en la mano inicial
  // y con mano aleatoria fallaba de vez en cuando sin que hubiera nada roto.
  await enterBattle(page, 1311657807, false)
  const lesson = page.getByRole('heading', { name: 'Juega una fuente', exact: true })
  await expect(lesson).toBeVisible()
  await page.keyboard.press('Control+Shift+KeyD')
  const essence = page.getByRole('button', { name: '+1 Esencia' })
  await essence.waitFor({ state: 'visible' })
  for (let i = 0; i < 8; i += 1) await essence.click()

  const toggle = page.getByRole('button', { name: /Modo foto/i })
  await toggle.click()
  await expect(page.getByRole('status').filter({ hasText: 'Modo foto' })).toBeVisible()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await expect(lesson).toBeHidden()

  // Con el modo foto activo, un clic en el tablero no debe desplegar nada.
  const unit = page.locator('[class*="fanCard"]').filter({ hasText: /Unidad/ }).first()
  await unit.click()
  const board = page.getByTestId('battle-board')
  await board.click({ position: { x: 640, y: 380 } })
  await page.waitForTimeout(400)
  await expect(page.getByText(/entra en juego/i)).toHaveCount(0)

  // Al salir, el mismo clic sí despliega la unidad seleccionada.
  await page.getByRole('button', { name: /Salir del modo foto/i }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Modo foto' })).toBeHidden()
  await expect(lesson).toBeVisible()
  await board.click({ position: { x: 640, y: 380 } })
  await expect(page.getByText(/entra en juego/i).first()).toBeVisible({ timeout: 10_000 })
})

test('el cursor de teclado recorre el tablero y lo anuncia por casillas', async ({ page }) => {
  await enterBattle(page)
  const cursor = page.locator('[role="status"][aria-live="polite"]')
  // Apagado hasta la primera flecha: jugando con ratón no molesta.
  await expect(cursor).toHaveText('')
  await page.keyboard.press('ArrowUp')
  await expect(cursor).toHaveText(/^D8,/)
  await page.keyboard.press('ArrowUp')
  await expect(cursor).toHaveText(/^D7,/)
  await page.keyboard.press('ArrowRight')
  await expect(cursor).toHaveText(/^E7,/)
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')
  await expect(cursor).toHaveText(/^C7,/)
  await page.keyboard.press('Escape')
  await expect(cursor).toHaveText('')
})

test('con el teclado se despliega una carta de la mano en su casilla', async ({ page }) => {
  test.setTimeout(120_000)
  // Semilla fija: la mano inicial debe traer sí o sí una unidad desplegable.
  await enterBattle(page, 1311657807)
  // Esencia suficiente para desplegar ya en el primer turno (panel de desarrollo).
  await page.keyboard.press('Control+Shift+KeyD')
  const essence = page.getByRole('button', { name: '+1 Esencia' })
  await essence.waitFor({ state: 'visible' })
  for (let i = 0; i < 8; i += 1) await essence.click()
  await page.keyboard.press('Control+Shift+KeyD')

  const unit = page.locator('[class*="fanCard"]').filter({ hasText: /Unidad/ }).first()
  await expect(unit).toBeVisible()
  await unit.click()

  // El cursor arranca en la fila propia: ahí es donde se despliega.
  const cursor = page.locator('[role="status"][aria-live="polite"]')
  await page.keyboard.press('ArrowUp')
  await expect(cursor).toHaveText(/casilla vacía/)
  await page.keyboard.press('Enter')
  await expect(page.getByText(/entra en juego/i).first()).toBeVisible({ timeout: 10_000 })
})

test('el rival elegido en «Jugar» es contra quien se acaba peleando', async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto('/play')
  await page.selectOption('#rival', 'reidores-sombra')
  await page.getByRole('button', { name: /Entrar al tablero/i }).click()
  await page.getByRole('button', { name: /Entendido, a jugar/i }).click().catch(() => {})
  // El encabezado de la batalla nombra al comandante rival.
  await expect(page.locator('header').first()).toContainText('Malachar', { timeout: 25_000 })
})

test('ceder el turno con acciones sin usar avisa antes de cederlo', async ({ page }) => {
  test.setTimeout(90_000)
  await enterBattle(page, 1311657807)
  const banner = page.getByTestId('battle-turn').locator('strong')
  await expect(banner).toHaveText('Tu turno')
  // En el turno 1 siempre queda al menos la fuente de Esencia por jugar.
  await page.keyboard.press('e')
  await expect(page.getByText(/Antes de ceder el turno/i)).toBeVisible()
  await expect(banner).toHaveText('Tu turno')
  // La segunda pulsación sí cede.
  await page.keyboard.press('e')
  await expect(banner).toHaveText('Turno rival', { timeout: 15_000 })
})
