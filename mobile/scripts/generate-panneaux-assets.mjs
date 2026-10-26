// Copie les images + MP3 des panneaux (server/content/code-panneaux) dans mobile/assets/code-panneaux
// et génère src/data/codeRoute/panneauxAssets.ts (table de require statiques) pour l'usage hors connexion.
// Usage : node scripts/generate-panneaux-assets.mjs
import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const source = resolve(here, '../../server/content/code-panneaux')
const target = resolve(here, '../assets/code-panneaux')
const output = resolve(here, '../src/data/codeRoute/panneauxAssets.ts')

if (!existsSync(source)) {
  console.error(`Source introuvable : ${source}`)
  process.exit(1)
}

function walk(dir) {
  const files = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) files.push(...walk(full))
    else if (/\.(png|mp3)$/i.test(name)) files.push(full)
  }
  return files
}

mkdirSync(target, { recursive: true })
const files = walk(source).sort()
const entries = []
for (const file of files) {
  const rel = relative(source, file).split('\\').join('/')
  const dest = join(target, rel)
  mkdirSync(dirname(dest), { recursive: true })
  cpSync(file, dest)
  entries.push(`  '${rel}': require('../../../assets/code-panneaux/${rel}'),`)
}

writeFileSync(
  output,
  `/** Images et MP3 des panneaux embarqués (hors connexion) — généré par scripts/generate-panneaux-assets.mjs */
export const PANNEAUX_ASSET_MODULES: Record<string, number> = {
${entries.join('\n')}
}

const PREFIX = /^.*\\/content\\/code-panneaux\\//i

/** Module embarqué pour un chemin du catalogue (ex. /content/code-panneaux/a/A1a.png), sinon undefined. */
export function getPanneauAssetModule(path?: string | null): number | undefined {
  const value = String(path || '').trim()
  if (!value) return undefined
  return PANNEAUX_ASSET_MODULES[value.replace(PREFIX, '')]
}
`,
)
console.log(`${entries.length} fichiers copiés → ${target}`)
