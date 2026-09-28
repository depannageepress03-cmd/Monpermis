// Captures de la maquette design : desktop 1440 + mobile 390
import { chromium } from 'playwright'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const file = pathToFileURL(resolve('design-preview/apercu-dashboard.html')).href
const browser = await chromium.launch()
for (const [name, w, h] of [['desktop-1440', 1440, 900], ['mobile-390', 390, 844]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } })
  await page.goto(file)
  await page.waitForTimeout(600)
  await page.screenshot({ path: `design-preview/apercu-${name}.png`, fullPage: true })
  await page.close()
  console.log(`OK design-preview/apercu-${name}.png`)
}
await browser.close()
