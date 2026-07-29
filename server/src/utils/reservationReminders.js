import { Reservation } from '../models/Reservation.js'
import { sendWhatsAppMessage, formatReservationReminder } from '../services/whatsapp.js'

function slotDateTime(date, time) {
  return new Date(`${date}T${time}:00`)
}

/**
 * Rappels WhatsApp ~2 h avant le début (fenêtre 1h30–2h30).
 * Idempotent via claim atomique de `reminderSentAt` (évite double envoi cron + interval).
 */
export async function runReservationReminders() {
  const now = Date.now()
  const inTwoHours = now + 2 * 60 * 60 * 1000
  const windowStart = now + 1.5 * 60 * 60 * 1000
  const windowEnd = inTwoHours + 30 * 60 * 1000

  const reservations = await Reservation.find({
    status: 'confirmed',
    reminderSentAt: null,
  })
    .populate('creneauId')
    .populate('userId', 'firstName phone')
    .populate('moniteurId', 'firstName lastName')

  let sent = 0
  for (const reservation of reservations) {
    if (!reservation.creneauId || !reservation.userId) continue
    const start = slotDateTime(
      reservation.creneauId.date,
      reservation.creneauId.startTime,
    ).getTime()
    if (start < windowStart || start > windowEnd) continue

    // Claim d’abord : un second tick concurrent ne renvoie pas le message.
    const claimed = await Reservation.findOneAndUpdate(
      { _id: reservation._id, reminderSentAt: null },
      { $set: { reminderSentAt: new Date() } },
      { new: true },
    )
    if (!claimed) continue

    const moniteurName = reservation.moniteurId
      ? `${reservation.moniteurId.firstName} ${reservation.moniteurId.lastName}`.trim()
      : ''
    const body = formatReservationReminder({
      firstName: reservation.userId.firstName,
      date: reservation.creneauId.date,
      startTime: reservation.creneauId.startTime,
      moniteurName,
    })
    await sendWhatsAppMessage({ to: reservation.userId.phone, body })
    sent += 1
  }

  return { sent }
}
