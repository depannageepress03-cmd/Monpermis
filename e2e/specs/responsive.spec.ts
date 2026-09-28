// QA E2E — responsive mobile web (390px) : pas de scroll horizontal,
// formulaire centré, navigation utilisable.
import { expect, test } from '@playwright/test'

const ADMIN_URL = 'http://localhost:5180'

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

test('navigation apprenant adaptée aux breakpoints', async ({ page }) => {
  await page.goto('/connexion')
  await page.getByLabel('E-mail', { exact: true }).fill('e2e@test.local')
  await page.getByLabel('Mot de passe', { exact: true }).fill('E2eTest1234')
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await page.waitForURL('**/accueil**', { timeout: 20000 })
  await page.goto('/code-de-la-route')

  const viewports = [
    [320, 568], [360, 640], [375, 812], [390, 844], [414, 896],
    [480, 800], [600, 900], [640, 960], [720, 960], [767, 1024],
    [768, 1024], [820, 1180], [900, 1200], [960, 1280], [1024, 768],
    [1199, 900], [1200, 900], [1280, 800], [1440, 900], [1920, 1080],
    [2560, 1440],
  ] as const

  for (const [width, height] of viewports) {
    await page.setViewportSize({ width, height })
    const layout = await page.evaluate(() => {
      const nav = document.querySelector('.mp-header .mp-nav')
      const content = document.querySelector('.mp-content')
      if (!(nav instanceof HTMLElement) || !(content instanceof HTMLElement)) {
        throw new Error('App shell navigation or content is missing')
      }

      const navRect = nav.getBoundingClientRect()
      const contentRect = content.getBoundingClientRect()
      return {
        viewportWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        navPosition: getComputedStyle(nav).position,
        navDirection: getComputedStyle(nav).flexDirection,
        navLeft: navRect.left,
        navRight: navRect.right,
        navBottom: navRect.bottom,
        contentLeft: contentRect.left,
        targets: [...nav.querySelectorAll('button')].map((button) => {
          const rect = button.getBoundingClientRect()
          return { width: rect.width, height: rect.height }
        }),
      }
    })

    expect(layout.scrollWidth - layout.viewportWidth, `${width}px horizontal overflow`).toBeLessThanOrEqual(1)
    expect(layout.navLeft, `${width}px nav starts in viewport`).toBeGreaterThanOrEqual(0)
    expect(layout.navRight, `${width}px nav ends in viewport`).toBeLessThanOrEqual(width)
    expect(layout.targets, `${width}px navigation targets`).toHaveLength(5)
    for (const target of layout.targets) {
      expect(target.width, `${width}px target width`).toBeGreaterThanOrEqual(44)
      expect(target.height, `${width}px target height`).toBeGreaterThanOrEqual(44)
    }

    if (width < 768) {
      expect(layout.navPosition, `${width}px mobile navigation`).toBe('fixed')
      expect(layout.navBottom, `${width}px bottom navigation`).toBeLessThanOrEqual(height)
    } else {
      expect(layout.navPosition, `${width}px side navigation`).toBe('static')
      expect(layout.navDirection, `${width}px vertical navigation`).toBe('column')
      expect(layout.contentLeft, `${width}px content clears side rail`).toBeGreaterThanOrEqual(80)
    }
  }

  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Accueil', exact: true }).click()
  await page.waitForURL('**/accueil**')
  await expect(page.locator('.home-dashboard-greeting')).toBeVisible()
  await page.getByRole('button', { name: 'Code', exact: true }).click()
  await page.waitForURL('**/code-de-la-route**')
})

