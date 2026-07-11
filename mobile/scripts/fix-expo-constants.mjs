import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Expo sometimes nests a broken expo-constants (package.json sans build/).
 * Metro then fails to resolve build/Constants.js.
 * On every install/start, replace the nested copy with the hoisted package.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'node_modules', 'expo-constants')
const target = join(root, 'node_modules', 'expo', 'node_modules', 'expo-constants')
const constantsFile = join(source, 'build', 'Constants.js')

if (!existsSync(constantsFile)) {
  console.error('expo-constants is missing build/Constants.js — run: npx expo install expo-constants')
  process.exit(1)
}

rmSync(target, { recursive: true, force: true })
mkdirSync(dirname(target), { recursive: true })
cpSync(source, target, { recursive: true, force: true })

if (!existsSync(join(target, 'build', 'Constants.js'))) {
  console.error('Failed to copy expo-constants into expo/node_modules')
  process.exit(1)
}

console.log('expo-constants linked for Expo')
