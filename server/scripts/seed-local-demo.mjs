/**
 * Jeu de données de démonstration pour tester en local (à ne jamais exécuter en production).
 *
 * Crée : deux apprenants, un moniteur disponible 7j/7, un créneau déjà pris par
 * un autre apprenant, et trois paiements couvrant les états visibles côté admin
 * et dans l'historique (abonnement payé, réservation payée, paiement en attente).
 *
 *   node scripts/seed-local-demo.mjs
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
import { addLocalDays, formatLocalDate } from '../src/utils/localDate.js'
import { computeDrivingAmount } from '../src/utils/pricing.js'

if (process.env.NODE_ENV === 'production') {
  console.error('Refus : ce script est réservé au développement local.')
  process.exit(1)
}

const LEARNER = { email: 'eleve@test.local', password: 'eleve1234' }
const OTHER_LEARNER = { email: 'autre@test.local', password: 'autre1234' }

async function upsertLearner({ email, password }, firstName, lastName, extra = {}) {
  let user = await User.findOne({ email }).select('+password')
  if (!user) {
    user = new User({ email, firstName, lastName, password, ...extra })
  } else {
    user.set({ firstName, lastName, password, ...extra })
  }
  user.isEmailVerified = true
  user.isActive = true
  await user.save()
  return user
}

async function upsertCreneau(moniteurId, date, startTime, endTime, fields) {
  return Creneau.findOneAndUpdate(
    { moniteurId, date, startTime },
    { $set: { moniteurId, date, startTime, endTime, vehicleType: 'voiture', ...fields } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI)
  await ensureReservationIndexes()
  await ensureAccessModulePricing()

  const learner = await upsertLearner(LEARNER, 'Awa', 'Test', {
    phone: '0190000001',
    soldeHeures: 3,
  })
  const other = await upsertLearner(OTHER_LEARNER, 'Bruno', 'Autre', { phone: '0190000002' })

  const weeklyAvailability = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
    dayOfWeek,
    start: '07:00',
    end: '20:00',
  }))

  const moniteur = await Moniteur.findOneAndUpdate(
    { firstName: 'Jean', lastName: 'Koffi' },
    {
      $set: {
        firstName: 'Jean',
        lastName: 'Koffi',
        phone: '0197000000',
        city: 'Cotonou',
        bio: 'Moniteur de démonstration disponible tous les jours de 07:00 à 20:00.',
        vehicleBrand: 'Toyota Corolla',
        vehicleTypes: ['voiture'],
        specialties: ['Boîte manuelle', 'Créneau'],
        weeklyAvailability,
        defaultPriceFcfa: 5000,
        active: true,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )

  const tomorrow = addLocalDays(formatLocalDate(), 1)

  // 1. Créneau occupé par un autre apprenant : doit disparaître des disponibilités.
  const busy = await upsertCreneau(moniteur._id, tomorrow, '10:00', '11:00', {
    status: 'reserve',
    priceFcfa: 5000,
    lockedUntil: null,
    lockedBy: null,
  })
  await Reservation.findOneAndUpdate(
    { creneauId: busy._id },
    {
      $set: {
        userId: other._id,
        moniteurId: moniteur._id,
        creneauId: busy._id,
        vehicleType: 'voiture',
        status: 'confirmed',
        paymentStatus: 'paid',
        paymentRef: 'DEMO-AUTRE-001',
        priceFcfa: 5000,
        bookingGroupId: new mongoose.Types.ObjectId(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )

  // 2. Réservation de 2 h payée en Mobile Money : admin doit voir « Payé (Mobile Money) ».
  const paidGroupId = new mongoose.Types.ObjectId()
  const paidSlots = [
    await upsertCreneau(moniteur._id, tomorrow, '14:00', '15:00', {
      status: 'reserve',
      priceFcfa: 5000,
      lockedUntil: null,
      lockedBy: null,
    }),
    await upsertCreneau(moniteur._id, tomorrow, '15:00', '16:00', {
      status: 'reserve',
      priceFcfa: 5000,
      lockedUntil: null,
      lockedBy: null,
    }),
  ]
  for (const slot of paidSlots) {
    await Reservation.findOneAndUpdate(
      { creneauId: slot._id },
      {
        $set: {
          userId: learner._id,
          moniteurId: moniteur._id,
          creneauId: slot._id,
          vehicleType: 'voiture',
          status: 'confirmed',
          paymentStatus: 'paid',
          paymentRef: 'DEMO-MM-9000',
          priceFcfa: 5000,
          bookingGroupId: paidGroupId,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )
  }
  await Payment.findOneAndUpdate(
    { reservationGroupId: paidGroupId },
    {
      $set: {
        userId: learner._id,
        reservationGroupId: paidGroupId,
        method: 'fedapay',
        amount: computeDrivingAmount(5000, 2),
        currency: 'XOF',
        status: 'approved',
        paymentMethod: 'mtn_open',
        fedapayReference: 'DEMO-MM-9000',
        activatedAt: new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )

  // 3. Réservation d'1 h en attente de validation : admin doit voir « Paiement en attente ».
  const pendingGroupId = new mongoose.Types.ObjectId()
  const pendingSlot = await upsertCreneau(moniteur._id, tomorrow, '17:00', '18:00', {
    status: 'reserve',
    priceFcfa: 5000,
    lockedUntil: null,
    lockedBy: null,
  })
  await Reservation.findOneAndUpdate(
    { creneauId: pendingSlot._id },
    {
      $set: {
        userId: learner._id,
        moniteurId: moniteur._id,
        creneauId: pendingSlot._id,
        vehicleType: 'voiture',
        status: 'pending_payment',
        paymentStatus: 'pending_validation',
        priceFcfa: 5000,
        bookingGroupId: pendingGroupId,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )
  await Payment.findOneAndUpdate(
    { reservationGroupId: pendingGroupId },
    {
      $set: {
        userId: learner._id,
        reservationGroupId: pendingGroupId,
        method: 'fedapay',
        amount: 5000,
        currency: 'XOF',
        status: 'pending',
        paymentMethod: 'moov',
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )

  // 4. Pack de 2 h acheté et payé : vérifie la remise −1000 dans l'historique.
  const packAmount = computeDrivingAmount(5000, 2)
  const pack = await AccessRequest.findOneAndUpdate(
    { userId: learner._id, module: 'conduite_heures', quantity: 2 },
    {
      $set: {
        userId: learner._id,
        module: 'conduite_heures',
        quantity: 2,
        unit: 'hour',
        amount: packAmount,
        currency: 'XOF',
        status: 'valide',
        hoursCredited: true,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )
  await Payment.findOneAndUpdate(
    { accessRequestId: pack._id },
    {
      $set: {
        userId: learner._id,
        accessRequestId: pack._id,
        accessRequestIds: [pack._id],
        method: 'fedapay',
        amount: packAmount,
        currency: 'XOF',
        status: 'approved',
        paymentMethod: 'mtn_open',
        fedapayReference: 'DEMO-PACK-9000',
        activatedAt: new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )

  console.log('Seed de démonstration terminé.')
  console.log(`  Apprenant       : ${LEARNER.email} / ${LEARNER.password} (solde ${learner.soldeHeures} h)`)
  console.log(`  Autre apprenant : ${OTHER_LEARNER.email} / ${OTHER_LEARNER.password}`)
  console.log(`  Moniteur        : Jean Koffi — 5 000 FCFA/h, 07:00–20:00, 7j/7`)
  console.log(`  Demain (${tomorrow}) : 10:00–11:00 pris par un autre, 14:00–16:00 payé, 17:00–18:00 en attente`)
  console.log(`  Pack 2 h payé   : ${packAmount} FCFA (remise −1000 appliquée)`)

  await mongoose.disconnect()
}

main().catch(async (error) => {
  console.error('Seed échoué :', error)
  await mongoose.disconnect().catch(() => {})
  process.exit(1)
})
