import { Chapter } from '../models/Chapter.js'
import { Question } from '../models/Question.js'
import { PracticeExam } from '../models/PracticeExam.js'
import {
  PRACTICE_EXAM_COUNT,
  PRACTICE_EXAM_SIZE,
  pickChapterBalancedQuestions,
  computeQuestionBankFingerprint,
  summarizeChapterBank,
} from '../utils/practiceExam.js'
import { hardcodedAsQuestionDocs } from './hardcodedQuestions.js'

export async function loadPublishedExamQuestionBank() {
  const chapters = await Chapter.find({ published: true })
    .select('_id name order')
    .sort({ order: 1, createdAt: 1 })
  const chapterIds = chapters.map((chapter) => chapter._id)
  const chapterNameById = new Map(chapters.map((chapter) => [String(chapter._id), chapter.name]))

  let questions = []
  if (chapterIds.length > 0) {
    questions = await Question.find({
      published: true,
      chapterId: { $in: chapterIds },
    }).select('_id chapterId')
  }

  // Injecte / remplace par les banques en dur (ex. chapitre 20).
  for (const chapter of chapters) {
    const hardcoded = hardcodedAsQuestionDocs(chapter)
    if (!hardcoded?.length) continue
    const chapterId = String(chapter._id)
    questions = questions.filter((q) => String(q.chapterId) !== chapterId)
    for (const doc of hardcoded) {
      questions.push({ _id: doc.id, chapterId: chapter._id })
    }
  }

  // Secours : questions publiées orphelines / chapitres non publiés absents.
  if (questions.length === 0) {
    questions = await Question.find({ published: true }).select('_id chapterId')
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
