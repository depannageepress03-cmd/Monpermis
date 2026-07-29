/**
 * Vide les données opérationnelles (élèves, paiements, résas, etc.) en ne
 * conservant que la toute dernière transaction (Payment) + le strict nécessaire
 * pour qu’elle ne soit pas orpheline (user, accessRequests / réservations liées).
 *
 * Conserve le contenu pédagogique, moniteurs/créneaux (libérés), pricing,
 * comptes admin, codes promo (compteurs remis à 0), annonces.
 *
 *   node scripts/wipe-keep-last-transaction.mjs
 *
 * N’affiche jamais l’URI Mongo ni de secrets / PII.
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import { AccessAuditLog } from '../src/models/AccessAuditLog.js'
import { AccessRequest } from '../src/models/AccessRequest.js'
import { Admin } from '../src/models/Admin.js'
import { Announcement } from '../src/models/Announcement.js'
import { AuditLog } from '../src/models/AuditLog.js'
import { Chapter } from '../src/models/Chapter.js'
import { ConduiteChapter } from '../src/models/ConduiteChapter.js'
import { Creneau } from '../src/models/Creneau.js'
import { ECodePermisExam } from '../src/models/ECodePermisExam.js'
import { ECodePermisExamAttempt } from '../src/models/ECodePermisExamAttempt.js'
import { MediaAsset } from '../src/models/MediaAsset.js'
import { Moniteur } from '../src/models/Moniteur.js'
import { Notification } from '../src/models/Notification.js'
import { Payment } from '../src/models/Payment.js'
import { PracticeExam } from '../src/models/PracticeExam.js'
import { PracticeExamAttempt } from '../src/models/PracticeExamAttempt.js'
import { PromoCode } from '../src/models/PromoCode.js'
import { PromoCodeRedemption } from '../src/models/PromoCodeRedemption.js'
import { Question } from '../src/models/Question.js'
import { Reservation } from '../src/models/Reservation.js'
import { TestSubject } from '../src/models/TestSubject.js'
import { User } from '../src/models/User.js'
import { AccessModulePricing } from '../src/models/AccessModulePricing.js'

function dbHint(uri) {
  if (!uri) return { kind: 'missing', dbName: null }
  const kind = uri.includes('mongodb+srv')
    ? 'mongodb+srv'
    : uri.includes('localhost') || uri.includes('127.0.0.1')
      ? 'local'
      : 'mongodb'
  const match = uri.match(/\/([^/?]+)(\?|$)/)
  return { kind, dbName: match ? match[1] : '(unknown)' }
}

async function countAll() {
  const entries = [
    ['payments', Payment],
    ['users', User],
    ['admins', Admin],
    ['accessRequests', AccessRequest],
    ['accessAuditLogs', AccessAuditLog],
    ['reservations', Reservation],
    ['notifications', Notification],
    ['practiceExamAttempts', PracticeExamAttempt],
    ['ecodepermisExamAttempts', ECodePermisExamAttempt],
    ['promoCodeRedemptions', PromoCodeRedemption],
    ['promoCodes', PromoCode],
    ['auditLogs', AuditLog],
    ['creneaux', Creneau],
    ['creneauxReserve', null],
    ['creneauxLocked', null],
    ['moniteurs', Moniteur],
    ['chapters', Chapter],
    ['conduiteChapters', ConduiteChapter],
    ['questions', Question],
    ['practiceExams', PracticeExam],
    ['ecodepermisExams', ECodePermisExam],
    ['testSubjects', TestSubject],
    ['accessModulePricing', AccessModulePricing],
    ['announcements', Announcement],
    ['mediaAssets', MediaAsset],
  ]

  const out = {}
  for (const [key, Model] of entries) {
    if (key === 'creneauxReserve') {
      out[key] = await Creneau.countDocuments({ status: 'reserve' })
    } else if (key === 'creneauxLocked') {
      out[key] = await Creneau.countDocuments({
        $or: [{ lockedBy: { $ne: null } }, { lockedUntil: { $ne: null } }],
      })
    } else {
      out[key] = await Model.countDocuments()
    }
  }
  return out
}

function printCounts(label, counts) {
  console.log(`\n=== ${label} ===`)
  for (const [k, v] of Object.entries(counts)) {
    console.log(`  ${k}: ${v}`)
  }
}

function linkedAccessIds(payment) {
  const ids = []
  if (Array.isArray(payment.accessRequestIds)) {
    for (const id of payment.accessRequestIds) {
      if (id) ids.push(id)
    }
  }
  if (payment.accessRequestId) ids.push(payment.accessRequestId)
  // unique by string
  const seen = new Set()
  return ids.filter((id) => {
    const s = String(id)
    if (seen.has(s)) return false
    seen.add(s)
    return true
  })
}

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('MONGODB_URI manquant')
    process.exit(1)
  }

  const hint = dbHint(uri)
  console.log(`Connexion Mongo (${hint.kind}, db=${hint.dbName})…`)
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 20000 })

  const before = await countAll()
  printCounts('BEFORE', before)

  // Latest transaction: prefer activatedAt when set, else createdAt
  const lastPayment = await Payment.findOne({})
    .sort({ createdAt: -1 })
    .lean()

  if (!lastPayment) {
    console.log('\nAucun paiement trouvé — nettoyage opérationnel sans conservation de transaction.')
  } else {
    console.log('\n=== LAST TRANSACTION (kept) ===')
    console.log(`  id: ${lastPayment._id}`)
    console.log(`  status: ${lastPayment.status}`)
    console.log(`  method: ${lastPayment.method}`)
    console.log(`  amount: ${lastPayment.amount} ${lastPayment.currency || 'XOF'}`)
    console.log(`  createdAt: ${lastPayment.createdAt?.toISOString?.() || lastPayment.createdAt}`)
    console.log(
      `  activatedAt: ${lastPayment.activatedAt ? new Date(lastPayment.activatedAt).toISOString() : null}`,
    )
    console.log(`  userId: ${lastPayment.userId}`)
    console.log(`  reservationGroupId: ${lastPayment.reservationGroupId || null}`)
    console.log(`  linkedAccessRequests: ${linkedAccessIds(lastPayment).length}`)
  }

  const keepPaymentId = lastPayment?._id || null
  const keepUserId = lastPayment?.userId || null
  const keepAccessIds = lastPayment ? linkedAccessIds(lastPayment) : []
  const keepReservationGroupId = lastPayment?.reservationGroupId || null

  let keepReservationIds = []
  if (keepReservationGroupId) {
    keepReservationIds = await Reservation.find({ bookingGroupId: keepReservationGroupId }).distinct(
      '_id',
    )
  }

  const keepCreneauIds =
    keepReservationIds.length > 0
      ? await Reservation.find({ _id: { $in: keepReservationIds } }).distinct('creneauId')
      : []

  const deleted = {}

  // 1) Free créneaux (except those still needed by kept reservations)
  const freeFilter =
    keepCreneauIds.length > 0
      ? { _id: { $nin: keepCreneauIds } }
      : {}
  const freed = await Creneau.updateMany(freeFilter, {
    $set: { status: 'libre', lockedUntil: null, lockedBy: null },
  })
  deleted.creneauxFreedOrCleared = freed.modifiedCount

  if (keepCreneauIds.length > 0) {
    const reserved = await Creneau.updateMany(
      { _id: { $in: keepCreneauIds } },
      { $set: { status: 'reserve', lockedUntil: null, lockedBy: null } },
    )
    deleted.creneauxKeptReserve = reserved.modifiedCount
  } else {
    deleted.creneauxKeptReserve = 0
  }

  // 2) Reservations
  const resFilter =
    keepReservationIds.length > 0
      ? { _id: { $nin: keepReservationIds } }
      : {}
  deleted.reservations = (await Reservation.deleteMany(resFilter)).deletedCount

  // 3) Payments (keep last only)
  deleted.payments = (
    await Payment.deleteMany(keepPaymentId ? { _id: { $ne: keepPaymentId } } : {})
  ).deletedCount

  // 4) Access audit logs then access requests
  if (keepAccessIds.length > 0) {
    deleted.accessAuditLogs = (
      await AccessAuditLog.deleteMany({ accessRequestId: { $nin: keepAccessIds } })
    ).deletedCount
    deleted.accessRequests = (
      await AccessRequest.deleteMany({ _id: { $nin: keepAccessIds } })
    ).deletedCount
  } else {
    deleted.accessAuditLogs = (await AccessAuditLog.deleteMany({})).deletedCount
    deleted.accessRequests = (await AccessRequest.deleteMany({})).deletedCount
  }

  // 5) Learner activity
  deleted.notifications = (await Notification.deleteMany({})).deletedCount
  deleted.practiceExamAttempts = (await PracticeExamAttempt.deleteMany({})).deletedCount
  deleted.ecodepermisExamAttempts = (await ECodePermisExamAttempt.deleteMany({})).deletedCount
  deleted.promoCodeRedemptions = (await PromoCodeRedemption.deleteMany({})).deletedCount
  deleted.auditLogs = (await AuditLog.deleteMany({})).deletedCount

  // Reset promo usage counters (codes kept)
  const promoReset = await PromoCode.updateMany({}, { $set: { usesCount: 0 } })
  deleted.promoCodesUsesReset = promoReset.modifiedCount

  // 6) Users — keep payer only; reset their progress/hours to a clean account state
  //    but preserve identity so the payment FK stays valid.
  if (keepUserId) {
    deleted.users = (await User.deleteMany({ _id: { $ne: keepUserId } })).deletedCount
    await User.updateOne(
      { _id: keepUserId },
      {
        $set: {
          completedCourses: [],
          courseSessions: [],
          completedTests: [],
          emailVerificationToken: undefined,
          emailVerificationExpires: undefined,
          passwordResetToken: undefined,
          passwordResetExpires: undefined,
        },
        // Keep soldeHeures / heuresEffectuees if linked access credited hours —
        // recompute from kept access requests for conduite_heures when possible.
      },
    )

    const hoursAccess = await AccessRequest.find({
      _id: { $in: keepAccessIds },
      module: 'conduite_heures',
      status: { $in: ['valide', 'actif'] },
      hoursCredited: true,
    }).lean()
    const creditedHours = hoursAccess.reduce((sum, ar) => sum + (Number(ar.quantity) || 0), 0)
    // Reservations kept may have debited hours — leave solde as-is if we can't safely recompute.
    // Prefer: set solde to credited hours minus heuresDebitees on kept reservations.
    const debited = await Reservation.aggregate([
      { $match: { _id: { $in: keepReservationIds } } },
      { $group: { _id: null, total: { $sum: '$heuresDebitees' } } },
    ])
    const heuresDebitees = debited[0]?.total || 0
    if (hoursAccess.length > 0 || keepReservationIds.length > 0) {
      await User.updateOne(
        { _id: keepUserId },
        {
          $set: {
            soldeHeures: Math.max(0, creditedHours - heuresDebitees),
            heuresEffectuees: 0,
          },
        },
      )
    } else {
      await User.updateOne(
        { _id: keepUserId },
        { $set: { soldeHeures: 0, heuresEffectuees: 0 } },
      )
    }
  } else {
    deleted.users = (await User.deleteMany({})).deletedCount
  }

  // 7) Orphan sweep — dangling refs after deletes
  const orphans = {}

  const allUserIdList = await User.find({}).distinct('_id')
  const allUserIds = new Set(allUserIdList.map(String))

  // Access requests pointing at missing users (should only be keep user)
  const orphanAccess = await AccessRequest.find({}).select('_id userId').lean()
  const orphanAccessIds = orphanAccess
    .filter((ar) => !allUserIds.has(String(ar.userId)))
    .map((ar) => ar._id)
  if (orphanAccessIds.length) {
    orphans.accessRequestsMissingUser = (
      await AccessRequest.deleteMany({ _id: { $in: orphanAccessIds } })
    ).deletedCount
    await AccessAuditLog.deleteMany({ accessRequestId: { $in: orphanAccessIds } })
  } else {
    orphans.accessRequestsMissingUser = 0
  }

  // Payments pointing at missing users
  const orphanPayments = await Payment.find({}).select('_id userId').lean()
  const orphanPaymentIds = orphanPayments
    .filter((p) => !allUserIds.has(String(p.userId)))
    .map((p) => p._id)
  orphans.paymentsMissingUser = orphanPaymentIds.length
    ? (await Payment.deleteMany({ _id: { $in: orphanPaymentIds } })).deletedCount
    : 0

  // Reservations pointing at missing users or missing creneaux
  const allCreneauIds = new Set((await Creneau.find({}).distinct('_id')).map(String))
  const orphanRes = await Reservation.find({}).select('_id userId creneauId').lean()
  const orphanResIds = orphanRes
    .filter(
      (r) => !allUserIds.has(String(r.userId)) || !allCreneauIds.has(String(r.creneauId)),
    )
    .map((r) => r._id)
  orphans.reservationsMissingRefs = orphanResIds.length
    ? (await Reservation.deleteMany({ _id: { $in: orphanResIds } })).deletedCount
    : 0

  // Access audit logs for missing access requests
  const allAccessIds = new Set((await AccessRequest.find({}).distinct('_id')).map(String))
  const orphanAudits = await AccessAuditLog.find({}).select('_id accessRequestId').lean()
  const orphanAuditIds = orphanAudits
    .filter((a) => a.accessRequestId && !allAccessIds.has(String(a.accessRequestId)))
    .map((a) => a._id)
  orphans.accessAuditLogsMissingRequest = orphanAuditIds.length
    ? (await AccessAuditLog.deleteMany({ _id: { $in: orphanAuditIds } })).deletedCount
    : 0

  // Notifications for missing users
  orphans.notificationsMissingUser =
    allUserIdList.length > 0
      ? (await Notification.deleteMany({ userId: { $nin: allUserIdList } })).deletedCount
      : (await Notification.deleteMany({})).deletedCount

  // Promo redemptions leftover (should already be empty)
  orphans.promoRedemptionsLeftover = (await PromoCodeRedemption.deleteMany({})).deletedCount

  // Creneaux still locked by missing users
  const stillLocked = await Creneau.find({ lockedBy: { $ne: null } }).select('_id lockedBy').lean()
  const badLocks = stillLocked.filter((c) => !allUserIds.has(String(c.lockedBy))).map((c) => c._id)
  if (badLocks.length) {
    await Creneau.updateMany(
      { _id: { $in: badLocks } },
      { $set: { lockedBy: null, lockedUntil: null } },
    )
  }
  orphans.creneauLocksCleared = badLocks.length

  // Creneaux marked reserve without an active reservation
  const activeResCreneaux = new Set(
    (
      await Reservation.find({
        status: { $in: ['pending_payment', 'confirmed'] },
      }).distinct('creneauId')
    ).map(String),
  )
  const falselyReserved = await Creneau.find({ status: 'reserve' }).select('_id').lean()
  const toFree = falselyReserved
    .filter((c) => !activeResCreneaux.has(String(c._id)))
    .map((c) => c._id)
  if (toFree.length) {
    await Creneau.updateMany(
      { _id: { $in: toFree } },
      { $set: { status: 'libre', lockedBy: null, lockedUntil: null } },
    )
  }
  orphans.creneauxFalselyReservedFreed = toFree.length

  console.log('\n=== DELETED / UPDATED ===')
  for (const [k, v] of Object.entries(deleted)) {
    console.log(`  ${k}: ${v}`)
  }
  console.log('\n=== ORPHANS CLEANED ===')
  for (const [k, v] of Object.entries(orphans)) {
    console.log(`  ${k}: ${v}`)
  }

  const after = await countAll()
  printCounts('AFTER', after)

  console.log('\n=== KEPT (content / structure) ===')
  console.log('  admins, moniteurs, creneaux (structure), chapters, conduiteChapters,')
  console.log('  questions, practiceExams, ecodepermisExams, testSubjects,')
  console.log('  accessModulePricing, promoCodes (usesCount=0), announcements, mediaAssets')
  if (keepPaymentId) {
    console.log(`  last payment ${keepPaymentId}`)
    console.log(`  user ${keepUserId}`)
    console.log(`  accessRequests kept: ${keepAccessIds.length}`)
    console.log(`  reservations kept: ${keepReservationIds.length}`)
  }

  await mongoose.disconnect()
  console.log('\nDone.')
}

main().catch(async (err) => {
  console.error('Échec:', err.message || err)
  try {
    await mongoose.disconnect()
  } catch {
    /* ignore */
  }
  process.exit(1)
})
