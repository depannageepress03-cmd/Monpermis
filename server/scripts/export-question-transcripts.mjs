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
  const text = String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\n*Correction:.*$/is, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  if (!text || /^Question \d+ du chapitre \d+/i.test(text)) return ''
  return text
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
    .replace(/,?\\s*réponse\\s+([A-E])\\s*[,:]?\\s*/gi, '\\n$1. ')
    .replace(/\\s+([A-E])\\s*[:.]\\s+/g, '\\n$1. ')
    .replace(/,\\s+([A-E])\\s*,\\s+/g, '\\n$1. ')
    .replace(/\\.\\s+([A-E])\\s*,\\s+/g, '.\\n$1. ')
    .replace(/\\n{3,}/g, '\\n\\n')
    .trim()
}

export function getQuestionTranscript(chapterOrder: number, questionOrder: number): string {
  const chapter = Number(chapterOrder)
  const order = Number(questionOrder)
  if (!Number.isFinite(chapter) || chapter < 1 || !Number.isFinite(order) || order < 1) return ''
  return formatTranscript(QUESTION_TRANSCRIPTS[\`\${chapter}:\${order}\`] || '')
}

export type TranscriptQuestion = {
  id?: string
  order?: number
  prompt?: { text?: string; transcript?: string; audioUrl?: string; imageUrls?: string[] }
  answers?: { label?: string; text?: string; [key: string]: unknown }[]
}

/** Options A–E extraites de la transcription TTS. */
export function parseTranscriptAnswerOptions(transcript: string): Record<string, string> {
  const options: Record<string, string> = {}
  const re = /(?:^|\\n)\\s*([A-E])\\s*[.:)\\-–]\\s*([^\\n]+)/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(String(transcript || '')))) {
    const label = match[1].toUpperCase()
    const text = match[2].trim()
    if (text) options[label] = text
  }
  return options
}

function fillAnswerTexts<T extends TranscriptQuestion>(question: T, transcript: string): T {
  const options = parseTranscriptAnswerOptions(transcript)
  if (!Array.isArray(question.answers) || question.answers.length === 0) return question
  return {
    ...question,
    answers: question.answers.map((answer) => {
      const existing = String(answer.text || '').trim()
      const fromTranscript = options[String(answer.label || '').toUpperCase()] || ''
      return { ...answer, text: existing || fromTranscript }
    }),
  }
}

/** Résout la transcription même si l’API n’a pas encore le champ \`transcript\`. */
export function resolveQuestionTranscript(
  question?: TranscriptQuestion | null,
  chapterOrder?: number | null,
): string {
  if (!question) return ''
  const direct = formatTranscript(question.prompt?.transcript || '')
  if (direct) return direct
  const parsed = String(question.id || '').match(/^hc-ch(\\d+)-q(\\d+)$/i)
  const chapter = parsed ? Number(parsed[1]) : Number(chapterOrder) || 0
  const order = parsed ? Number(parsed[2]) : Number(question.order) || 0
  const lookedUp = getQuestionTranscript(chapter, order)
  if (lookedUp) return lookedUp
  return formatTranscript(question.prompt?.text || '')
}

export function attachQuestionTranscript<T extends TranscriptQuestion>(
  question: T,
  chapterOrder?: number | null,
): T {
  const transcript = resolveQuestionTranscript(question, chapterOrder)
  return fillAnswerTexts(
    {
      ...question,
      prompt: {
        audioUrl: '',
        imageUrls: [],
        ...question.prompt,
        transcript,
      },
    },
    transcript,
  )
}
`

fs.mkdirSync(path.dirname(outWeb), { recursive: true })
fs.mkdirSync(path.dirname(outMobile), { recursive: true })
fs.writeFileSync(outWeb, source)
fs.writeFileSync(outMobile, source)
console.log(`Exportés ${Object.keys(transcripts).length} transcriptions → web + mobile`)
