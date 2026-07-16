import mongoose from 'mongoose'
import {
  ECODEPERMIS_EXAM_PASS_SCORE,
  ECODEPERMIS_EXAM_SIZE,
  isECodePermisExamPassed,
  scoreLabel,
} from '../utils/ecodepermis.js'

const responseSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
    answerIds: [{ type: String }],
    isCorrect: { type: Boolean, default: false },
  },
  { _id: false },
)

const ecodepermisExamAttemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ECodePermisExam',
      required: true,
      index: true,
    },
    examNumber: { type: Number, required: true },
    questionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
    responses: { type: [responseSchema], default: [] },
    status: {
      type: String,
      enum: ['in_progress', 'completed'],
      default: 'in_progress',
      index: true,
    },
    correct: { type: Number, default: 0 },
    total: { type: Number, default: ECODEPERMIS_EXAM_SIZE },
    passed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

ecodepermisExamAttemptSchema.index({ userId: 1, examNumber: 1, status: 1 })

ecodepermisExamAttemptSchema.methods.toPublicJSON = function toPublicJSON(questions = []) {
  const byId = new Map(questions.map((q) => [String(q.id || q._id), q]))
  const ordered = (this.questionIds || [])
    .map((id) => byId.get(String(id)))
    .filter(Boolean)
    .map((q) => (typeof q.toPublicJSON === 'function' ? q.toPublicJSON() : q))

  return {
    id: this._id,
    examId: this.examId,
    examNumber: this.examNumber,
    status: this.status,
    questionCount: ordered.length,
    questions: this.status === 'in_progress' ? ordered : [],
    answeredCount: (this.responses || []).length,
    liveCorrect: (this.responses || []).filter((r) => r.isCorrect).length,
    correct: this.correct,
    total: this.total || ECODEPERMIS_EXAM_SIZE,
    scoreLabel: scoreLabel(this.correct, this.total || ECODEPERMIS_EXAM_SIZE),
    passed: Boolean(this.passed),
    passScore: ECODEPERMIS_EXAM_PASS_SCORE,
    completedAt: this.completedAt,
    startedAt: this.createdAt,
  }
}

ecodepermisExamAttemptSchema.methods.toScoreJSON = function toScoreJSON() {
  return {
    id: this._id,
    examNumber: this.examNumber,
    correct: this.correct,
    total: this.total || ECODEPERMIS_EXAM_SIZE,
    scoreLabel: scoreLabel(this.correct, this.total || ECODEPERMIS_EXAM_SIZE),
    passed: Boolean(this.passed) || isECodePermisExamPassed(this.correct),
    passScore: ECODEPERMIS_EXAM_PASS_SCORE,
    completedAt: this.completedAt,
  }
}

export const ECodePermisExamAttempt = mongoose.model(
  'ECodePermisExamAttempt',
  ecodepermisExamAttemptSchema,
)
