import { chromium } from 'playwright'

const BASE = 'http://localhost:5173'
const FAKE_USER = {
  id: 'demo', firstName: 'Zas', lastName: 'Demo', phone: '+2290197000000',
  createdAt: new Date().toISOString(),
}
const ok = (data) => ({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) })

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()
await page.addInitScript(([u]) => {
  localStorage.setItem('user', JSON.stringify(u))
  localStorage.setItem('token', 'demo-token-for-ui-check')
}, [FAKE_USER])
await page.route(`${BASE}/api/**`, (route) => {
  const url = new URL(route.request().url())
  const mocks = {
    '/api/access-requests/me': { access: { code: true, conduite_videos: true, conduite_heures: false, aiChat: false }, user: { soldeHeures: 0 }, pendingRequest: null, requests: [] },
    '/api/access-requests/modules': { modules: [{ key: 'code', label: 'Accès Code', unit: 'month', price: 5000, currency: 'XOF', active: true }], operators: ['mtn'] },
    '/api/notifications/unread-count': { unreadCount: 0 },
  }
  for (const [key, data] of Object.entries(mocks)) {
    if (url.pathname === key || url.pathname.startsWith(key + '/')) return route.fulfill(ok(data))
  }
  return route.fulfill(ok({}))
})
await page.goto(`${BASE}/abonnement`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1200)
const probe = await page.evaluate(() => {
  const field = document.querySelector('.promo-code-field')
  if (!field) return 'pas de .promo-code-field'
  const input = field.querySelector('input')
  const f = getComputedStyle(field)
  const i = getComputedStyle(input)
  const fr = field.getBoundingClientRect()
  const ir = input.getBoundingClientRect()
  return {
    field: { display: f.display, flexDirection: f.flexDirection, width: fr.width },
    input: { flex: i.flex, width: ir.width, minWidth: i.minWidth },
    matchesColumn: field.matches('.promo-code-field'),
  }
})
console.log(JSON.stringify(probe, null, 2))
await browser.close()
