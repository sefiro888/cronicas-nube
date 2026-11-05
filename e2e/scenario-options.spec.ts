import { expect, test } from '@playwright/test'

for (const [width, height] of [[1920, 1080], [1366, 768]] as const) {
  test(`Jugar y Ajustes conservan los diecinueve escenarios y la elección automática a ${width} × ${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await page.goto('/settings')
    const settings = page.getByLabel('Escenario de batalla', { exact: true })
    await expect(settings.locator('option')).toHaveCount(20)
    await settings.selectOption('solar-court')
    await page.goto('/play')
    const play = page.getByLabel('Escenario', { exact: true })
    await expect(play).toHaveValue('solar-court')
    await expect(play.locator('option')).toHaveCount(20)
    await play.selectOption('bestiary-ravine')
    await page.goto('/settings')
    await expect(page.getByLabel('Escenario de batalla', { exact: true })).toHaveValue('bestiary-ravine')
    await page.getByLabel('Escenario de batalla', { exact: true }).selectOption('auto')
    await page.reload()
    await expect(page.getByLabel('Escenario de batalla', { exact: true })).toHaveValue('auto')
  })
}
