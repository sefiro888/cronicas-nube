import { expect, test } from '@playwright/test'
test('el texto de las cartas cabe en los chasis de facción', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto('/gallery')
  const framed = page.locator('article[data-frame]')
  await expect(framed.first()).toBeVisible()
  const overflow = await framed.evaluateAll((articles) => articles.flatMap((card) => {
    const name = card.querySelector('h3')!
    const rules = card.querySelector('p')!
    const text = document.createRange()
    text.selectNodeContents(name)
    const titleBounds = name.parentElement!.getBoundingClientRect()
    const nameBounds = text.getBoundingClientRect()
    text.selectNodeContents(rules)
    const rulesBounds = text.getBoundingClientRect()
    const paperBounds = rules.parentElement!.getBoundingClientRect()
    const failures = []
    if (nameBounds.bottom > titleBounds.bottom + 1 || nameBounds.top < titleBounds.top - 1) failures.push('título')
    if (rulesBounds.bottom > paperBounds.bottom + 1 || rulesBounds.right > paperBounds.right + 1) failures.push('reglas')
    return failures.map((reason) => ({ card: card.getAttribute('data-card-id'), reason }))
  }))
  expect(overflow).toEqual([])
})
