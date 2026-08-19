import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const textsRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../../content/code-audio')
const cache = new Map()

function normalizeTranscript(value) {
  const text = String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\n*Correction:.*$/is, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/,?\s*réponse\s+([A-E])\s*[,:]?\s*/gi, '\n$1. ')
    .replace(/\s+([A-E])\s*[:.]\s+/g, '\n$1. ')
    .replace(/,\s+([A-E])\s*,\s+/g, '\n$1. ')
    .replace(/\.\s+([A-E])\s*,\s+/g, '.\n$1. ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  if (!text || /^Question \d+ du chapitre \d+/i.test(text)) return ''
  return text
}

/**
 * Transcription TTS (énoncé lu) pour une question hardcodée.
 * Fichiers : server/content/code-audio/chapitre-{n}/texts/{order}.txt
 */
export function getHardcodedQuestionTranscript(chapterOrder, questionOrder) {
  const chapter = Number(chapterOrder)
  const order = Number(questionOrder)
  if (!Number.isFinite(chapter) || chapter < 1 || !Number.isFinite(order) || order < 1) {
    return ''
  }
  const key = `${chapter}:${order}`
  if (cache.has(key)) return cache.get(key)

  const file = path.join(textsRoot, `chapitre-${chapter}`, 'texts', `${order}.txt`)
  let text = ''
  try {
    text = normalizeTranscript(fs.readFileSync(file, 'utf8'))
  } catch {
    text = ''
  }
  cache.set(key, text)
  return text
}

/** Options A–E extraites de la transcription TTS. */
export function parseTranscriptAnswerOptions(transcript) {
  const options = {}
  const re = /(?:^|\n)\s*([A-E])\s*[.:)\-–]\s*([^\n]+)/gi
  let match
  while ((match = re.exec(String(transcript || '')))) {
    const label = String(match[1] || '').toUpperCase()
    const text = String(match[2] || '').trim()
    if (label && text) options[label] = text
  }
  return options
}
