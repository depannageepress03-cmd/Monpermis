import mongoose from 'mongoose'

const TEST_SUBJECT_SIZE = 20

const testSubjectSchema = new mongoose.Schema(
  {
    chapterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chapter',
      required: true,
      index: true,
    },
    questionIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
      default: [],
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length === TEST_SUBJECT_SIZE
        },
        message: `Un sujet test doit contenir exactement ${TEST_SUBJECT_SIZE} questions`,
      },
    },
    published: { type: Boolean, default: false },
  },
  { timestamps: true },
)

testSubjectSchema.index({ chapterId: 1, createdAt: -1 })

testSubjectSchema.methods.toAdminJSON = function toAdminJSON(questions = []) {
  const byId = new Map(questions.map((question) => [String(question.id || question._id), question]))
  const orderedQuestions = (this.questionIds || [])
    .map((id) => byId.get(String(id)))
    .filter(Boolean)
    .map((question) =>
      typeof question.toAdminJSON === 'function' ? question.toAdminJSON() : question,
    )

  return {
    id: this._id,
    chapterId: this.chapterId,
    published: Boolean(this.published),
    questionCount: orderedQuestions.length,
    questions: orderedQuestions,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  }
}

testSubjectSchema.methods.toPublicJSON = function toPublicJSON(questions = []) {
  const byId = new Map(questions.map((question) => [String(question.id || question._id), question]))
  const orderedQuestions = (this.questionIds || [])
    .map((id) => byId.get(String(id)))
    .filter(Boolean)
    .map((question) =>
      typeof question.toPublicJSON === 'function' ? question.toPublicJSON() : question,
    )

  return {
    id: this._id,
    chapterId: this.chapterId,
    questionCount: orderedQuestions.length,
    questions: orderedQuestions,
  }
}

export { TEST_SUBJECT_SIZE }
export const TestSubject = mongoose.model('TestSubject', testSubjectSchema)
