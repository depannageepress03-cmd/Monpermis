/**
 * Applique la partie 2 du chapitre 1 : textes TTS, banque serveur/mobile/web, maps audio/images.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PART2 } from './ch1-part2-data.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SERVER = path.resolve(__dirname, '..')
const REPO = path.resolve(SERVER, '..')

function writeTexts() {
  const dir = path.join(SERVER, 'content', 'code-audio', 'chapitre-1', 'texts')
  fs.mkdirSync(dir, { recursive: true })
  for (const q of PART2) {
    fs.writeFileSync(path.join(dir, `${q.order}.txt`), `${q.text}\n`, 'utf8')
  }
  console.log(`Texts: ${PART2.length} files in ${dir}`)
}

function updateServerBank() {
  const file = path.join(SERVER, 'src', 'data', 'hardcodedQuestions', 'chapitre01.js')
  let src = fs.readFileSync(file, 'utf8')
  const imgSet = new Set([3, 4, 6, 14, 15, 16, 18, 19, 20, 22, 33, 36])
  for (const q of PART2) {
    if (q.image) imgSet.add(q.order)
  }
  const imgList = [...imgSet].sort((a, b) => a - b).join(', ')
  src = src.replace(
    /const QUESTIONS_WITH_IMAGES = new Set\(\[[^\]]*\]\)/,
    `const QUESTIONS_WITH_IMAGES = new Set([${imgList}])`,
  )
  src = src.replace(
    /\* Banque questions en dur — Chapitre 1 \(signalisation\) — partie 1\.\n \* Audio : \/content\/code-audio\/chapitre-1\/\{n\}\.mp3\n \* Images : \/content\/code-images\/chapitre-1\/\{n\}\.png\n \* Suite à venir — 2026-07-30\./,
    `* Banque questions en dur — Chapitre 1 (signalisation) — parties 1+2.\n * Audio : /content/code-audio/chapitre-1/{n}.mp3\n * Images : /content/code-images/chapitre-1/{n}.png\n * Mis à jour — 2026-07-31.`,
  )
  const extra = PART2.map(
    (q) =>
      `  question(${q.order}, [${q.letters.map((l) => `'${l}'`).join(', ')}], [${q.correct.map((l) => `'${l}'`).join(', ')}]),`,
  ).join('\n')
  if (!src.includes('question(43,')) {
    src = src.replace(
      /  question\(42, \['A', 'B', 'C', 'D'\], \['A'\]\),\n\]/,
      `  question(42, ['A', 'B', 'C', 'D'], ['A']),\n${extra}\n]`,
    )
  }
  src = src.replace(
    /\* 42 questions — 1re partie \(doublons OCR retirés\)\.\n \* Images :[^*]+\*\//,
    `* ${42 + PART2.length} questions — parties 1+2 (doublons OCR retirés).\n * Images panneaux sur les questions concernées.\n */`,
  )
  fs.writeFileSync(file, src)
  console.log('Updated server chapitre01.js')
}

function patchLocalBanks(filePath) {
  let src = fs.readFileSync(filePath, 'utf8')
  const lines = PART2.map((q) => {
    const imgs = q.image ? `, [${q.order}]` : ''
    return `  question(1, ${q.order}, [${q.letters.map((l) => `'${l}'`).join(', ')}], [${q.correct.map((l) => `'${l}'`).join(', ')}]${imgs}),`
  }).join('\n')
  if (!src.includes('question(1, 43,')) {
    src = src.replace(
      /  question\(1, 42, \['A', 'B', 'C', 'D'\], \['A'\]\),\n\]/,
      `  question(1, 42, ['A', 'B', 'C', 'D'], ['A']),\n${lines}\n]`,
    )
  }
  fs.writeFileSync(filePath, src)
  console.log(`Updated ${path.relative(REPO, filePath)}`)
}

function rebuildAudioAssets() {
  const audioDir = path.join(REPO, 'mobile', 'assets', 'code-audio', 'chapitre-1')
  // maps will be rebuilt after TTS; for now only ensure structure for existing + placeholders skipped
  const mobileMap = path.join(REPO, 'mobile', 'src', 'data', 'codeRoute', 'audioAssets.ts')
  const webMap = path.join(REPO, 'src', 'data', 'codeRoute', 'audioUrls.ts')
  return { mobileMap, webMap, audioDir }
}

function rebuildImageAssets() {
  const mobile = path.join(REPO, 'mobile', 'src', 'data', 'codeRoute', 'imageAssets.ts')
  const web = path.join(REPO, 'src', 'data', 'codeRoute', 'imageUrls.ts')
  const imgDir = path.join(REPO, 'mobile', 'assets', 'code-images', 'chapitre-1')
  const files = fs
    .readdirSync(imgDir)
    .filter((f) => f.endsWith('.png'))
    .map((f) => Number(f.replace('.png', '')))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b)

  // mobile imageAssets
  let m = fs.readFileSync(mobile, 'utf8')
  const mobileEntries = files
    .map((n) => `    ${n}: require('../../../assets/code-images/chapitre-1/${n}.png'),`)
    .join('\n')
  m = m.replace(
    /  1: \{\n(?:    \d+: require\([^\n]+\n)+  \}/,
    `  1: {\n${mobileEntries}\n  }`,
  )
  fs.writeFileSync(mobile, m)

  let w = fs.readFileSync(web, 'utf8')
  const webEntries = files
    .map(
      (n) =>
        `    ${n}: new URL('../../../assets/code-images/chapitre-1/${n}.png', import.meta.url).href,`,
    )
    .join('\n')
  // try several patterns
  if (/  1: \{\n(?:    \d+: new URL\([^\n]+\n)+  \}/.test(w)) {
    w = w.replace(
      /  1: \{\n(?:    \d+: new URL\([^\n]+\n)+  \}/,
      `  1: {\n${webEntries}\n  }`,
    )
  } else if (/chapitre-1\/3\.png/.test(w)) {
    // fallback: replace block starting at 1:
    w = w.replace(
      /  1: \{[\s\S]*?\n  \},\n  3:/,
      `  1: {\n${webEntries}\n  },\n  3:`,
    )
  }
  fs.writeFileSync(web, w)
  console.log(`Image maps: ${files.length} entries for chapter 1`)
}

function rebuildAudioMaps() {
  const chapters = [1]
  // rebuild only chapter 1 keys from disk after TTS; call separately
  const audioRoot = path.join(REPO, 'mobile', 'assets', 'code-audio', 'chapitre-1')
  if (!fs.existsSync(audioRoot)) return
  const nums = fs
    .readdirSync(audioRoot)
    .filter((f) => f.endsWith('.mp3'))
    .map((f) => Number(f.replace('.mp3', '')))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b)

  const mobile = path.join(REPO, 'mobile', 'src', 'data', 'codeRoute', 'audioAssets.ts')
  let m = fs.readFileSync(mobile, 'utf8')
  const entries = nums
    .map((n) => `    ${n}: require('../../../assets/code-audio/chapitre-1/${n}.mp3'),`)
    .join('\n')
  m = m.replace(
    /  1: \{\n(?:    \d+: require\([^\n]+\n)+  \}/,
    `  1: {\n${entries}\n  }`,
  )
  fs.writeFileSync(mobile, m)

  const web = path.join(REPO, 'src', 'data', 'codeRoute', 'audioUrls.ts')
  let w = fs.readFileSync(web, 'utf8')
  const webEntries = nums
    .map(
      (n) =>
        `    ${n}: new URL('../../../assets/code-audio/chapitre-1/${n}.mp3', import.meta.url).href,`,
    )
    .join('\n')
  if (/  1: \{\n(?:    \d+: new URL\([^\n]+\n)+  \}/.test(w)) {
    w = w.replace(
      /  1: \{\n(?:    \d+: new URL\([^\n]+\n)+  \}/,
      `  1: {\n${webEntries}\n  }`,
    )
  } else {
    w = w.replace(
      /  1: \{[\s\S]*?\n  \},\n  3:/,
      `  1: {\n${webEntries}\n  },\n  3:`,
    )
  }
  fs.writeFileSync(web, w)
  console.log(`Audio maps: ${nums.length} entries for chapter 1`)
}

const mode = process.argv[2] || 'all'
if (mode === 'texts' || mode === 'all') writeTexts()
if (mode === 'banks' || mode === 'all') {
  updateServerBank()
  patchLocalBanks(path.join(REPO, 'mobile', 'src', 'data', 'codeRoute', 'banks.ts'))
  patchLocalBanks(path.join(REPO, 'src', 'data', 'codeRoute', 'banks.ts'))
}
if (mode === 'images' || mode === 'all') rebuildImageAssets()
if (mode === 'audio-maps') rebuildAudioMaps()

export { rebuildAudioMaps, rebuildImageAssets }
