// QA E2E — apprenant : inscription, connexion, session.
import { expect, test } from '@playwright/test'

const PASSWORD = 'E2eTest1234'

test('inscription puis connexion par e-mail', async ({ page }) => {
  const stamp = Date.now()
  const email = `e2e.new.${stamp}@test.local`

  await page.goto('/inscription')
  await page.getByLabel('Prénom', { exact: true }).fill('E2e')
  await page.getByLabel('Nom', { exact: true }).fill('Nouveau')
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Continuer' }).click()

  await page.getByRole('textbox', { name: 'Ton mot de passe', exact: true }).fill(PASSWORD)
  await page.getByRole('textbox', { name: 'Confirme ton mot de passe', exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: "S'inscrire" }).click()

  // Retour à l'accueil d'intro avec le message de vérification.
  await expect(page).toHaveURL(/\/$/, { timeout: 20000 })

  // La vérification bloque le web : on se connecte après validation simulée
  // via l'API (le flux public vérifie l'email avec le token réel).
  await page.goto('/connexion')
  await page.getByLabel('E-mail', { exact: true }).fill(email)
  await page.getByLabel('Mot de passe', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Se connecter' }).click()
  // Compte non vérifié → message de vérification (pas de connexion).
  await expect(page.getByText(/vérifi/i).first()).toBeVisible({ timeout: 20000 })
})

test('connexion compte vérifié → accueil, session persistée', async ({ page }) => {
  await page.goto('/connexion')
  await page.getByLabel('E-mail', { exact: true }).fill('e2e@test.local')
  await page.getByLabel('Mot de passe', { exact: true }).fill('E2eTest1234')
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await page.waitForURL('**/accueil**', { timeout: 20000 })
  await expect(page.getByText('Bonjour,').first()).toBeVisible()

  await page.reload()
  await expect(page).toHaveURL(/accueil/)
  await expect(page.getByText('Bonjour,').first()).toBeVisible()
})

test('mauvais mot de passe → erreur générique', async ({ page }) => {
  await page.goto('/connexion')
  await page.getByLabel('E-mail', { exact: true }).fill('e2e@test.local')
  await page.getByLabel('Mot de passe', { exact: true }).fill('Wrong1234x')
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await expect(page.getByText(/incorrect/i)).toBeVisible({ timeout: 20000 })
})

test('token invalide → redirection connexion', async ({ page }) => {
  await page.goto('/connexion')
  await page.getByLabel('E-mail', { exact: true }).fill('e2e@test.local')
  await page.getByLabel('Mot de passe', { exact: true }).fill('E2eTest1234')
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await page.waitForURL('**/accueil**', { timeout: 20000 })

  await page.evaluate(() => {
    localStorage.setItem('token', 'falsifié')
    sessionStorage.setItem('token', 'falsifié')
  })
  // Une navigation vers une page protégée avec JWT invalide invalide
  // la session et renvoie au login.
  await page.goto('/profil')
  // Redirection en 2 temps possible (garde → '/' puis → '/connexion').
  await expect(page).toHaveURL(/(connexion|\/$)/, { timeout: 20000 })
  await expect(page).toHaveURL(/connexion/, { timeout: 30000 })
  await expect(page.getByRole('heading', { name: /Content de te revoir/i })).toBeVisible()
})
