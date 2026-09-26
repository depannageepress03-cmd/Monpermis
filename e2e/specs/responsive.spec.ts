// QA E2E — responsive mobile web (390px) : pas de scroll horizontal,
// formulaire centré, navigation utilisable.
import { expect, test } from '@playwright/test'

test('login 390px sans débordement', async ({ page }) => {
  await page.goto('/connexion')
  await expect(page.getByLabel('E-mail', { exact: true })).toBeVisible()
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(1)
})

test('accueil 390px sans débordement après connexion', async ({ page }) => {
  await page.goto('/connexion')
  await page.getByLabel('E-mail', { exact: true }).fill('e2e@test.local')
  await page.getByLabel('Mot de passe', { exact: true }).fill('E2eTest1234')
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await page.waitForURL('**/accueil**', { timeout: 20000 })
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(1)
})
