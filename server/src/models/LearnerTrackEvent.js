import mongoose from 'mongoose'

/**
 * Événements de traçage mobile des apprenants (faits et gestes sur l'APK).
 * Append-only — permet à l'admin de suivre le comportement pendant les examens.
 */
export const LEARNER_TRACK_EVENTS = [
  // Session app
  'app_open',
  'app_background',
  'app_foreground',
  // Navigation
  'screen_view',
  // Examens blancs
  'exam_start',
  'exam_answer',
  'exam_skip',
  'exam_quit',
  'exam_complete',
  'exam_pause',
  'exam_resume',
  // Sujets de test par chapitre
  'test_start',
  'test_answer',
  'test_skip',
  'test_complete',
  // Entraînement par chapitre
  'practice_start',
  'practice_answer',
  'practice_skip',
  'practice_complete',
]

const learnerTrackEventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    event: { type: String, enum: LEARNER_TRACK_EVENTS, required: true, index: true },
    sessionId: { type: String, default: '', trim: true, index: true },
    /** Contexte métier : examNumber, examId, attemptId, questionId, chapterId, screen… */
    context: { type: mongoose.Schema.Types.Mixed, default: null },
    /** Données du moment : answerIds, isCorrect, index, total, elapsedMs, score… */
    payload: { type: mongoose.Schema.Types.Mixed, default: null },
    /** Horodatage appareil (peut diverger du serveur) */
    clientTs: { type: Date, default: null },
    appVersion: { type: String, default: '', trim: true },
    platform: { type: String, default: '', trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
)

learnerTrackEventSchema.index({ createdAt: -1 })
learnerTrackEventSchema.index({ userId: 1, createdAt: -1 })
learnerTrackEventSchema.index({ event: 1, createdAt: -1 })
learnerTrackEventSchema.index({ 'context.examNumber': 1, 'context.examId': 1, createdAt: -1 })
learnerTrackEventSchema.index({ 'context.attemptId': 1, createdAt: 1 })

learnerTrackEventSchema.methods.toAdminJSON = function toAdminJSON() {
  return {
    id: String(this._id),
    userId: String(this.userId),
    event: this.event,
    sessionId: this.sessionId || '',
    context: this.context ?? null,
    payload: this.payload ?? null,
    clientTs: this.clientTs || null,
    appVersion: this.appVersion || '',
    platform: this.platform || '',
    createdAt: this.createdAt,
  }
}

export const LearnerTrackEvent = mongoose.model('LearnerTrackEvent', learnerTrackEventSchema)
