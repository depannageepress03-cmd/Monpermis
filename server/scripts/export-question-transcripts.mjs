/**
 * Génère les maps client (web + mobile) depuis les .txt TTS.
 * Usage : node scripts/export-question-transcripts.mjs  (depuis server/)
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const textsRoot = path.join(__dirname, '../content/code-audio')
const outWeb = path.join(__dirname, '../../src/data/codeRoute/questionTranscripts.ts')
const outMobile = path.join(__dirname, '../../mobile/src/data/codeRoute/questionTranscripts.ts')

function normalizeTranscript(value) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const transcripts = {}
for (const dir of fs.readdirSync(textsRoot)) {
  const match = dir.match(/^chapitre-(\d+)$/)
  if (!match) continue
  const chapter = Number(match[1])
  const textsDir = path.join(textsRoot, dir, 'texts')
  if (!fs.existsSync(textsDir) || !fs.statSync(textsDir).isDirectory()) continue
  for (const file of fs.readdirSync(textsDir)) {
    const questionMatch = file.match(/^(\d+)\.txt$/i)
    if (!questionMatch) continue
    const order = Number(questionMatch[1])
    const text = normalizeTranscript(fs.readFileSync(path.join(textsDir, file), 'utf8'))
    if (text) transcripts[`${chapter}:${order}`] = text
  }
}

const source = `/** Transcriptions TTS des questions — généré par server/scripts/export-question-transcripts.mjs */
export const QUESTION_TRANSCRIPTS: Record<string, string> = ${JSON.stringify(transcripts, null, 2)}

function formatTranscript(text: string): string {
  return String(text || '')
    .replace(/[ \\t]+/g, ' ')
    .replace(/\\s+([A-E])\\s*[:.]\\s+/g, '\\n$1. ')
    .replace(/\\n{3,}/g, '\\n\\n')
    .trim()
}

export function getQuestionTranscript(chapterOrder: number, questionOrder: number): string {
  const chapter = Number(chapterOrder)
  const order = Number(questionOrder)
  if (!Number.isFinite(chapter) || chapter < 1 || !Number.isFinite(order) || order < 1) return ''
  return formatTranscript(QUESTION_TRANSCRIPTS[\`\${chapter}:\${order}\`] || '')
}

/** Texte affiché en entraînement révision uniquement (pas examens / sujets test). */
export function getRevisionPracticeTranscript(prompt?: {
  text?: string
  transcript?: string
} | null): string {
  return formatTranscript(prompt?.transcript || prompt?.text || '')
}
`

fs.mkdirSync(path.dirname(outWeb), { recursive: true })
fs.mkdirSync(path.dirname(outMobile), { recursive: true })
fs.writeFileSync(outWeb, source)
fs.writeFileSync(outMobile, source)
console.log(`Exportés ${Object.keys(transcripts).length} transcriptions → web + mobile`)
