#!/usr/bin/env node
/**
 * Vérifie les banques locales learner vs la source de vérité serveur.
 * L’apprenant lit l’API en priorité ; ce script garde le fallback hors-ligne cohérent.
 *
 * Usage: node server/scripts/check-learner-banks-sync.mjs
 */
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '../..')

async function loadServerCounts() {
  const mod = await import(
    pathToFileURL(join(root, 'server/src/data/hardcodedQuestions/index.js')).href
  )
  /** @type {Record<number, number>} */
  const counts = {}
  for (const bank of mod.HARDCODED_CHAPTER_BANKS || []) {
    const order = Number(bank.order)
    const n = Array.isArray(bank.questions) ? bank.questions.length : 0
    if (order) counts[order] = n
  }
  return counts
}

function countLocalBankFile(relPath) {
  const text = readFileSync(join(root, relPath), 'utf8')
  /** @type {Record<number, number>} */
  const counts = {}
  const re = /question\(\s*(\d+)\s*,/g
  let match
  while ((match = re.exec(text))) {
    const order = Number(match[1])
    counts[order] = (counts[order] || 0) + 1
  }
  return counts
}

function compare(label, server, local) {
  const orders = [...new Set([...Object.keys(server), ...Object.keys(local)].map(Number))].sort(
    (a, b) => a - b,
  )
  const drifts = []
  for (const order of orders) {
    const s = server[order]
    const l = local[order]
    if (s == null && l != null) {
      drifts.push(`ch${order}: local=${l}, serveur=absent`)
      continue
    }
    if (s != null && l == null) {
      drifts.push(`ch${order}: serveur=${s}, local=absent — lance generate:learner-banks`)
      continue
    }
    if (s !== l) drifts.push(`ch${order}: serveur=${s}, local=${l}`)
  }
  if (drifts.length) {
    console.error(`\n✗ ${label} — écarts vs serveur:`)
    for (const line of drifts) console.error(`  - ${line}`)
    return false
  }
  console.log(`✓ ${label} — aligné sur le serveur`)
  return true
}

const serverCounts = await loadServerCounts()
console.log('Serveur (hardcodedQuestions):', serverCounts)

const web = countLocalBankFile('src/data/codeRoute/banks.ts')
const mobile = countLocalBankFile('mobile/src/data/codeRoute/banks.ts')
console.log('Web banks.ts:', web)
console.log('Mobile banks.ts:', mobile)

const okWeb = compare('web banks.ts', serverCounts, web)
const okMobile = compare('mobile banks.ts', serverCounts, mobile)

if (!okWeb || !okMobile) {
  console.error(
    '\nLes banques locales divergent du serveur.\n' +
      'Corrige avec: npm run generate:learner-banks --prefix server\n' +
      'Puis: npm run check:banks-sync --prefix server',
  )
  process.exit(1)
}

console.log('\nOK — sync learner fallback vs admin/serveur.')
