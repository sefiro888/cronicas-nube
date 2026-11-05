import { expect, test } from '@playwright/test'

for (const viewport of [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 390, height: 844 },
]) {
  test(`el sobre conserva sus cartas y se revela sin desbordar a ${viewport.width}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport)
    await page.addInitScript(() => {
      localStorage.setItem(
        'cronicas-nexo-coleccion',
        JSON.stringify({ state: { packs: 2, opened: 0, owned: {} }, version: 1 }),
      )
      localStorage.setItem(
        'cronicas-nexo-preferences',
        JSON.stringify({ state: { muted: true, reducedMotion: true }, version: 7 }),
      )
    })
    await page.goto('/album')
    await page.getByRole('heading', { name: 'Álbum del Nexo' }).waitFor()
    await page.screenshot({
      path: `tools/captures/album/album-${viewport.width}.png`,
      fullPage: false,
    })
    await page.getByRole('button', { name: 'Abrir sobre', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Un fragmento de otros mundos' })
    await expect(dialog).toBeVisible()
    await page.screenshot({ path: `tools/captures/album/sobre-${viewport.width}.png` })
    await page.getByRole('button', { name: 'Rasgar el sobre' }).dblclick()
    await expect(page.getByRole('button', { name: /Carta 1 boca abajo/ })).toBeVisible()
    const stored = () =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem('cronicas-nexo-coleccion')!).state as {
            packs: number
            opened: number
            owned: Record<string, { count: number }>
          },
      )
    expect((await stored()).packs).toBe(1)
    expect((await stored()).opened).toBe(1)
    await page.getByRole('button', { name: 'Carta 1 boca abajo' }).click()
    await page.getByRole('button', { name: 'Voltear todas' }).click()
    await expect(page.getByRole('status')).toContainText('5 cartas guardadas')
    await expect(page.getByRole('button', { name: 'Al álbum', exact: true })).toBeVisible()
    const state = await stored()
    expect(Object.values(state.owned).reduce((sum, entry) => sum + entry.count, 0)).toBe(5)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.getByRole('dialog').evaluate((element) => { element.scrollTop = 0 })
    await page.screenshot({
      path: `tools/captures/album/cartas-${viewport.width}.png`,
      fullPage: false,
    })
    await page
      .getByRole('button', { name: /^Examinar / })
      .first()
      .click()
    await expect(page.getByRole('button', { name: 'Cerrar inspección' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: /^Examinar / }).first()).toBeFocused()
    await page.getByRole('button', { name: 'Al álbum', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Abrir sobre', exact: true })).toBeFocused()
    await page.getByRole('button', { name: 'Abrir sobre', exact: true }).click()
    await page.getByRole('button', { name: 'Rasgar el sobre' }).click()
    await expect(page.getByRole('button', { name: 'Carta 1 boca abajo' })).toBeVisible()
    await page.keyboard.press('Escape')
    expect((await stored()).opened).toBe(2)
    expect((await stored()).packs).toBe(0)
    expect(Object.values((await stored()).owned).reduce((sum, entry) => sum + entry.count, 0)).toBe(
      10,
    )
  })
}

test('el teclado queda en la apertura y el cierre cancela la revelación pendiente', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'cronicas-nexo-coleccion',
      JSON.stringify({ state: { packs: 1, opened: 0, owned: {} }, version: 1 }),
    )
    localStorage.setItem(
      'cronicas-nexo-preferences',
      JSON.stringify({ state: { muted: true }, version: 7 }),
    )
  })
  await page.goto('/album')
  await page.getByRole('button', { name: 'Abrir sobre', exact: true }).click()
  await page.keyboard.press('Shift+Tab')
  await expect(page.getByRole('button', { name: 'Rasgar el sobre' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Cerrar', exact: true })).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.waitForTimeout(1300)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Álbum del Nexo' })).toBeVisible()
})

test('el álbum cambia de página y permite ver solo la colección propia', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'cronicas-nexo-coleccion',
      JSON.stringify({ state: { packs: 0, opened: 0, owned: {} }, version: 1 }),
    )
  })
  await page.goto('/album')
  const navigation = page.getByRole('navigation', { name: 'Páginas del álbum' })
  await expect(navigation).toContainText(/1 \/ \d+/)
  await navigation.getByRole('button', { name: 'Siguiente →' }).click()
  await expect(navigation).toContainText(/2 \/ \d+/)
  await page.getByRole('checkbox', { name: 'Solo mis cartas' }).check()
  await expect(navigation).toContainText('1 / 1')
  await expect(page.getByText('Aquí comenzará tu historia.', { exact: false })).toBeVisible()
  await page.getByRole('checkbox', { name: 'Solo mis cartas' }).uncheck()
  await expect(navigation).toContainText(/1 \/ \d+/)
})

