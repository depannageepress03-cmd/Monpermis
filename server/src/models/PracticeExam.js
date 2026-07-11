import mongoose from 'mongoose'
import {
  PRACTICE_EXAM_COUNT,
  PRACTICE_EXAM_SIZE,
} from '../utils/practiceExam.js'

const practiceExamSchema = new mongoose.Schema(
  {
    examNumber: {
      type: Number,
      required: true,
      min: 1,
      max: PRACTICE_EXAM_COUNT,
      unique: true,
    },
    questionIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
      default: [],
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length === PRACTICE_EXAM_SIZE
        },
        message: `Un examen blanc doit contenir exactement ${PRACTICE_EXAM_SIZE} questions`,
      },
    },
    published: { type: Boolean, default: true },
  },
  { timestamps: true },
)

practiceExamSchema.methods.toPublicJSON = function toPublicJSON(questions = []) {
  const byId = new Map(questions.map((q) => [String(q.id || q._id), q]))
  const ordered = (this.questionIds || [])
    .map((id) => byId.get(String(id)))
    .filter(Boolean)
    .map((q) => (typeof q.toPublicJSON === 'function' ? q.toPublicJSON() : q))

  return {
    id: this._id,
    examNumber: this.examNumber,
    questionCount: ordered.length,
    questions: ordered,
  }
}

practiceExamSchema.methods.toAdminJSON = function toAdminJSON(questions = []) {
  const data = this.toPublicJSON(questions)
  return {
    ...data,
    published: Boolean(this.published),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  }
}

export const PracticeExam = mongoose.model('PracticeExam', practiceExamSchema)
