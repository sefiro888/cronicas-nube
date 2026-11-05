import { expect, test } from '@playwright/test'

for (const width of [1920, 1366, 390]) {
  test(`los caminos de Torre guardan ruta, encuentro y reliquias a ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : width === 1366 ? 768 : 1080 })
    await page.addInitScript(() => {
      localStorage.setItem(
        'cronicas-nexo-preferences',
        JSON.stringify({
          state: { muted: true, reducedMotion: true, selectedDeckId: 'furia-caldera' },
          version: 7,
        }),
      )
    })
    let towerUrl = ''
    page.on('response', (response) => {
      if (new URL(response.url()).pathname.endsWith('/src/store/tower.ts'))
        towerUrl = response.url()
    })
    await page.goto('/tower')
    await expect(page.getByRole('heading', { name: 'Torre del Nexo' })).toBeVisible()
    await page.getByRole('button', { name: /Caminos del umbral/ }).click()
    await page.getByRole('button', { name: /Comenzar la subida/ }).click()
    await expect(page.getByRole('button', { name: /Entrar al piso/ })).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Elige tu próximo umbral' })).toBeVisible()
    await page.getByRole('button', { name: /Puerta del centinela/ }).click()
    await expect(page.getByRole('button', { name: /Entrar al piso 1/ })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('button', { name: /Entrar al piso 1/ })).toBeVisible()
    await page.getByRole('heading', { name: 'Tus reliquias' }).scrollIntoViewIfNeeded()
    await page.screenshot({ path: `tools/captures/tower-variants/ruta-${width}.png` })
    await page.evaluate(async (url) => {
      const module = await import(/* @vite-ignore */ url)
      module.useTower.getState().finishFloor(true, 18)
    }, towerUrl)
    await expect(page.getByRole('button', { name: /Escuchar las voces/ })).toBeVisible()
    await page.getByRole('button', { name: /Seguir el rastro/ }).click()
    await page.getByRole('button', { name: /Oleada de Esencia/ }).click()
    await expect(page.getByRole('heading', { name: 'Elige tu próximo umbral' })).toBeVisible()
    const saved = await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('cronicas-nexo-tower')!).state.run as {
          floor: number
          enemyPenalty: number
          relics: string[]
          encounters: unknown[]
        },
    )
    expect(saved.floor).toBe(2)
    expect(saved.enemyPenalty).toBe(9)
    expect(saved.relics).toHaveLength(1)
    expect(saved.encounters).toHaveLength(1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.getByRole('heading', { name: 'Elige tu próximo umbral' }).scrollIntoViewIfNeeded()
    await page.screenshot({ path: `tools/captures/tower-variants/encuentro-${width}.png` })
  })
}

test('la expedición breve prepara cinco pisos y conserva su modalidad al recargar', async ({
  page,
}) => {
  await page.goto('/tower')
  await page.getByRole('button', { name: /Expedición breve/ }).click()
  await page.getByRole('button', { name: /Comenzar la subida/ }).click()
  await expect(
    page.getByRole('list', { name: 'Recorrido de la Torre' }).getByRole('listitem'),
  ).toHaveCount(5)
  await page.reload()
  await expect(
    page.getByRole('list', { name: 'Recorrido de la Torre' }).getByRole('listitem'),
  ).toHaveCount(5)
  await expect(page.getByRole('button', { name: /Entrar al piso 1/ })).toBeVisible()
})

test('las reliquias y el guardián llegan al combate real una sola vez', async ({ page }) => {
  let towerUrl = ''
  let matchUrl = ''
  page.on('response', (response) => {
    const pathname = new URL(response.url()).pathname
    if (pathname.endsWith('/src/store/tower.ts')) towerUrl = response.url()
    if (pathname.endsWith('/src/store/match.ts')) matchUrl = response.url()
  })
  await page.addInitScript(() => {
    localStorage.setItem('cronicas-nexo-howto-visto', '1')
    localStorage.setItem(
      'cronicas-nexo-preferences',
      JSON.stringify({
        state: {
          muted: true,
          reducedMotion: true,
          selectedDeckId: 'furia-caldera',
          graphicsQuality: 'low',
        },
        version: 7,
      }),
    )
  })
  await page.goto('/tower')
  await page.getByRole('button', { name: /Caminos del umbral/ }).click()
  await page.getByRole('button', { name: /Comenzar la subida/ }).click()
  await page.getByRole('button', { name: /Puerta del centinela/ }).click()
  const expectedHealth = await page.evaluate(async (url) => {
    const module = await import(/* @vite-ignore */ url)
    module.useTower.setState({
      run: { ...module.useTower.getState().run, health: 21, relics: ['quill', 'ember'] },
    })
    return module.towerBattleSetup(module.useTower.getState().run).aiNexusHealth as number
  }, towerUrl)
  await page.getByRole('button', { name: /Entrar al piso 1/ }).click()
  await expect(page.getByTestId('battle-board')).toBeVisible({ timeout: 25_000 })
  const read = () =>
    page.evaluate(async (url) => {
      const module = await import(/* @vite-ignore */ url)
      const match = module.useMatchStore.getState().match
      return {
        player: match.players.player.nexusHealth,
        rival: match.players.ai.nexusHealth,
        hand: match.players.player.hand.length,
        sources: match.players.ai.resources.length,
      }
    }, matchUrl)
  expect(await read()).toEqual({ player: 21, rival: expectedHealth, hand: 11, sources: 1 })
  await page.reload()
  await expect(page.getByTestId('battle-board')).toBeVisible({ timeout: 25_000 })
  expect(await read()).toEqual({ player: 21, rival: expectedHealth, hand: 11, sources: 1 })
})
