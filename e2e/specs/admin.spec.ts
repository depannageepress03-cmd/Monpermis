// QA E2E — admin : connexion, dashboard, refus apprenant.
import { expect, test } from '@playwright/test'

const ADMIN_URL = 'http://localhost:5180'

test('admin se connecte et voit le dashboard', async ({ page }) => {
  await page.goto(`${ADMIN_URL}/`)
  await page.getByPlaceholder('0147880143').fill('0199000001')
  await page.getByPlaceholder('••••••••').fill('QaAdmin1234')
  await page.getByRole('button', { name: /Se connecter/i }).click()
  // Dashboard : résumé chargé (apprenants, revenus, etc.).
  await expect(page.getByText(/Apprenants|Revenus|Réservations|Paiements/i).first()).toBeVisible({
    timeout: 30000,
  })
})

test('apprenant refusé sur le back-office', async ({ page }) => {
  await page.goto(`${ADMIN_URL}/`)
  await page.getByPlaceholder('0147880143').fill('0100990001')
  await page.getByPlaceholder('••••••••').fill('E2eTest1234')
  await page.getByRole('button', { name: /Se connecter/i }).click()
  // Pas de dashboard : erreur affichée, toujours sur le login.
  await expect(page.getByText(/incorrect|introuvable|refus|erreur|échou/i).first()).toBeVisible({
    timeout: 20000,
  })
})
