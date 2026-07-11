import mongoose from 'mongoose'
import {
  PRACTICE_EXAM_PASS_SCORE,
  PRACTICE_EXAM_SIZE,
  isPracticeExamPassed,
  scoreLabel,
} from '../utils/practiceExam.js'

const responseSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
    answerIds: [{ type: String }],
    isCorrect: { type: Boolean, default: false },
  },
  { _id: false },
)

const practiceExamAttemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PracticeExam',
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
    total: { type: Number, default: PRACTICE_EXAM_SIZE },
    passed: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

practiceExamAttemptSchema.index({ userId: 1, examNumber: 1, status: 1 })

practiceExamAttemptSchema.methods.toPublicJSON = function toPublicJSON(questions = []) {
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
    total: this.total || PRACTICE_EXAM_SIZE,
    scoreLabel: scoreLabel(this.correct, this.total || PRACTICE_EXAM_SIZE),
    passed: Boolean(this.passed),
    passScore: PRACTICE_EXAM_PASS_SCORE,
    completedAt: this.completedAt,
    startedAt: this.createdAt,
  }
}

practiceExamAttemptSchema.methods.toScoreJSON = function toScoreJSON() {
  return {
    id: this._id,
    examNumber: this.examNumber,
    correct: this.correct,
    total: this.total || PRACTICE_EXAM_SIZE,
    scoreLabel: scoreLabel(this.correct, this.total || PRACTICE_EXAM_SIZE),
    passed: Boolean(this.passed) || isPracticeExamPassed(this.correct),
    passScore: PRACTICE_EXAM_PASS_SCORE,
    completedAt: this.completedAt,
  }
}

export const PracticeExamAttempt = mongoose.model(
  'PracticeExamAttempt',
  practiceExamAttemptSchema,
)
