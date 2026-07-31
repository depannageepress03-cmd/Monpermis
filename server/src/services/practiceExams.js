import { Chapter } from '../models/Chapter.js'
import { PracticeExam } from '../models/PracticeExam.js'
import {
  PRACTICE_EXAM_COUNT,
  PRACTICE_EXAM_SIZE,
  pickChapterBalancedQuestions,
  computeQuestionBankFingerprint,
  summarizeChapterBank,
} from '../utils/practiceExam.js'
import { hardcodedAsQuestionDocs } from './hardcodedQuestions.js'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CODE_AUDIO_ROOT = path.resolve(__dirname, '../../content/code-audio')

/** True si l’audio généré (MP3 embarqué serveur) existe pour cet id hc-ch… */
export function hasGeneratedExamAudio(questionId) {
  const match = String(questionId || '').match(/^hc-ch(\d+)-q(\d+)$/i)
  if (!match) return false
  const chapter = Number(match[1])
  const order = Number(match[2])
  if (!Number.isFinite(chapter) || !Number.isFinite(order)) return false
  const file = path.join(CODE_AUDIO_ROOT, `chapitre-${chapter}`, `${order}.mp3`)
  return fs.existsSync(file)
}

export async function loadPublishedExamQuestionBank() {
  const chapters = await Chapter.find({ published: true })
    .select('_id name order')
    .sort({ order: 1, createdAt: 1 })
  const chapterNameById = new Map(chapters.map((chapter) => [String(chapter._id), chapter.name]))

  // Examens test : uniquement questions hardcodées avec audio généré (hors-ligne).
  let questions = []
  for (const chapter of chapters) {
    const hardcoded = hardcodedAsQuestionDocs(chapter)
    if (!hardcoded?.length) continue
    for (const doc of hardcoded) {
      if (!hasGeneratedExamAudio(doc.id)) continue
      questions.push({ _id: doc.id, chapterId: chapter._id })
    }
  }

  return { questions, chapters, chapterNameById }
}

export async function countPublishedQuestions() {
  const { questions } = await loadPublishedExamQuestionBank()
  return questions.length
}

export async function getPracticeExamBankStats() {
  const { questions, chapterNameById } = await loadPublishedExamQuestionBank()
  return {
    bankCount: questions.length,
    chapterBank: summarizeChapterBank(questions, chapterNameById),
    fingerprint: computeQuestionBankFingerprint(questions),
  }
}

function sheetsMatchBank(exams, fingerprint) {
  if (!Array.isArray(exams) || exams.length < PRACTICE_EXAM_COUNT) return false
  return exams.every((exam) => String(exam.bankFingerprint || '') === fingerprint)
}

export async function generatePracticeExamSheets() {
  const { questions, chapterNameById } = await loadPublishedExamQuestionBank()
  if (questions.length < PRACTICE_EXAM_SIZE) {
    return {
      error: `Il faut au moins ${PRACTICE_EXAM_SIZE} questions publiées dans les chapitres publiés (actuellement ${questions.length}).`,
      bankCount: questions.length,
      chapterBank: summarizeChapterBank(questions, chapterNameById),
    }
  }

  const fingerprint = computeQuestionBankFingerprint(questions)
  await PracticeExam.deleteMany({})

  const sheets = []
  for (let examNumber = 1; examNumber <= PRACTICE_EXAM_COUNT; examNumber += 1) {
    const selected = pickChapterBalancedQuestions(questions, PRACTICE_EXAM_SIZE)
    sheets.push({
      examNumber,
      questionIds: selected.map((question) => question._id),
      published: true,
      bankFingerprint: fingerprint,
    })
  }

  await PracticeExam.insertMany(sheets)
  const created = await PracticeExam.find().sort({ examNumber: 1 })

  return {
    bankCount: questions.length,
    chapterBank: summarizeChapterBank(questions, chapterNameById),
    examCount: created.length,
    fingerprint,
    exams: created.map((exam) => exam.toAdminJSON()),
  }
}

export async function ensurePracticeExamSheets() {
  const { questions, chapterNameById } = await loadPublishedExamQuestionBank()
  const bankCount = questions.length
  const chapterBank = summarizeChapterBank(questions, chapterNameById)
  const fingerprint = computeQuestionBankFingerprint(questions)

  const exams = await PracticeExam.find().sort({ examNumber: 1 })
  if (sheetsMatchBank(exams, fingerprint)) {
    return {
      bankCount,
      chapterBank,
      examCount: exams.length,
      fingerprint,
      exams,
      generated: false,
    }
  }

  if (bankCount < PRACTICE_EXAM_SIZE) {
    return {
      error: `Il faut au moins ${PRACTICE_EXAM_SIZE} questions publiées dans les chapitres publiés (actuellement ${bankCount}).`,
      bankCount,
      chapterBank,
      fingerprint,
      generated: false,
    }
  }

  const result = await generatePracticeExamSheets()
  if (result.error) return { ...result, generated: false }
  return { ...result, generated: true }
}
