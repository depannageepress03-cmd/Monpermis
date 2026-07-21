import { Notification } from '../models/Notification.js'
import { logger } from '../utils/logger.js'

/**
 * Crée une notification pour un utilisateur. Ne lève jamais : une notification
 * ratée ne doit pas casser le flux métier appelant (paiement, réservation…).
 */
export async function notifyUser(userId, { type = 'general', title, body = '', link = '' }) {
  if (!userId || !title) return null
  try {
    return await Notification.create({ userId, type, title, body, link })
  } catch (error) {
    logger.error('Notification non créée', { error: error.message, userId: String(userId), type })
    return null
  }
}

/** Diffuse une notification identique à plusieurs utilisateurs (annonces). */
export async function notifyManyUsers(userIds, payload) {
  const docs = userIds
    .filter(Boolean)
    .map((userId) => ({
      userId,
      type: payload.type ?? 'announcement',
      title: payload.title,
      body: payload.body ?? '',
      link: payload.link ?? '',
    }))
  if (!docs.length) return 0
  try {
    const created = await Notification.insertMany(docs, { ordered: false })
    return created.length
  } catch (error) {
    logger.error('Diffusion notifications échouée', { error: error.message })
    return 0
  }
}
