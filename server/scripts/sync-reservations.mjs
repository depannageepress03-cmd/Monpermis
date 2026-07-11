/**
 * Synchronise le système de réservation :
 * - normalise vehicleTypes / vehicleType
 * - s’assure que chaque moniteur actif a une disponibilité hebdo
 * - génère les créneaux libres sur les N prochains jours
 *
 * Usage: node scripts/sync-reservations.mjs [days=14]
 */
import 'dotenv/config'
import mongoose from 'mongoose'
import { Moniteur } from '../src/models/Moniteur.js'
import { Creneau } from '../src/models/Creneau.js'
import { Reservation } from '../src/models/Reservation.js'
import {
  addLocalDays,
  formatLocalDate,
  normalizeVehicleType,
  parseLocalDate,
} from '../src/utils/localDate.js'

const DEFAULT_AVAILABILITY = [
  { dayOfWeek: 1, start: '08:00', end: '12:00' },
  { dayOfWeek: 1, start: '14:00', end: '18:00' },
  { dayOfWeek: 2, start: '08:00', end: '12:00' },
  { dayOfWeek: 2, start: '14:00', end: '18:00' },
  { dayOfWeek: 3, start: '08:00', end: '12:00' },
  { dayOfWeek: 3, start: '14:00', end: '18:00' },
  { dayOfWeek: 4, start: '08:00', end: '12:00' },
  { dayOfWeek: 4, start: '14:00', end: '18:00' },
  { dayOfWeek: 5, start: '08:00', end: '12:00' },
  { dayOfWeek: 5, start: '14:00', end: '18:00' },
]

const SLOT_MINUTES = 60

async function generateForMoniteur(moniteur, fromDate, toDate) {
  const vehicleType = normalizeVehicleType(
    (Array.isArray(moniteur.vehicleTypes) && moniteur.vehicleTypes[0]) || 'voiture',
  )
  const start = parseLocalDate(fromDate)
  const end = parseLocalDate(toDate)
  if (!start || !end) return 0

  let createdCount = 0
  const cursor = new Date(start)
  while (cursor <= end) {
    const dateStr = formatLocalDate(cursor)
    const dayOfWeek = cursor.getDay()
    const windows = (moniteur.weeklyAvailability || []).filter(
      (slot) => slot.dayOfWeek === dayOfWeek,
    )

    for (const window of windows) {
      const [sh, sm] = String(window.start || '08:00').split(':').map(Number)
      const [eh, em] = String(window.end || '18:00').split(':').map(Number)
      let minutes = sh * 60 + (sm || 0)
      const endMinutes = eh * 60 + (em || 0)

      while (minutes + SLOT_MINUTES <= endMinutes) {
        const startH = String(Math.floor(minutes / 60)).padStart(2, '0')
        const startM = String(minutes % 60).padStart(2, '0')
        const endTotal = minutes + SLOT_MINUTES
        const endH = String(Math.floor(endTotal / 60)).padStart(2, '0')
        const endM = String(endTotal % 60).padStart(2, '0')

        try {
          await Creneau.create({
            moniteurId: moniteur._id,
            date: dateStr,
            startTime: `${startH}:${startM}`,
            endTime: `${endH}:${endM}`,
            vehicleType,
            status: 'libre',
            priceFcfa: moniteur.defaultPriceFcfa || 5000,
          })
          createdCount += 1
        } catch {
          // doublon → ignore
        }

        minutes += SLOT_MINUTES
      }
    }

    cursor.setDate(cursor.getDate() + 1)
  }

  return createdCount
}

async function main() {
  const days = Math.max(1, Number(process.argv[2]) || 14)
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('Connecté à MongoDB')

  const moniteurs = await Moniteur.find({})
  console.log(`Moniteurs: ${moniteurs.length}`)

  for (const moniteur of moniteurs) {
    const types = (moniteur.vehicleTypes || [])
      .map((item) => normalizeVehicleType(item, ''))
      .filter(Boolean)
    moniteur.vehicleTypes = types.length ? types : ['voiture']

    if (!Array.isArray(moniteur.weeklyAvailability) || moniteur.weeklyAvailability.length === 0) {
      moniteur.weeklyAvailability = DEFAULT_AVAILABILITY
      console.log(`  ↳ dispo hebdo ajoutée pour ${moniteur.firstName} ${moniteur.lastName}`)
    }

    if (!moniteur.defaultPriceFcfa) moniteur.defaultPriceFcfa = 5000
    await moniteur.save()
  }

  // Normalise les créneaux existants
  const creneaux = await Creneau.find({})
  let normalizedSlots = 0
  for (const slot of creneaux) {
    const next = normalizeVehicleType(slot.vehicleType)
    if (slot.vehicleType !== next) {
      slot.vehicleType = next
      await slot.save()
      normalizedSlots += 1
    }
  }
  if (normalizedSlots) console.log(`Créneaux normalisés: ${normalizedSlots}`)

  const fromDate = formatLocalDate()
  const toDate = addLocalDays(fromDate, days - 1)
  console.log(`Génération créneaux du ${fromDate} au ${toDate}…`)

  let totalCreated = 0
  const active = moniteurs.filter((item) => item.active !== false)
  for (const moniteur of active) {
    const created = await generateForMoniteur(moniteur, fromDate, toDate)
    totalCreated += created
    console.log(
      `✓ ${moniteur.firstName} ${moniteur.lastName} — ${created} nouveau(x) créneau(x)`,
    )
  }

  const today = formatLocalDate()
  const [libre, reserve, totalResa] = await Promise.all([
    Creneau.countDocuments({ status: 'libre', date: { $gte: today } }),
    Creneau.countDocuments({ status: 'reserve', date: { $gte: today } }),
    Reservation.countDocuments({}),
  ])

  console.log('---')
  console.log(`Créneaux créés maintenant: ${totalCreated}`)
  console.log(`Créneaux libres à venir: ${libre}`)
  console.log(`Créneaux réservés à venir: ${reserve}`)
  console.log(`Réservations totales: ${totalResa}`)
  console.log('Sync terminée.')
  await mongoose.disconnect()
}

main().catch(async (error) => {
  console.error(error)
  try {
    await mongoose.disconnect()
  } catch {
    /* ignore */
  }
  process.exit(1)
})
