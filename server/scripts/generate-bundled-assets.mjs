#!/usr/bin/env node
/**
 * Régénère les cartes des fichiers EMBARQUÉS dans l'APK (mobile/src/data/codeRoute/audioAssets.ts et
 * imageAssets.ts) à partir des seules questions SÛRES. Metro n'embarque que les fichiers « require »,
 * donc les audios/images des questions retirées n'alourdissent plus l'application.
 *
 * Quand une question est remise en service (clé de réponses corrigée, image ajoutée…), relancer ce script.
 *
 * Usage: node server/scripts/generate-bundled-assets.mjs
 *        npm run generate:bundled-assets --prefix server
 */
import { existsSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '../..')
const outDir = join(root, 'mobile/src/data/codeRoute')

const mod = await import(pathToFileURL(join(root, 'server/src/data/hardcodedQuestions/index.js')).href)
const { isExamEligible } = await import(pathToFileURL(join(root, 'server/src/services/examEligibility.js')).href)

const banks = [...(mod.HARDCODED_CHAPTER_BANKS || [])].sort((a, b) => a.order - b.order)

const audio = new Map() // chapitre -> [ordres]
const images = new Map() // chapitre -> [indices]
let missing = 0

for (const bank of banks) {
  for (const q of bank.questions || []) {
    if (!isExamEligible(q)) continue
    const ch = q.chapterOrder ?? bank.order
    const audioFile = join(root, `mobile/assets/code-audio/chapitre-${ch}/${q.order}.mp3`)
    if (!existsSync(audioFile)) { missing += 1; continue }
    if (!audio.has(ch)) audio.set(ch, [])
    audio.get(ch).push(q.order)
    for (const url of q.prompt?.imageUrls || []) {
      const m = new RegExp(`chapitre-${ch}/(\\d+)\\.png`, 'i').exec(String(url))
      if (!m) continue
      const idx = Number(m[1])
      if (!existsSync(join(root, `mobile/assets/code-images/chapitre-${ch}/${idx}.png`))) { missing += 1; continue }
      if (!images.has(ch)) images.set(ch, [])
      if (!images.get(ch).includes(idx)) images.get(ch).push(idx)
    }
  }
}

function emit(map, header, name, dir, ext, getter, getterBody, argName) {
  let out = `${header}\nexport const ${name}: Record<number, Record<number, number>> = {\n`
  const chapters = [...map.keys()].sort((a, b) => a - b)
  chapters.forEach((ch, ci) => {
    out += `  ${ch}: {\n`
    const items = [...new Set(map.get(ch))].sort((a, b) => a - b)
    items.forEach((n, i) => {
      out += `    ${n}: require('../../../assets/${dir}/chapitre-${ch}/${n}.${ext}')${i < items.length - 1 ? ',' : ''}\n`
    })
    out += `  }${ci < chapters.length - 1 ? ',' : ''}\n`
  })
  out += `}\n\nexport function ${getter}(chapterOrder: number, ${argName}: number): number | null {\n  return ${name}[chapterOrder]?.[${argName}] ?? null\n}\n`
  return out
}

writeFileSync(
  join(outDir, 'audioAssets.ts'),
  emit(audio, '/** Audios embarqués — lecture hors ligne (questions sûres uniquement ; généré par generate-bundled-assets.mjs). */', 'CODE_AUDIO_MODULES', 'code-audio', 'mp3', 'getCodeAudioModule', '', 'questionOrder'),
)
writeFileSync(
  join(outDir, 'imageAssets.ts'),
  emit(images, '/** Images embarquées — quiz hors ligne. N° image = N° question (questions sûres uniquement ; généré par generate-bundled-assets.mjs). */', 'CODE_IMAGE_MODULES', 'code-images', 'png', 'getCodeImageModule', '', 'imageIndex'),
)

const count = (m) => [...m.values()].reduce((s, a) => s + new Set(a).size, 0)
console.log(`audioAssets: ${count(audio)} audios | imageAssets: ${count(images)} images | fichiers introuvables: ${missing}`)
