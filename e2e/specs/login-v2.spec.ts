import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { expect, test } from '@playwright/test'

const VIEWPORTS = [
  [320, 568],
  [360, 640],
  [390, 844],
  [430, 932],
  [768, 1024],
  [820, 1180],
  [1024, 768],
  [1180, 820],
  [1280, 720],
  [1366, 768],
  [1440, 900],
  [1920, 1080],
  [2560, 1440],
] as const

test('connexion reste lisible et sans collision aux tailles de référence', async ({ page }) => {
  const screenshots = path.resolve('e2e/artifacts/login-v2')
  await mkdir(screenshots, { recursive: true })

  for (const [width, height] of VIEWPORTS) {
    await page.setViewportSize({ width, height })
    await page.goto('/connexion')
    await expect(page.locator('form')).toBeVisible()
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(750)

    if ([390, 1024, 1440].includes(width)) {
      await page.screenshot({
        path: path.join(screenshots, `login-${width}x${height}.png`),
        fullPage: false,
      })
    }

    for (const state of ['empty', 'half', 'ready'] as const) {
      if (state !== 'empty') {
        await page.locator('#login-identifier').fill('test@example.bj')
      } else {
        await page.locator('#login-identifier').fill('')
      }
      await page.locator('#login-password').fill(state === 'ready' ? 'TestPass123' : '')
      await page.locator('#login-password').blur()
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.waitForTimeout(700)

      const geometry = await page.evaluate(() => {
        const car = document.querySelector('[data-car]')?.getBoundingClientRect()
        const formElement = document.querySelector('form')
        const form = formElement?.getBoundingClientRect()
        if (!car || !form || !formElement) throw new Error('Login scene geometry is missing')

        const horizontalGap = Math.max(form.left - car.right, car.left - form.right, 0)
        const verticalGap = Math.max(form.top - car.bottom, car.top - form.bottom, 0)
        const hint = document.querySelector('.login-hint')
        const hintStyle = hint ? getComputedStyle(hint) : null
        return {
          phase: formElement.dataset.phase,
          gap: Math.hypot(horizontalGap, verticalGap),
          hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
          hintVisible: hintStyle?.visibility === 'visible',
        }
      })

      expect(geometry.phase, `${width}x${height} ${state} phase`).toBe(state)
      expect(geometry.gap, `${width}x${height} ${state} car/card gap`).toBeGreaterThanOrEqual(12)
      expect(geometry.hasHorizontalOverflow, `${width}x${height} ${state} overflow`).toBe(false)
      if (geometry.hintVisible) {
        await expect(page.locator('.login-hint')).toBeInViewport()
      }
    }
  }
})

test('la saisie clavier soumet le formulaire et affiche explicitement l’erreur API', async ({ page }) => {
  let loginPayload: { identifier?: string; password?: string } | undefined
  await page.route('**/api/auth/login', async (route) => {
    loginPayload = route.request().postDataJSON() as { identifier?: string; password?: string }
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, error: 'Identifiant ou mot de passe incorrect.' }),
    })
  })

  await page.goto('/connexion')
  await page.locator('#login-identifier').fill('test@example.bj')
  await page.locator('#login-password').fill('TestPass123')
  await page.locator('#login-password').press('Enter')

  await expect(page.getByRole('alert')).toContainText('Identifiant ou mot de passe incorrect.')
  expect(loginPayload).toEqual({ identifier: 'test@example.bj', password: 'TestPass123' })
  await expect(page.locator('.login-traffic-light__bulb--red')).toHaveClass(/is-lit/)
})

test('une authentification réussie navigue en moins d’une seconde', async ({ page }) => {
  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          token: 'login-v2-test-token',
          user: {
            id: 'login-v2-test',
            firstName: 'Test',
            lastName: 'Login',
            email: 'test@example.bj',
            phone: '0199888777',
            createdAt: '2025-01-01T00:00:00.000Z',
          },
        },
      }),
    })
  })

  await page.goto('/connexion')
  await page.locator('#login-identifier').fill('test@example.bj')
  await page.locator('#login-password').fill('TestPass123')
  const submit = page.getByRole('button', { name: 'Se connecter' })
  await submit.evaluate((button) => {
    button.addEventListener('click', () => {
      const startedAt = performance.now()
      const timer = window.setInterval(() => {
        if (window.location.pathname === '/accueil') {
          document.documentElement.dataset.loginNavigationMs = String(performance.now() - startedAt)
          window.clearInterval(timer)
        }
      }, 5)
    }, { once: true })
  })
  await submit.click()
  await page.waitForURL('**/accueil**', { timeout: 1000 })
  const navigationDuration = Number(await page.locator('html').getAttribute('data-login-navigation-ms'))
  expect(navigationDuration).toBeLessThan(1000)
})

test('les animations sont désactivées quand le mouvement réduit est demandé', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/connexion')
  await expect(page.locator('[data-car]')).toHaveCSS('transition-property', 'none')
})

test('le choix téléphone met à jour le champ et le type de saisie', async ({ page }) => {
  await page.goto('/connexion')
  await page.getByRole('radio', { name: 'Téléphone' }).click()

  const phone = page.getByRole('textbox', { name: 'Numéro de téléphone' })
  await expect(phone).toHaveAttribute('type', 'tel')
  await expect(phone).toHaveAttribute('autocomplete', 'tel-national')
  await expect(page.getByText('+229')).toBeVisible()
})
