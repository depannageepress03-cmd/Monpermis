import { Question } from '../models/Question.js'
import { PracticeExam } from '../models/PracticeExam.js'
import {
  PRACTICE_EXAM_COUNT,
  PRACTICE_EXAM_SIZE,
  pickRandomQuestions,
} from '../utils/practiceExam.js'

export async function countPublishedQuestions() {
  return Question.countDocuments({ published: true })
}

export async function generatePracticeExamSheets() {
  const questions = await Question.find({ published: true }).select('_id')
  if (questions.length < PRACTICE_EXAM_SIZE) {
    return {
      error: `Il faut au moins ${PRACTICE_EXAM_SIZE} questions publiées (actuellement ${questions.length}).`,
      bankCount: questions.length,
    }
  }

  await PracticeExam.deleteMany({})

  const sheets = []
  for (let examNumber = 1; examNumber <= PRACTICE_EXAM_COUNT; examNumber += 1) {
    const selected = pickRandomQuestions(questions, PRACTICE_EXAM_SIZE)
    sheets.push({
      examNumber,
      questionIds: selected.map((q) => q._id),
      published: true,
    })
  }

  await PracticeExam.insertMany(sheets)
  const created = await PracticeExam.find().sort({ examNumber: 1 })

  return {
    bankCount: questions.length,
    examCount: created.length,
    exams: created.map((exam) => exam.toAdminJSON()),
  }
}

export async function ensurePracticeExamSheets() {
  const existing = await PracticeExam.countDocuments()
  if (existing >= PRACTICE_EXAM_COUNT) {
    const exams = await PracticeExam.find().sort({ examNumber: 1 })
    const bankCount = await countPublishedQuestions()
    return { bankCount, examCount: exams.length, exams, generated: false }
  }
  const result = await generatePracticeExamSheets()
  if (result.error) return { ...result, generated: false }
  return { ...result, generated: true }
}
