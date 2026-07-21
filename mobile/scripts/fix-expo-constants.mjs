import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * npm peut installer des copies imbriquées de expo-constants sans build/.
 * Metro échoue alors sur build/Constants.js. On recopie le paquet hoisted partout.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'node_modules', 'expo-constants')
const constantsFile = join(source, 'build', 'Constants.js')

if (!existsSync(constantsFile)) {
  console.error('expo-constants manquant — exécutez : npx expo install expo-constants')
  process.exit(1)
}

function findNestedExpoConstants(nodeModulesDir, results = []) {
  if (!existsSync(nodeModulesDir)) return results

  for (const name of readdirSync(nodeModulesDir)) {
    if (name.startsWith('.')) continue
    const full = join(nodeModulesDir, name)
    let stat
    try {
      stat = statSync(full)
    } catch {
      continue
    }
    if (!stat.isDirectory()) continue

    if (name === 'expo-constants' && full !== source) {
      results.push(full)
    }

    if (name === 'node_modules' || name.startsWith('@') || !name.startsWith('.')) {
      const nested = join(full, 'node_modules')
      if (existsSync(nested)) {
        findNestedExpoConstants(nested, results)
      }
    }
  }

  return results
}

const targets = findNestedExpoConstants(join(root, 'node_modules'))
let fixed = 0

for (const target of targets) {
  const targetConstants = join(target, 'build', 'Constants.js')
  if (existsSync(targetConstants)) continue

  rmSync(target, { recursive: true, force: true })
  mkdirSync(dirname(target), { recursive: true })
  cpSync(source, target, { recursive: true, force: true })

  if (!existsSync(join(target, 'build', 'Constants.js'))) {
    console.error(`Échec copie expo-constants vers ${target}`)
    process.exit(1)
  }
  fixed += 1
}

if (fixed > 0) {
  console.log(`expo-constants réparé (${fixed} copie${fixed > 1 ? 's' : ''} imbriquée${fixed > 1 ? 's' : ''})`)
} else {
  console.log('expo-constants OK')
}