test('navigation admin adaptée aux breakpoints', async ({ page }) => {
  await page.goto(ADMIN_URL)
  await page.getByPlaceholder('0147880143').fill('0199000001')
  await page.getByPlaceholder('••••••••').fill('QaAdmin1234')
  await page.getByRole('button', { name: /Se connecter/i }).click()
  await page.waitForURL('**/cockpit**')

  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('.admin-app')).toHaveClass(/is-mobile/)
  await page.getByRole('button', { name: 'Ouvrir le menu' }).click()
  await expect(page.locator('.admin-sidebar')).not.toHaveClass(/is-closed/)
  await page.getByRole('button', { name: 'Fermer le menu' }).click()

  const viewports = [
    [320, 568], [390, 844], [767, 1024], [768, 1024],
    [1024, 768], [1199, 900], [1200, 900], [1440, 900], [1920, 1080],
  ] as const

  for (const [width, height] of viewports) {
    await page.setViewportSize({ width, height })
    await page.waitForTimeout(220)
    const layout = await page.evaluate(() => {
      const app = document.querySelector('.admin-app')
      const sidebar = document.querySelector('.admin-sidebar')
      if (!(app instanceof HTMLElement) || !(sidebar instanceof HTMLElement)) {
        throw new Error('Admin shell or sidebar is missing')
      }
      const rect = sidebar.getBoundingClientRect()
      return {
        viewportWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        classes: app.className,
        sidebarWidth: rect.width,
        sidebarPosition: getComputedStyle(sidebar).position,
      }
    })

    expect(layout.scrollWidth - layout.viewportWidth, `${width}px horizontal overflow`).toBeLessThanOrEqual(1)
    if (width < 768) {
      expect(layout.classes, `${width}px mobile drawer`).toMatch(/is-mobile/)
      expect(layout.sidebarPosition).toBe('fixed')
    } else if (width < 1200) {
      expect(layout.classes, `${width}px tablet rail`).toMatch(/is-tablet/)
      expect(layout.sidebarWidth).toBe(80)
    } else {
      expect(layout.classes, `${width}px desktop sidebar`).not.toMatch(/is-mobile|is-tablet/)
      expect(layout.sidebarWidth).toBe(270)
    }
  }
})

test('portail moniteur adapté aux breakpoints', async ({ page }) => {
  const monitorUrl = 'http://localhost:5176'
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${monitorUrl}/connexion`)
  await expect(page.getByLabel('Email')).toBeVisible()

  const loginLayout = await page.evaluate(() => {
    const email = document.querySelector('#email')
    if (!(email instanceof HTMLInputElement)) throw new Error('Monitor email field is missing')
    return {
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      inputFontSize: getComputedStyle(email).fontSize,
    }
  })
  expect(loginLayout.scrollWidth - loginLayout.viewportWidth).toBeLessThanOrEqual(1)
  expect(loginLayout.inputFontSize).toBe('16px')

  await page.getByLabel('Email').fill('0199888777@test.local')
  await page.getByLabel('Mot de passe').fill('QaTest1234')
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await page.waitForURL(`${monitorUrl}/`)

  await page.getByRole('button', { name: 'Ouvrir le menu' }).click()
  await expect(page.locator('.admin-shell')).toHaveClass(/nav-open/)
  await page.locator('.admin-nav-close').click()
  await expect(page.locator('.admin-shell')).not.toHaveClass(/nav-open/)

  const viewports = [
    [320, 568], [390, 844], [767, 1024], [768, 1024],
    [1024, 768], [1199, 900], [1200, 900], [1440, 900], [1920, 1080],
  ] as const

  for (const [width, height] of viewports) {
    await page.setViewportSize({ width, height })
    await page.waitForTimeout(220)
    const layout = await page.evaluate(() => {
      const sidebar = document.querySelector('.admin-sidebar')
      const main = document.querySelector('.admin-main')
      const menu = document.querySelector('.admin-topbar .btn-icon')
      if (!(sidebar instanceof HTMLElement) || !(main instanceof HTMLElement) || !(menu instanceof HTMLElement)) {
        throw new Error('Monitor shell, sidebar, or menu is missing')
      }
      return {
        viewportWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        sidebarWidth: sidebar.getBoundingClientRect().width,
        mainLeft: main.getBoundingClientRect().left,
        sidebarTransform: getComputedStyle(sidebar).transform,
        menuDisplay: getComputedStyle(menu).display,
      }
    })

    expect(layout.scrollWidth - layout.viewportWidth, `${width}px horizontal overflow`).toBeLessThanOrEqual(1)
    if (width < 768) {
      expect(layout.mainLeft, `${width}px mobile content`).toBe(0)
      expect(layout.menuDisplay, `${width}px drawer control`).not.toBe('none')
      expect(layout.sidebarTransform, `${width}px closed drawer`).not.toBe('none')
    } else if (width < 1200) {
      expect(layout.sidebarWidth, `${width}px tablet rail`).toBe(80)
      expect(layout.mainLeft, `${width}px content clears rail`).toBe(80)
      expect(layout.menuDisplay, `${width}px no drawer control`).toBe('none')
    } else {
      expect(layout.sidebarWidth, `${width}px desktop sidebar`).toBe(270)
      expect(layout.mainLeft, `${width}px content clears sidebar`).toBe(270)
      expect(layout.menuDisplay, `${width}px no drawer control`).toBe('none')
    }
  }
})
