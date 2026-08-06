import { AccessAuditLog } from '../models/AccessAuditLog.js'
import { AccessRequest } from '../models/AccessRequest.js'
import { Creneau } from '../models/Creneau.js'
import { Notification } from '../models/Notification.js'
import { Payment } from '../models/Payment.js'
import { PracticeExamAttempt } from '../models/PracticeExamAttempt.js'
import { PromoCode } from '../models/PromoCode.js'
import { PromoCodeRedemption } from '../models/PromoCodeRedemption.js'
import { Reservation } from '../models/Reservation.js'
import { User } from '../models/User.js'
import { cancelPendingReservationPayment } from './reservationPayments.js'

export class AccountDeleteBlockedError extends Error {
  constructor(message = 'Un paiement vient d’être confirmé — réessaie dans un instant') {
    super(message)
    this.name = 'AccountDeleteBlockedError'
    this.code = 'PAYMENT_IN_PROGRESS'
  }
}

/**
 * Libère les créneaux réservés / verrouillés, annule les réservations actives,
 * nettoie tentatives d’examens / promos / accès, puis supprime l’utilisateur.
 * Conserve l’historique des réservations completed/cancelled (userId orphelin OK en Mongo).
 *
 * Void les paiements FedaPay encore pending avant suppression, pour éviter qu’un
 * webhook post-suppression confirme un créneau déjà libéré (orphelin / needsRefund).
 * Si un pending est déjà encaissé côté FedaPay → refuse la suppression (race).
 */
export async function deleteUserAccount(userId, { cancelledBy = 'learner' } = {}) {
  const id = userId
  const note = 'Compte utilisateur supprimé'

  // Holds non payés (créneau encore libre mais verrouillé par l’élève).
  await Creneau.updateMany(
    { lockedBy: id },
    { $set: { lockedUntil: null, lockedBy: null } },
  )

  // Void FedaPay avant d’annuler / supprimer, sinon un webhook peut arriver trop tard.
  const pendingPayments = await Payment.find({ userId: id, status: 'pending' })
  for (const payment of pendingPayments) {
    const result = await cancelPendingReservationPayment(payment, note)
    if (result.paidAlready) {
      throw new AccountDeleteBlockedError()
    }
  }

  const activeReservations = await Reservation.find({
    userId: id,
    status: { $in: ['pending_payment', 'pending_moniteur', 'confirmed'] },
  })

  for (const reservation of activeReservations) {
    reservation.status = 'cancelled'
    reservation.cancelledAt = new Date()
    reservation.cancellationReason = note
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
  const redemptions = await PromoCodeRedemption.find({ userId: id }).select('promoCodeId')

  await Promise.all(
    redemptions.map((redemption) =>
      PromoCode.updateOne(
        { _id: redemption.promoCodeId, usesCount: { $gt: 0 } },
        { $inc: { usesCount: -1 } },
      ),
    ),
  )

  await Promise.all([
    PracticeExamAttempt.deleteMany({ userId: id }),
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
