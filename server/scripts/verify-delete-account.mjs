/**
 * Vérifie la cascade deleteUserAccount contre Mongo (local ou Atlas).
 * Crée un utilisateur jetable + créneaux / résas / locks / examens / promo / accès,
 * appelle deleteUserAccount, assert le nettoyage, puis nettoie les artefacts moniteur.
 *
 *   node scripts/verify-delete-account.mjs
 *
 * N’affiche jamais l’URI Mongo ni de secrets.
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import { AccessAuditLog } from '../src/models/AccessAuditLog.js'
import { AccessRequest } from '../src/models/AccessRequest.js'
import { Creneau } from '../src/models/Creneau.js'
import { ECodePermisExamAttempt } from '../src/models/ECodePermisExamAttempt.js'
import { Moniteur } from '../src/models/Moniteur.js'
import { Notification } from '../src/models/Notification.js'
import { Payment } from '../src/models/Payment.js'
import { PracticeExamAttempt } from '../src/models/PracticeExamAttempt.js'
import { PromoCode } from '../src/models/PromoCode.js'
import { PromoCodeRedemption } from '../src/models/PromoCodeRedemption.js'
import { Reservation } from '../src/models/Reservation.js'
import { User } from '../src/models/User.js'
import { deleteUserAccount } from '../src/utils/deleteUserAccount.js'

const EMAIL = `delete-verify-${Date.now()}@test.local`
const results = []

function check(label, ok, detail = '') {
  results.push({ label, ok, detail })
  console.log(`${ok ? 'OK  ' : 'KO  '} ${label}${detail ? ` — ${detail}` : ''}`)
}

function localDate(offsetDays = 2) {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI manquant — skip')
    process.exit(1)
  }

  const uriHint =
    process.env.MONGODB_URI.includes('localhost') || process.env.MONGODB_URI.includes('127.0.0.1')
      ? 'local'
      : 'remote'
  console.log(`Connexion Mongo (${uriHint})…`)

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 })

  let user
  let moniteur
  let promo
  let holdCreneau
  let pendingCreneau
  let confirmedCreneau
  let completedCreneau
  let pendingRes
  let confirmedRes
  let completedRes

  try {
    user = await User.create({
      email: EMAIL,
      firstName: 'Delete',
      lastName: 'Verify',
      phone: '',
      password: 'Test1234Aa',
      authProvider: 'local',
      isEmailVerified: true,
      isActive: true,
      soldeHeures: 1,
    })

    moniteur = await Moniteur.create({
      firstName: 'Delete',
      lastName: 'VerifyMoniteur',
      phone: `0199${String(Date.now()).slice(-6)}`,
      city: 'Cotonou',
      vehicleTypes: ['voiture'],
      weeklyAvailability: [{ dayOfWeek: 1, start: '08:00', end: '18:00' }],
      defaultPriceFcfa: 5000,
      active: true,
    })

    const date = localDate(3)
    holdCreneau = await Creneau.create({
      moniteurId: moniteur._id,
      date,
      startTime: '08:00',
      endTime: '09:00',
      status: 'libre',
      lockedBy: user._id,
      lockedUntil: new Date(Date.now() + 15 * 60 * 1000),
      priceFcfa: 5000,
    })
    pendingCreneau = await Creneau.create({
      moniteurId: moniteur._id,
      date,
      startTime: '09:00',
      endTime: '10:00',
      status: 'reserve',
      priceFcfa: 5000,
    })
    confirmedCreneau = await Creneau.create({
      moniteurId: moniteur._id,
      date,
      startTime: '10:00',
      endTime: '11:00',
      status: 'reserve',
      priceFcfa: 5000,
    })
    completedCreneau = await Creneau.create({
      moniteurId: moniteur._id,
      date,
      startTime: '11:00',
      endTime: '12:00',
      status: 'reserve',
      priceFcfa: 5000,
    })

    const groupId = new mongoose.Types.ObjectId()
    pendingRes = await Reservation.create({
      userId: user._id,
      moniteurId: moniteur._id,
      creneauId: pendingCreneau._id,
      status: 'pending_payment',
      paymentStatus: 'pending_validation',
      bookingGroupId: groupId,
      priceFcfa: 5000,
    })
    confirmedRes = await Reservation.create({
      userId: user._id,
      moniteurId: moniteur._id,
      creneauId: confirmedCreneau._id,
      status: 'confirmed',
      paymentStatus: 'paid',
      priceFcfa: 5000,
      heuresDebitees: 1,
    })
    completedRes = await Reservation.create({
      userId: user._id,
      moniteurId: moniteur._id,
      creneauId: completedCreneau._id,
      status: 'completed',
      paymentStatus: 'paid',
      priceFcfa: 5000,
    })

    await Payment.create({
      userId: user._id,
      method: 'manual',
      amount: 5000,
      status: 'pending',
      reservationGroupId: groupId,
      declaredReference: 'VERIFY-DELETE',
    })

    const access = await AccessRequest.create({
      userId: user._id,
      module: 'code',
      status: 'actif',
      quantity: 1,
      amount: 10000,
      unit: 'month',
      startAt: new Date(),
      endAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })
    await AccessAuditLog.create({
      accessRequestId: access._id,
      fromStatus: '',
      toStatus: 'actif',
      actor: 'system',
      note: 'verify-delete',
    })

    await Notification.create({
      userId: user._id,
      type: 'general',
      title: 'Test',
      body: 'verify delete',
    })
    const fakeExamId = new mongoose.Types.ObjectId()
    await PracticeExamAttempt.create({
      userId: user._id,
      examId: fakeExamId,
      examNumber: 1,
      status: 'completed',
      correct: 30,
      total: 40,
    })
    await ECodePermisExamAttempt.create({
      userId: user._id,
      examId: fakeExamId,
      examNumber: 1,
      status: 'completed',
      correct: 30,
      total: 40,
    })

    promo = await PromoCode.create({
      code: `DEL${String(Date.now()).slice(-8)}`,
      modules: ['code'],
      durationQuantity: 1,
      durationUnit: 'month',
      usesCount: 1,
      active: true,
    })
    await PromoCodeRedemption.create({
      promoCodeId: promo._id,
      userId: user._id,
    })

    const { cancelledReservations } = await deleteUserAccount(user._id, { cancelledBy: 'learner' })
    check('cancelledReservations = 2', cancelledReservations === 2, String(cancelledReservations))

    const userGone = !(await User.findById(user._id))
    check('User supprimé', userGone)

    const hold = await Creneau.findById(holdCreneau._id)
    check(
      'Hold unpaid libéré',
      hold?.status === 'libre' && !hold.lockedBy && !hold.lockedUntil,
      `status=${hold?.status} lockedBy=${hold?.lockedBy}`,
    )

    const pendingSlot = await Creneau.findById(pendingCreneau._id)
    check('Créneau pending_payment → libre', pendingSlot?.status === 'libre')

    const confirmedSlot = await Creneau.findById(confirmedCreneau._id)
    check('Créneau confirmed → libre', confirmedSlot?.status === 'libre')

    const completedSlot = await Creneau.findById(completedCreneau._id)
    check(
      'Créneau completed inchangé (historique)',
      completedSlot?.status === 'reserve',
      completedSlot?.status,
    )

    const pendingAfter = await Reservation.findById(pendingRes._id)
    check(
      'Résa pending → cancelled + unpaid',
      pendingAfter?.status === 'cancelled' &&
        pendingAfter?.paymentStatus === 'unpaid' &&
        pendingAfter?.cancelledBy === 'learner',
      `${pendingAfter?.status}/${pendingAfter?.paymentStatus}`,
    )

    const confirmedAfter = await Reservation.findById(confirmedRes._id)
    check('Résa confirmed → cancelled', confirmedAfter?.status === 'cancelled')

    const completedAfter = await Reservation.findById(completedRes._id)
    check('Résa completed conservée', completedAfter?.status === 'completed')

    check('Payments effacés', (await Payment.countDocuments({ userId: user._id })) === 0)
    check('AccessRequest effacés', (await AccessRequest.countDocuments({ userId: user._id })) === 0)
    check(
      'AccessAuditLog effacés',
      (await AccessAuditLog.countDocuments({ accessRequestId: access._id })) === 0,
    )
    check('Notifications effacées', (await Notification.countDocuments({ userId: user._id })) === 0)
    check(
      'PracticeExamAttempt effacés',
      (await PracticeExamAttempt.countDocuments({ userId: user._id })) === 0,
    )
    check(
      'ECodePermisExamAttempt effacés',
      (await ECodePermisExamAttempt.countDocuments({ userId: user._id })) === 0,
    )
    check(
      'PromoCodeRedemption effacés',
      (await PromoCodeRedemption.countDocuments({ userId: user._id })) === 0,
    )

    const promoAfter = await PromoCode.findById(promo._id)
    check('Promo usesCount décrémenté', promoAfter?.usesCount === 0, String(promoAfter?.usesCount))

    // Même helper côté admin (cancelledBy).
    const adminUser = await User.create({
      email: `delete-admin-${Date.now()}@test.local`,
      firstName: 'Admin',
      lastName: 'Delete',
      password: 'Test1234Aa',
      authProvider: 'local',
      isEmailVerified: true,
    })
    const adminSlot = await Creneau.create({
      moniteurId: moniteur._id,
      date: localDate(4),
      startTime: '14:00',
      endTime: '15:00',
      status: 'reserve',
      priceFcfa: 5000,
    })
    await Reservation.create({
      userId: adminUser._id,
      moniteurId: moniteur._id,
      creneauId: adminSlot._id,
      status: 'confirmed',
      paymentStatus: 'paid',
      priceFcfa: 5000,
    })
    await deleteUserAccount(adminUser._id, { cancelledBy: 'admin' })
    const adminResa = await Reservation.findOne({ creneauId: adminSlot._id })
    const adminSlotAfter = await Creneau.findById(adminSlot._id)
    check(
      'Admin cascade: cancelledBy=admin + créneau libre',
      adminResa?.status === 'cancelled' &&
        adminResa?.cancelledBy === 'admin' &&
        adminSlotAfter?.status === 'libre',
    )
  } finally {
    if (user?._id) {
      await Promise.all([
        PracticeExamAttempt.deleteMany({ userId: user._id }),
        ECodePermisExamAttempt.deleteMany({ userId: user._id }),
        PromoCodeRedemption.deleteMany({ userId: user._id }),
        Notification.deleteMany({ userId: user._id }),
        Payment.deleteMany({ userId: user._id }),
        AccessRequest.deleteMany({ userId: user._id }),
        Reservation.deleteMany({ userId: user._id }),
        User.deleteOne({ _id: user._id }),
      ])
    }
    if (moniteur?._id) {
      await Creneau.deleteMany({ moniteurId: moniteur._id })
      await Reservation.deleteMany({ moniteurId: moniteur._id })
      await Moniteur.deleteOne({ _id: moniteur._id })
    }
    if (promo?._id) await PromoCode.deleteOne({ _id: promo._id })
    await mongoose.disconnect()
  }

  const failed = results.filter((r) => !r.ok)
  console.log(`\n${results.length - failed.length}/${results.length} checks OK`)
  if (failed.length) {
    process.exit(1)
  }
}

main().catch(async (error) => {
  console.error('Échec script:', error.message)
  try {
    await mongoose.disconnect()
  } catch {
    /* ignore */
  }
  process.exit(1)
})
