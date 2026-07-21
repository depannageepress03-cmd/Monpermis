import mongoose from 'mongoose'

export const NOTIFICATION_TYPES = [
  'subscription_activated',
  'subscription_pending',
  'subscription_expiring',
  'reservation_confirmed',
  'reservation_cancelled',
  'payment_validated',
  'announcement',
  'general',
]

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      default: 'general',
    },
    title: { type: String, required: true, trim: true },
    body: { type: String, default: '', trim: true },
    /** Route mobile facultative vers laquelle diriger l’utilisateur au tap. */
    link: { type: String, default: '', trim: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
)

notificationSchema.index({ userId: 1, createdAt: -1 })

notificationSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: String(this._id),
    type: this.type,
    title: this.title,
    body: this.body,
    link: this.link,
    read: Boolean(this.readAt),
    createdAt: this.createdAt,
  }
}

export const Notification = mongoose.model('Notification', notificationSchema)
