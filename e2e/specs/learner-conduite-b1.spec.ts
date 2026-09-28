// QA E2E — conduite : B1 (rapport). /conduite/reservation affiche des
// moniteurs/jours/créneaux mockés au lieu de l'API. Ce test échoue
// tant que B1 n'est pas corrigé (preuve : screenshot + trace).
import { expect, test } from '@playwright/test'

test('réservation affiche les vrais moniteurs', async ({ page }) => {
  await page.goto('/connexion')
  await page.getByLabel('E-mail', { exact: true }).fill('e2e@test.local')
  await page.getByLabel('Mot de passe', { exact: true }).fill('E2eTest1234')
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await page.waitForURL('**/accueil**', { timeout: 20000 })

  // Dashboard conduite : solde réel affiché.
  await page.goto('/conduite')
  await expect(page.getByText(/Solde d'heures/)).toBeVisible({ timeout: 20000 })

  // Id du vrai moniteur via l'API, puis ouverture directe du flow.
  const token = await page.evaluate(
    () => localStorage.getItem('token') || sessionStorage.getItem('token'),
  )
  const list = await page.request.get('/api/reservations/moniteurs', {
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = await list.json()
  const realId = body.data.moniteurs[0]?.id
  expect(realId).toBeTruthy()
  await page.goto(`/conduite/reservation?moniteurId=${realId}`)

  // Doit lister le vrai moniteur seedé, pas les mocks.
  await expect(page.getByRole('button', { name: /E2e Moniteur/ })).toBeVisible({ timeout: 20000 })
})
