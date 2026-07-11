import mongoose from 'mongoose'

const answerOptionSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    text: { type: String, default: '', trim: true },
    audioUrl: { type: String, default: '' },
    isCorrect: { type: Boolean, default: false },
  },
  { _id: true },
)

const questionSchema = new mongoose.Schema(
  {
    chapterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chapter',
      required: true,
      index: true,
    },
    order: { type: Number, default: 0 },
    published: { type: Boolean, default: false },
    prompt: {
      text: { type: String, default: '' },
      audioUrl: { type: String, default: '' },
      imageUrls: { type: [String], default: [] },
    },
    answers: {
      type: [answerOptionSchema],
      default: [],
    },
  },
  { timestamps: true },
)

questionSchema.index({ chapterId: 1, order: 1 })

questionSchema.methods.toAdminJSON = function toAdminJSON() {
  return {
    id: this._id,
    chapterId: this.chapterId,
    order: this.order,
    published: Boolean(this.published),
    prompt: {
      text: this.prompt?.text || '',
      audioUrl: this.prompt?.audioUrl || '',
      imageUrls: Array.isArray(this.prompt?.imageUrls) ? this.prompt.imageUrls : [],
    },
    answers: (this.answers || []).map((answer) => ({
      id: answer._id,
      label: answer.label,
      text: answer.text || '',
      audioUrl: answer.audioUrl || '',
      isCorrect: Boolean(answer.isCorrect),
    })),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  }
}

/** Version client : sans isCorrect (corrigé côté serveur). */
questionSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id,
    chapterId: this.chapterId,
    order: this.order,
    prompt: {
      text: this.prompt?.text || '',
      audioUrl: this.prompt?.audioUrl || '',
      imageUrls: Array.isArray(this.prompt?.imageUrls) ? this.prompt.imageUrls : [],
    },
    answers: (this.answers || []).map((answer) => ({
      id: answer._id,
      label: answer.label,
      text: answer.text || '',
      audioUrl: answer.audioUrl || '',
    })),
  }
}

export const Question = mongoose.model('Question', questionSchema)
