import { Chapter } from '../models/Chapter.js'
import { Question } from '../models/Question.js'
import { ECodePermisExam } from '../models/ECodePermisExam.js'
import {
  ECODEPERMIS_EXAM_COUNT,
  ECODEPERMIS_EXAM_SIZE,
  pickChapterBalancedQuestions,
  computeQuestionBankFingerprint,
  summarizeChapterBank,
} from '../utils/ecodepermis.js'

async function loadPublishedExamQuestionBank() {
  const chapters = await Chapter.find({ published: true }).select('_id name').sort({ order: 1, createdAt: 1 })
  const chapterIds = chapters.map((chapter) => chapter._id)
  const chapterNameById = new Map(chapters.map((chapter) => [String(chapter._id), chapter.name]))

  let questions = []
  if (chapterIds.length > 0) {
    questions = await Question.find({
      published: true,
      chapterId: { $in: chapterIds },
    }).select('_id chapterId')
  }

  if (questions.length === 0) {
    questions = await Question.find({ published: true }).select('_id chapterId')
  }

  return { questions, chapterNameById }
}

export async function countPublishedQuestions() {
  const { questions } = await loadPublishedExamQuestionBank()
  return questions.length
}

function sheetsMatchBank(exams, fingerprint) {
  if (!Array.isArray(exams) || exams.length < ECODEPERMIS_EXAM_COUNT) return false
  return exams.every((exam) => String(exam.bankFingerprint || '') === fingerprint)
}

export async function generateECodePermisExamSheets() {
  const { questions, chapterNameById } = await loadPublishedExamQuestionBank()
  if (questions.length < ECODEPERMIS_EXAM_SIZE) {
    return {
      error: `Il faut au moins ${ECODEPERMIS_EXAM_SIZE} questions publiées dans les chapitres publiés (actuellement ${questions.length}).`,
      bankCount: questions.length,
      chapterBank: summarizeChapterBank(questions, chapterNameById),
    }
  }

  const fingerprint = computeQuestionBankFingerprint(questions)
  await ECodePermisExam.deleteMany({})

  const sheets = []
  for (let examNumber = 1; examNumber <= ECODEPERMIS_EXAM_COUNT; examNumber += 1) {
    const selected = pickChapterBalancedQuestions(questions, ECODEPERMIS_EXAM_SIZE)
    sheets.push({
      examNumber,
      questionIds: selected.map((question) => question._id),
      published: true,
      bankFingerprint: fingerprint,
    })
  }

  await ECodePermisExam.insertMany(sheets)
  const created = await ECodePermisExam.find().sort({ examNumber: 1 })

  return {
    bankCount: questions.length,
    chapterBank: summarizeChapterBank(questions, chapterNameById),
    examCount: created.length,
    fingerprint,
    exams: created.map((exam) => exam.toAdminJSON()),
  }
}

export async function ensureECodePermisExamSheets() {
  const { questions, chapterNameById } = await loadPublishedExamQuestionBank()
  const bankCount = questions.length
  const chapterBank = summarizeChapterBank(questions, chapterNameById)
  const fingerprint = computeQuestionBankFingerprint(questions)

  const exams = await ECodePermisExam.find().sort({ examNumber: 1 })
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

  if (bankCount < ECODEPERMIS_EXAM_SIZE) {
    return {
      error: `Il faut au moins ${ECODEPERMIS_EXAM_SIZE} questions publiées dans les chapitres publiés (actuellement ${bankCount}).`,
      bankCount,
      chapterBank,
      fingerprint,
      generated: false,
    }
  }

  const result = await generateECodePermisExamSheets()
  if (result.error) return { ...result, generated: false }
  return { ...result, generated: true }
}
