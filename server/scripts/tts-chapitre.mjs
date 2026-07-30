/**
 * Génère des MP3 code-de-la-route via ElevenLabs (texte → audio).
 *
 * Prérequis :
 *   1. Compte ElevenLabs + clé API
 *   2. Dans server/.env :
 *        ELEVENLABS_API_KEY=sk_...
 *        ELEVENLABS_VOICE_ID=...   (voix Jérôme ou autre)
 *
 * Usage (depuis server/) :
 *   node scripts/tts-chapitre.mjs --chapter 19
 *   node scripts/tts-chapitre.mjs --chapter 19 --only 1,2,5
 *   node scripts/tts-chapitre.mjs --list-voices
 *
 * Textes d’entrée :
 *   content/code-audio/chapitre-XX/texts/1.txt … N.txt
 *
 * Sortie :
 *   content/code-audio/chapitre-XX/1.mp3 …
 *   (+ copie mobile/ et src/ si les dossiers existent)
 */
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SERVER_ROOT = path.resolve(__dirname, '..')
const REPO_ROOT = path.resolve(SERVER_ROOT, '..')

const API_KEY = String(process.env.ELEVENLABS_API_KEY || '').trim()
const VOICE_ID = String(process.env.ELEVENLABS_VOICE_ID || '').trim()
const MODEL_ID = String(process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2').trim()

function parseArgs(argv) {
  const out = { chapter: null, only: null, listVoices: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--list-voices') out.listVoices = true
    else if (a === '--chapter') out.chapter = Number(argv[++i])
    else if (a === '--only') {
      out.only = String(argv[++i] || '')
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isFinite(n) && n > 0)
    }
  }
  return out
}

async function listVoices() {
  const res = await fetch('https://api.elevenlabs.io/v1/voices', {
    headers: { 'xi-api-key': API_KEY },
  })
  if (!res.ok) {
    throw new Error(`Liste voix HTTP ${res.status}: ${await res.text()}`)
  }
  const data = await res.json()
  const voices = Array.isArray(data.voices) ? data.voices : []
  for (const v of voices) {
    const name = v.name || '?'
    const id = v.voice_id || '?'
    const mark = /j[eé]r[oô]me/i.test(name) ? '  ← Jérôme ?' : ''
    console.log(`${id}  ${name}${mark}`)
  }
}

async function synthesize(text, outPath) {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': API_KEY,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: MODEL_ID,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true,
      },
    }),
  })
  if (!res.ok) {
    throw new Error(`TTS HTTP ${res.status}: ${await res.text()}`)
  }
  const buf = Buffer.from(await res.arrayBuffer())
  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, buf)
  return buf.length
}

function copyBeside(srcFile, chapter) {
  const name = path.basename(srcFile)
  const targets = [
    path.join(REPO_ROOT, 'mobile', 'assets', 'code-audio', `chapitre-${chapter}`, name),
    path.join(REPO_ROOT, 'src', 'assets', 'code-audio', `chapitre-${chapter}`, name),
  ]
  for (const dest of targets) {
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.copyFileSync(srcFile, dest)
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (!API_KEY) {
    console.error('Manque ELEVENLABS_API_KEY dans server/.env')
    process.exit(1)
  }

  if (args.listVoices) {
    await listVoices()
    return
  }

  if (!args.chapter || !Number.isFinite(args.chapter)) {
    console.error('Usage: node scripts/tts-chapitre.mjs --chapter 19 [--only 1,2,5]')
    console.error('       node scripts/tts-chapitre.mjs --list-voices')
    process.exit(1)
  }

  if (!VOICE_ID) {
    console.error('Manque ELEVENLABS_VOICE_ID dans server/.env')
    console.error('Trouve-le avec: node scripts/tts-chapitre.mjs --list-voices')
    process.exit(1)
  }

  const chapter = args.chapter
  const textsDir = path.join(SERVER_ROOT, 'content', 'code-audio', `chapitre-${chapter}`, 'texts')
  const outDir = path.join(SERVER_ROOT, 'content', 'code-audio', `chapitre-${chapter}`)

  if (!fs.existsSync(textsDir)) {
    console.error(`Dossier textes introuvable: ${textsDir}`)
    console.error(`Crée des fichiers 1.txt, 2.txt, … avec l’énoncé de chaque question.`)
    process.exit(1)
  }

  const files = fs
    .readdirSync(textsDir)
    .filter((f) => /^\d+\.txt$/i.test(f))
    .sort((a, b) => Number(a.replace(/\D/g, '')) - Number(b.replace(/\D/g, '')))

  const selected = args.only?.length
    ? files.filter((f) => args.only.includes(Number(f.replace(/\D/g, ''))))
    : files

  if (!selected.length) {
    console.error('Aucun fichier texte à traiter.')
    process.exit(1)
  }

  console.log(`Chapitre ${chapter} — ${selected.length} fichier(s) — voix ${VOICE_ID}`)

  for (const file of selected) {
    const n = Number(file.replace(/\D/g, ''))
    const textPath = path.join(textsDir, file)
    const text = fs.readFileSync(textPath, 'utf8').trim()
    if (!text) {
      console.warn(`  skip ${file} (vide)`)
      continue
    }
    const outPath = path.join(outDir, `${n}.mp3`)
    process.stdout.write(`  ${n}.mp3 … `)
    const bytes = await synthesize(text, outPath)
    copyBeside(outPath, chapter)
    console.log(`${(bytes / 1024).toFixed(0)} Ko`)
  }

  console.log('OK. Branche ensuite les assets dans mobile/src/data/codeRoute/audioAssets.ts si besoin.')
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
