import { Reservation } from '../models/Reservation.js'
import { Creneau } from '../models/Creneau.js'
import { User } from '../models/User.js'
import { computeCreneauHeures } from './creneauDuration.js'
import { logger } from './logger.js'

/** Délai après la fin du créneau avant auto-complétion (admin oubli « completed »). */
const COMPLETE_GRACE_MS = 30 * 60 * 1000

function slotDateTime(date, time) {
  return new Date(`${date}T${time}:00`)
}

/**
 * Incrémente heuresEffectuees (et solde si ancien flux heuresDebitees=0).
 * À appeler uniquement lors d’une transition confirmed → completed.
 */
export async function creditHeuresEffectueesForCompletion(reservation) {
  if (!reservation?.userId) return { heures: 0 }

  if (reservation.heuresDebitees > 0) {
    await User.findByIdAndUpdate(reservation.userId, {
      $inc: { heuresEffectuees: reservation.heuresDebitees },
    })
    return { heures: reservation.heuresDebitees }
  }

  const creneau = reservation.creneauId
    ? reservation.creneauId.startTime
      ? reservation.creneauId
      : await Creneau.findById(reservation.creneauId)
    : null
  const heures = computeCreneauHeures(creneau)
  await User.findByIdAndUpdate(reservation.userId, {
    $inc: { heuresEffectuees: heures, soldeHeures: -heures },
  })
  logger.info('Heures auto-incrémentées (ancien flux)', {
    userId: String(reservation.userId),
    heures,
  })
  return { heures }
}

/**
 * Marque les réservations confirmées + payées dont le créneau est passé (+ grâce)
 * comme completed, et crédite heuresEffectuees. Idempotent via claim atomique du statut.
 */
export async function completePastConfirmedReservations() {
  const reservations = await Reservation.find({
    status: 'confirmed',
    paymentStatus: 'paid',
  }).populate('creneauId')

  const now = Date.now()
  let completed = 0

  for (const reservation of reservations) {
    const creneau = reservation.creneauId
    if (!creneau?.date || !creneau?.endTime) continue

    const endAt = slotDateTime(creneau.date, creneau.endTime).getTime()
    if (Number.isNaN(endAt) || now < endAt + COMPLETE_GRACE_MS) continue

    const updated = await Reservation.findOneAndUpdate(
      { _id: reservation._id, status: 'confirmed' },
      { $set: { status: 'completed' } },
      { new: true },
    )
    if (!updated) continue

    try {
      await creditHeuresEffectueesForCompletion({
        ...updated.toObject(),
        creneauId: creneau,
      })
      completed += 1
    } catch (error) {
      // Rollback statut pour retenter au prochain tick
      await Reservation.findByIdAndUpdate(updated._id, { $set: { status: 'confirmed' } })
      logger.error('Auto-complétion réservation échouée', {
        reservationId: String(updated._id),
        error: error.message,
      })
    }
  }

  return { completed }
}
