#!/usr/bin/env node
/**
 * Régénère src/ + mobile/ banks.ts depuis server/src/data/hardcodedQuestions.
 * Source de vérité = admin/serveur. Les banques locales ne servent qu’au hors-ligne.
 *
 * Usage: node server/scripts/generate-learner-banks.mjs
 *        npm run generate:learner-banks --prefix server
 */
import { writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '../..')

const mod = await import(
  pathToFileURL(join(root, 'server/src/data/hardcodedQuestions/index.js')).href
)
const banks = [...(mod.HARDCODED_CHAPTER_BANKS || [])].sort((a, b) => a.order - b.order)

function letterList(answers) {
  return answers.map((a) => String(a.label).toUpperCase())
}

function correctLetters(answers) {
  return answers.filter((a) => a.isCorrect).map((a) => String(a.label).toUpperCase())
}

function imageIndexes(q, chapterOrder) {
  const urls = q.prompt?.imageUrls || []
  const idxs = []
  for (const u of urls) {
    const s = String(u)
    const m = s.match(new RegExp(`chapitre-${chapterOrder}/(\\d+)\\.(?:png|jpe?g)`, 'i'))
    if (m) {
      idxs.push(Number(m[1]))
      continue
    }
    const local = s.match(/local:\/\/code-image\/(\d+)\/(\d+)/i)
    if (local && Number(local[1]) === chapterOrder) idxs.push(Number(local[2]))
  }
  return [...new Set(idxs)]
}

function emitQuestionLine(chapterOrder, q) {
  const letters = letterList(q.answers)
  const correct = correctLetters(q.answers)
  const imgs = imageIndexes(q, chapterOrder)
  const lettersLit = `[${letters.map((l) => `'${l}'`).join(', ')}]`
  const correctLit = `[${correct.map((l) => `'${l}'`).join(', ')}]`
  if (imgs.length) {
    return `  question(${chapterOrder}, ${q.order}, ${lettersLit}, ${correctLit}, [${imgs.join(', ')}]),`
  }
  return `  question(${chapterOrder}, ${q.order}, ${lettersLit}, ${correctLit}),`
}

const header = `export type LocalAnswer = {
  id: string
  label: string
  text: string
  audioUrl: string
  isCorrect: boolean
}

export type LocalQuestion = {
  id: string
  chapterKey: string
  chapterOrder: number
  order: number
  published: boolean
  prompt: { text: string; audioUrl: string; imageUrls: string[] }
  answers: LocalAnswer[]
}

function answers(
  chapterOrder: number,
  questionIndex: number,
  letters: string[],
  correctLetters: string[],
): LocalAnswer[] {
  const prefix = \`hc-ch\${chapterOrder}-q\${String(questionIndex).padStart(2, '0')}\`
  const correct = new Set(correctLetters.map((l) => l.toUpperCase()))
  return letters.map((letter) => {
    const L = letter.toUpperCase()
    return {
      id: \`\${prefix}-\${L.toLowerCase()}\`,
      label: L,
      text: '',
      audioUrl: '',
      isCorrect: correct.has(L),
    }
  })
}

function question(
  chapterOrder: number,
  order: number,
  letterOptions: string[],
  correctLetters: string[],
  imageIndexes: number[] = [],
): LocalQuestion {
  const id = \`hc-ch\${chapterOrder}-q\${String(order).padStart(2, '0')}\`
  return {
    id,
    chapterKey: \`chapitre-\${chapterOrder}\`,
    chapterOrder,
    order,
    published: true,
    prompt: {
      text: '',
      audioUrl: \`local://code-audio/\${chapterOrder}/\${order}.mp3\`,
      imageUrls: imageIndexes.map(
        (n) => \`local://code-image/\${chapterOrder}/\${n}.png\`,
      ),
    },
    answers: answers(chapterOrder, order, letterOptions, correctLetters),
  }
}

/** Généré depuis server/src/data/hardcodedQuestions — ne pas éditer à la main.
 *  Régénérer: npm run generate:learner-banks --prefix server
 */
`

let body = ''
const mapEntries = []
for (const bank of banks) {
  const order = bank.order
  const qs = bank.questions || []
  body += `\nconst CHAPITRE_${order}: LocalQuestion[] = [\n`
  for (const q of qs) {
    body += `${emitQuestionLine(order, q)}\n`
  }
  body += `]\n`
  mapEntries.push(`  ${order}: CHAPITRE_${order},`)
}

const footer = `
const BANKS_BY_ORDER: Record<number, LocalQuestion[]> = {
${mapEntries.join('\n')}
}

export function getLocalBankByChapterOrder(order: number): LocalQuestion[] | null {
  return BANKS_BY_ORDER[order] || null
}

export function findLocalQuestionById(questionId: string): LocalQuestion | null {
  const id = String(questionId || '')
  for (const bank of Object.values(BANKS_BY_ORDER)) {
    const found = bank.find((q) => q.id === id)
    if (found) return found
  }
  return null
}

export function parseLocalQuestionId(questionId: string): { chapterOrder: number; questionOrder: number } | null {
  const m = String(questionId || '').match(/^hc-ch(\\d+)-q(\\d+)$/i)
  if (!m) return null
  return { chapterOrder: Number(m[1]), questionOrder: Number(m[2]) }
}

export function toPublicLocalQuestion(q: LocalQuestion, chapterId: string) {
  return {
    id: q.id,
    chapterId: String(chapterId),
    order: q.order,
    prompt: {
      text: q.prompt.text || '',
      audioUrl: q.prompt.audioUrl,
      imageUrls: q.prompt.imageUrls || [],
    },
    answers: q.answers.map((a) => ({
      id: a.id,
      label: a.label,
      text: a.text || '',
      audioUrl: a.audioUrl || '',
    })),
  }
}

export function checkLocalAnswers(questionId: string, answerIds: string[]) {
  const question = findLocalQuestionById(questionId)
  if (!question) return null
  const correctIds = new Set(question.answers.filter((a) => a.isCorrect).map((a) => a.id))
  const selectedIds = new Set((answerIds || []).map(String))
  const isCorrect =
    correctIds.size === selectedIds.size && [...correctIds].every((id) => selectedIds.has(id))
  return { isCorrect, correctAnswerIds: [...correctIds] }
}
`

const out = header + body + footer
const webPath = join(root, 'src/data/codeRoute/banks.ts')
const mobilePath = join(root, 'mobile/src/data/codeRoute/banks.ts')
writeFileSync(webPath, out)
writeFileSync(mobilePath, out)

console.log('Écrit:', webPath)
console.log('Écrit:', mobilePath)
for (const bank of banks) {
  console.log(`  ch${bank.order}: ${bank.questions.length} questions`)
}
console.log('\nOK — banques learner régénérées depuis le serveur.')
