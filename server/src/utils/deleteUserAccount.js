import { AccessAuditLog } from '../models/AccessAuditLog.js'
import { AccessRequest } from '../models/AccessRequest.js'
import { Creneau } from '../models/Creneau.js'
import { ECodePermisExamAttempt } from '../models/ECodePermisExamAttempt.js'
import { Notification } from '../models/Notification.js'
import { Payment } from '../models/Payment.js'
import { PracticeExamAttempt } from '../models/PracticeExamAttempt.js'
import { PromoCodeRedemption } from '../models/PromoCodeRedemption.js'
import { Reservation } from '../models/Reservation.js'
import { User } from '../models/User.js'

/**
 * Libère les créneaux réservés / verrouillés, annule les réservations actives,
 * nettoie tentatives d’examens / promos / accès, puis supprime l’utilisateur.
 * Conserve l’historique des réservations completed/cancelled (userId orphelin OK en Mongo).
 */
export async function deleteUserAccount(userId, { cancelledBy = 'learner' } = {}) {
  const id = userId

  await Creneau.updateMany(
    { lockedBy: id },
    { $set: { lockedUntil: null, lockedBy: null } },
  )

  const activeReservations = await Reservation.find({
    userId: id,
    status: { $in: ['pending_payment', 'confirmed'] },
  })

  for (const reservation of activeReservations) {
    reservation.status = 'cancelled'
    reservation.cancelledAt = new Date()
    reservation.cancellationReason = 'Compte utilisateur supprimé'
    reservation.cancelledBy = cancelledBy
    if (reservation.paymentStatus === 'pending_validation') {
      reservation.paymentStatus = 'unpaid'
    }
    await reservation.save()

    if (reservation.creneauId) {
      await Creneau.findByIdAndUpdate(reservation.creneauId, {
        status: 'libre',
        lockedUntil: null,
        lockedBy: null,
      })
    }
  }

  const accessRequestIds = await AccessRequest.find({ userId: id }).distinct('_id')

  await Promise.all([
    PracticeExamAttempt.deleteMany({ userId: id }),
    ECodePermisExamAttempt.deleteMany({ userId: id }),
    PromoCodeRedemption.deleteMany({ userId: id }),
    Notification.deleteMany({ userId: id }),
    AccessAuditLog.deleteMany({ accessRequestId: { $in: accessRequestIds } }),
    Payment.deleteMany({ userId: id }),
    AccessRequest.deleteMany({ userId: id }),
  ])

  await User.findByIdAndDelete(id)

  return {
    cancelledReservations: activeReservations.length,
  }
}
