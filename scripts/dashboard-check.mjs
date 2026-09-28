// Vérification thème dashboard : scroll horizontal + captures des pages clés.
// Usage: node scripts/dashboard-check.mjs [baseURL]
// Prérequis: serveur Vite learner-web sur localhost:5173.
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'

const BASE = process.argv[2] || 'http://localhost:5173'
mkdirSync('design-preview/dash', { recursive: true })

// Session factice (useAuth lit localStorage 'user' ; l'API est interceptée).
const FAKE_USER = {
  id: 'demo', firstName: 'Zas', lastName: 'Demo', phone: '+2290197000000',
  createdAt: new Date().toISOString(),
}
const ok = (data) => ({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) })

const MOCKS = {
  '/api/auth/me': () => ok(FAKE_USER),
  '/api/access-requests/me': () => ok({
    access: { code: true, conduite_videos: true, conduite_heures: false, aiChat: false },
    user: { soldeHeures: 0 },
    pendingRequest: null,
    requests: [],
  }),
  '/api/access-requests/modules': () => ok({
    modules: [
      { key: 'code', label: 'Accès Code', unit: 'month', price: 5000, currency: 'XOF', active: true },
      { key: 'conduite_videos', label: 'Cours vidéo Conduite', unit: 'flat', price: 0, currency: 'XOF', active: true },
      { key: 'conduite_heures', label: 'Heures moniteur', unit: 'hour', price: 5000, currency: 'XOF', active: true },
    ],
    operators: ['mtn', 'moov', 'celtiis'],
  }),
  '/api/notifications/unread-count': () => ok({ unreadCount: 2 }),
  '/api/notifications': () => ok({ unreadCount: 0, notifications: [] }),
  '/api/reservations/dashboard': () => ok({
    progress: { soldeHeures: 0, heuresEffectuees: 3, heuresObjectif: 20, percent: 15, label: '3/20 h' },
    upcoming: [],
  }),
  '/api/content/revision/progress/journey': () => ok({
    code: { currentStop: null, chaptersDone: 2, chaptersTotal: 12 },
    conduite: { currentStop: null, chaptersDone: 0, chaptersTotal: 8 },
    testScores: {},
  }),
  '/api/content/announcements': () => ok([]),
  '/api/payments/me': () => ok({ payments: [] }),
  '/api/reservations/mine': () => ok({ reservations: [] }),
}

const VIEWPORTS = [
  ['390', 390, 844],
  ['768', 768, 1024],
  ['1440', 1440, 900],
]
const ROUTES = ['/accueil', '/code-de-la-route', '/conduite', '/profil', '/abonnement']

const browser = await chromium.launch()
let pass = 0, fail = 0
const report = []

for (const [vname, w, h] of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } })
  const page = await ctx.newPage()
  await page.addInitScript(([u]) => {
    localStorage.setItem('user', JSON.stringify(u))
    localStorage.setItem('token', 'demo-token-for-ui-check')
  }, [FAKE_USER])
  await page.route(`${BASE}/api/**`, (route) => {
    const url = new URL(route.request().url())
    for (const [key, responder] of Object.entries(MOCKS)) {
      if (url.pathname === key || url.pathname.startsWith(key + '/')) {
        return route.fulfill(responder())
      }
    }
    return route.fulfill(ok({}))
  })

  for (const route of ROUTES) {
    const shot = `design-preview/dash/${route.replace(/\//g, '_') || 'home'}-${vname}.png`
    try {
      await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded', timeout: 15000 })
      await page.waitForTimeout(900)
      const dims = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        cw: document.documentElement.clientWidth,
      }))
      const overflow = dims.sw > dims.cw
      if (overflow) fail++; else pass++
      report.push({ route, viewport: vname, overflow, sw: dims.sw, cw: dims.cw })
      await page.screenshot({ path: shot, fullPage: true })
    } catch (e) {
      fail++
      report.push({ route, viewport: vname, overflow: false, error: String(e).slice(0, 120) })
    }
  }
  await ctx.close()
}
await browser.close()
writeFileSync('design-preview/dash/report.json', JSON.stringify(report, null, 2))
console.log(`OK ${pass} / ${pass + fail}`)
for (const r of report) if (r.overflow || r.error) console.log('PROBLÈME', JSON.stringify(r))
