import { Question } from '../models/Question.js'
import { ECodePermisExam } from '../models/ECodePermisExam.js'
import {
  ECODEPERMIS_EXAM_COUNT,
  ECODEPERMIS_EXAM_SIZE,
  pickRandomQuestions,
} from '../utils/ecodepermis.js'

export async function countPublishedQuestions() {
  return Question.countDocuments({ published: true })
}

export async function generateECodePermisExamSheets() {
  const questions = await Question.find({ published: true }).select('_id')
  if (questions.length < ECODEPERMIS_EXAM_SIZE) {
    return {
      error: `Il faut au moins ${ECODEPERMIS_EXAM_SIZE} questions publiées (actuellement ${questions.length}).`,
      bankCount: questions.length,
    }
  }

  await ECodePermisExam.deleteMany({})

  const sheets = []
  for (let examNumber = 1; examNumber <= ECODEPERMIS_EXAM_COUNT; examNumber += 1) {
    const selected = pickRandomQuestions(questions, ECODEPERMIS_EXAM_SIZE)
    sheets.push({
      examNumber,
      questionIds: selected.map((q) => q._id),
      published: true,
    })
  }

  await ECodePermisExam.insertMany(sheets)
  const created = await ECodePermisExam.find().sort({ examNumber: 1 })

  return {
    bankCount: questions.length,
    examCount: created.length,
    exams: created.map((exam) => exam.toAdminJSON()),
  }
}

export async function ensureECodePermisExamSheets() {
  const existing = await ECodePermisExam.countDocuments()
  if (existing >= ECODEPERMIS_EXAM_COUNT) {
    const exams = await ECodePermisExam.find().sort({ examNumber: 1 })
    const bankCount = await countPublishedQuestions()
    return { bankCount, examCount: exams.length, exams, generated: false }
  }
  const result = await generateECodePermisExamSheets()
  if (result.error) return { ...result, generated: false }
  return { ...result, generated: true }
}
