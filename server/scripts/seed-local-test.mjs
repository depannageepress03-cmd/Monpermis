/**
 * Jeu de données de test local (jamais destiné à la production) :
 * deux apprenants, un moniteur disponible tous les jours, et des paiements
 * déjà encaissés pour vérifier l'historique côté élève et le suivi côté admin.
 *
 *   node scripts/seed-local-test.mjs
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import { User } from '../src/models/User.js'
import { Moniteur } from '../src/models/Moniteur.js'
import { Creneau } from '../src/models/Creneau.js'
import { Reservation, ensureReservationIndexes } from '../src/models/Reservation.js'
import { Payment } from '../src/models/Payment.js'
import { AccessRequest } from '../src/models/AccessRequest.js'
import { ensureAccessModulePricing } from '../src/utils/accessRequests.js'
import { computeDrivingAmount } from '../src/utils/pricing.js'

const LEARNERS = [
  {
    email: 'eleve@test.local',
    firstName: 'Awa',
    lastName: 'Test',
    phone: '0166000001',
    soldeHeures: 2,
  },
  {
    email: 'autre@test.local',
    firstName: 'Kossi',
    lastName: 'Test',
    phone: '0166000002',
    soldeHeures: 0,
  },
]
const PASSWORD = 'Test1234'

function localDate(offsetDays = 0) {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}

/** Recréé à neuf à chaque exécution : garantit le mot de passe annoncé ci-dessous. */
async function recreateLearner(def) {
  await User.deleteOne({ email: def.email })
  return User.create({
    email: def.email,
    firstName: def.firstName,
    lastName: def.lastName,
    phone: def.phone,
    password: PASSWORD,
    authProvider: 'local',
    isEmailVerified: true,
    isActive: true,
    soldeHeures: def.soldeHeures,
  })
}

async function recreateMoniteur() {
  const weeklyAvailability = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
    dayOfWeek,
    start: '07:00',
    end: '21:00',
  }))
  const payload = {
    firstName: 'Ismaël',
    lastName: 'Moniteur',
    phone: '0166000010',
    city: 'Cotonou',
    bio: 'Moniteur de test local, disponible 7 j/7 de 07:00 à 21:00.',
    vehicleBrand: 'Toyota Corolla',
    vehicleTypes: ['voiture'],
    weeklyAvailability,
    defaultPriceFcfa: 5000,
    active: true,
  }
  const previous = await Moniteur.find({ phone: payload.phone }).select('_id')
  if (previous.length > 0) {
    const ids = previous.map((item) => item._id)
    await Promise.all([
      Reservation.deleteMany({ moniteurId: { $in: ids } }),
      Creneau.deleteMany({ moniteurId: { $in: ids } }),
      Moniteur.deleteMany({ _id: { $in: ids } }),
    ])
  }
  return Moniteur.create(payload)
}

/** Réservation déjà payée : créneau occupé + Reservation + Payment liés. */
async function seedPaidReservation({ user, moniteur, date, startTime, endTime, paid }) {
  const creneau = await Creneau.create({
    moniteurId: moniteur._id,
    date,
    startTime,
    endTime,
    vehicleType: 'voiture',
    status: 'reserve',
    priceFcfa: moniteur.defaultPriceFcfa,
  })
  const bookingGroupId = new mongoose.Types.ObjectId()
  const reference = `DEV-${startTime.replace(':', '')}-${date.replace(/-/g, '')}`

  await Reservation.create({
    userId: user._id,
    moniteurId: moniteur._id,
    creneauId: creneau._id,
    vehicleType: 'voiture',
    status: paid ? 'confirmed' : 'pending_payment',
    paymentStatus: paid ? 'paid' : 'pending_validation',
    paymentRef: reference,
    bookingGroupId,
    priceFcfa: moniteur.defaultPriceFcfa,
  })

  await Payment.create({
    userId: user._id,
    reservationGroupId: bookingGroupId,
    method: 'fedapay',
    amount: moniteur.defaultPriceFcfa,
    status: paid ? 'approved' : 'pending',
    paymentMethod: 'moov',
    fedapayReference: reference,
    fedapayTransactionId: `dev-${bookingGroupId}`,
    activatedAt: paid ? new Date() : null,
  })

  return { creneau, bookingGroupId }
}

