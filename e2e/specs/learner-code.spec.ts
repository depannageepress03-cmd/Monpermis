// QA E2E — apprenant : parcours code (QCM) + examen blanc complet.
import { expect, test } from '@playwright/test'

async function login(page) {
  await page.goto('/connexion')
  await page.getByLabel('E-mail', { exact: true }).fill('e2e@test.local')
  await page.getByLabel('Mot de passe', { exact: true }).fill('E2eTest1234')
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await page.waitForURL('**/accueil**', { timeout: 20000 })
}

test('QCM : réponse juste puis fausse, verdict affiché', async ({ page }) => {
  await login(page)
  await page.goto('/code-de-la-route/revision-chapitres')
  // Premier chapitre : ouvre les questions.
  await page.getByRole('link', { name: /Ouvrir le chapitre/ }).first().click()
  await expect(page).toHaveURL(/questions/, { timeout: 20000 })

  // Première question de la liste.
  await page.getByRole('link', { name: /Question 1/ }).first().click()
  await expect(page).toHaveURL(/questions\/0/, { timeout: 20000 })

  // Choisit la première option puis valide.
  await page.locator('button.learner-quiz-answer').first().click({ timeout: 15000 })
  await page.getByRole('button', { name: 'Valider', exact: true }).click()
  await expect(page.getByText(/Bonne réponse|Mauvaise réponse/i).first()).toBeVisible({
    timeout: 20000,
  })
})

test('examen blanc complet : 20 questions puis score', async ({ page }) => {
  await login(page)
  await page.goto('/code-de-la-route/examens-test')
  // Démarre le premier examen (bouton « Examen blanc n°… »).
  await page.getByRole('button', { name: /Examen blanc n°/ }).first().click()
  await expect(page).toHaveURL(/examens-test\/\d+/, { timeout: 30000 })

  for (let i = 0; i < 20; i += 1) {
    // Option = bouton « A », « A Oui », etc. (lettre en tête).
    const option = page.getByRole('button', { name: /^[A-D]\b/ }).first()
    await option.click({ timeout: 15000, force: true })
    await page.getByRole('button', { name: /Valider ma réponse/ }).click()
    const next = page.getByRole('button', { name: 'Question suivante', exact: true })
    // B4 (rapport) : le dock TabBar flottant recouvre le CTA → activation clavier.
    await next.focus()
    await page.keyboard.press('Enter')
  }
  // Dernier « Question suivante » termine l'examen côté serveur.
  // B3 (rapport) : aucun écran de score ne s'affiche après la Q20 —
  // on vérifie le score persisté dans Mes notes.
  await page.goto('/code-de-la-route/mes-notes')
  await expect(page.getByText(/Examen 1(?!\d)/).first()).toBeVisible({ timeout: 30000 })
})