/** Pack de 2 h payé : AccessRequest validée + Payment approuvé (remise −1000 incluse). */
async function seedPaidHoursPack(user) {
  const quantity = 2
  const amount = computeDrivingAmount(5000, quantity)
  const request = await AccessRequest.create({
    userId: user._id,
    module: 'conduite_heures',
    status: 'valide',
    quantity,
    unit: 'hour',
    amount,
    hoursCredited: true,
  })
  await Payment.create({
    userId: user._id,
    accessRequestId: request._id,
    accessRequestIds: [request._id],
    method: 'fedapay',
    amount,
    status: 'approved',
    paymentMethod: 'mtn',
    fedapayReference: 'DEV-PACK-2H',
    fedapayTransactionId: `dev-pack-${request._id}`,
    activatedAt: new Date(),
  })
  return { request, amount }
}

async function main() {
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI manquante (server/.env)')
  await mongoose.connect(uri)
  await ensureReservationIndexes()

  const pricing = await ensureAccessModulePricing()

  // Rejoue proprement : on efface uniquement les traces des comptes de test.
  const stale = await User.find({ email: { $in: LEARNERS.map((l) => l.email) } }).select('_id')
  if (stale.length > 0) {
    const staleIds = stale.map((item) => item._id)
    await Promise.all([
      Reservation.deleteMany({ userId: { $in: staleIds } }),
      Payment.deleteMany({ userId: { $in: staleIds } }),
      AccessRequest.deleteMany({ userId: { $in: staleIds } }),
    ])
  }

  const learnerA = await recreateLearner(LEARNERS[0])
  const learnerB = await recreateLearner(LEARNERS[1])
  const moniteur = await recreateMoniteur()

  const tomorrow = localDate(1)
  const pack = await seedPaidHoursPack(learnerA)
  const own = await seedPaidReservation({
    user: learnerA,
    moniteur,
    date: tomorrow,
    startTime: '10:00',
    endTime: '11:00',
    paid: true,
  })
  const other = await seedPaidReservation({
    user: learnerB,
    moniteur,
    date: tomorrow,
    startTime: '09:00',
    endTime: '10:00',
    paid: true,
  })
  const awaiting = await seedPaidReservation({
    user: learnerB,
    moniteur,
    date: tomorrow,
    startTime: '14:00',
    endTime: '15:00',
    paid: false,
  })

  console.log('\n=== Données de test locales ===')
  console.log(`Tarifs modules      : ${pricing.created} créés, ${pricing.migrated} migrés`)
  console.log(`Apprenant principal : ${learnerA.email} / ${PASSWORD} (solde ${learnerA.soldeHeures} h)`)
  console.log(`Autre apprenant     : ${learnerB.email} / ${PASSWORD}`)
  console.log(`Moniteur            : ${moniteur.firstName} ${moniteur.lastName} — 07:00→21:00, 7 j/7`)
  console.log(`Pack 2 h payé       : ${pack.amount} FCFA (remise −1000 appliquée)`)
  console.log(`Séance payée (Awa)  : ${tomorrow} ${own.creneau.startTime}`)
  console.log(`Séance payée (Kossi): ${tomorrow} ${other.creneau.startTime} → doit être masquée pour Awa`)
  console.log(`Séance en attente   : ${tomorrow} ${awaiting.creneau.startTime} (paiement à vérifier côté admin)`)

  await mongoose.disconnect()
}

main().catch(async (error) => {
  console.error('Seed local échoué:', error)
  await mongoose.disconnect().catch(() => {})
  process.exit(1)
})
