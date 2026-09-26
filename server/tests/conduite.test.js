// QA — conduite : moniteurs, disponibilités, verrou concurrent,
// réservation solde, refus, annulation + recrédit.
import { describe, expect, it } from 'vitest'
import { api, useQaWorld } from './helpers/world.mjs'
import { models } from './helpers/db.mjs'
import {
  QA_PASSWORD,
  seedLearner,
  grantConduiteHours,
  seedMoniteur,
  seedCreneaux,
} from './helpers/seed.mjs'

useQaWorld()

let MONITEUR_ID = ''
let TOKEN_A = ''
let TOKEN_B = ''
let TOKEN_C = ''

async function loginAs(email) {
  const { status, json } = await api('/api/auth/login', {
    method: 'POST',
    body: { identifier: email, password: QA_PASSWORD, client: 'mobile' },
  })
  expect(status).toBe(200)
  return json.data.token
}

async function setup() {
  if (MONITEUR_ID) return
  const moniteur = await seedMoniteur({})
  MONITEUR_ID = String(moniteur._id)
  await seedCreneaux(moniteur._id, 7)
  await seedLearner({ email: 'qa.drive.a@test.local', phone: '0100000021' })
  await seedLearner({ email: 'qa.drive.b@test.local', phone: '0100000022' })
  await seedLearner({ email: 'qa.drive.c@test.local', phone: '0100000023' })
  const { User } = models
  await grantConduiteHours((await User.findOne({ email: 'qa.drive.a@test.local' }))._id, 2)
  await grantConduiteHours((await User.findOne({ email: 'qa.drive.b@test.local' }))._id, 2)
  TOKEN_A = await loginAs('qa.drive.a@test.local')
  TOKEN_B = await loginAs('qa.drive.b@test.local')
  TOKEN_C = await loginAs('qa.drive.c@test.local')
}

function dateLabel(offsetDays) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

describe('catalogue', () => {
  it('liste les moniteurs et leurs disponibilités', async () => {
    await setup()
    const list = await api('/api/reservations/moniteurs', { token: TOKEN_A })
    expect(list.status).toBe(200)
    expect(list.json.data.moniteurs.map((m) => String(m.id))).toContain(MONITEUR_ID)

    const avail = await api(`/api/reservations/availability?moniteurId=${MONITEUR_ID}`, {
      token: TOKEN_A,
    })
    expect(avail.status).toBe(200)
    expect(avail.json.data.days.length).toBeGreaterThan(0)
  })

  it('moniteur inexistant → 404', async () => {
    await setup()
    const { status } = await api(
      '/api/reservations/availability?moniteurId=000000000000000000000000',
      { token: TOKEN_A },
    )
    expect([400, 404]).toContain(status)
  })
})

describe('verrou concurrent', () => {
  it('2 locks simultanés → un seul gagne (200 + 409)', async () => {
    await setup()
    const { Creneau } = models
    const slot = await Creneau.findOne({ moniteurId: MONITEUR_ID, date: dateLabel(3) })
    expect(slot).toBeTruthy()
    const [r1, r2] = await Promise.all([
      api(`/api/reservations/creneaux/${slot._id}/lock`, { method: 'POST', token: TOKEN_A }),
      api(`/api/reservations/creneaux/${slot._id}/lock`, { method: 'POST', token: TOKEN_B }),
    ])
    expect([r1.status, r2.status].sort()).toEqual([200, 409])
  })
})

describe('réservation', () => {
  it('request-slot + create solde : solde débité, créneau réservé', async () => {
    await setup()
    const before = await api('/api/reservations/dashboard', { token: TOKEN_A })
    const soldeBefore = before.json.data.progress.soldeHeures

    const req = await api('/api/reservations/request-slot', {
      method: 'POST',
      token: TOKEN_A,
      body: {
        moniteurId: MONITEUR_ID,
        date: dateLabel(4),
        startTime: '08:00',
        endTime: '09:00',
        vehicleType: 'voiture',
      },
    })
    expect([200, 201]).toContain(req.status)
    const creneauId = String(req.json.data.creneau.id || req.json.data.creneau._id)

    const created = await api('/api/reservations/reservations', {
      method: 'POST',
      token: TOKEN_A,
      body: { creneauIds: [creneauId], moniteurId: MONITEUR_ID, paymentMethod: 'solde' },
    })
    expect([200, 201]).toContain(created.status)

    const after = await api('/api/reservations/dashboard', { token: TOKEN_A })
    expect(after.json.data.progress.soldeHeures).toBe(soldeBefore - 1)

    const { Creneau } = models
    const slot = await Creneau.findById(creneauId)
    expect(slot.status).toBe('reserve')
  })

  it('solde 0 → 403 INSUFFICIENT_HOURS', async () => {
    await setup()
    const req = await api('/api/reservations/request-slot', {
      method: 'POST',
      token: TOKEN_C,
      body: {
        moniteurId: MONITEUR_ID,
        date: dateLabel(5),
        startTime: '08:00',
        endTime: '09:00',
        vehicleType: 'voiture',
      },
    })
    expect([200, 201]).toContain(req.status)
    const creneauId = String(req.json.data.creneau.id || req.json.data.creneau._id)
    const created = await api('/api/reservations/reservations', {
      method: 'POST',
      token: TOKEN_C,
      body: { creneauIds: [creneauId], moniteurId: MONITEUR_ID, paymentMethod: 'solde' },
    })
    expect(created.status).toBe(403)
    expect(created.json.code).toBe('INSUFFICIENT_HOURS')
  })

  it('date passée refusée (400)', async () => {
    await setup()
    const { status } = await api('/api/reservations/request-slot', {
      method: 'POST',
      token: TOKEN_A,
      body: {
        moniteurId: MONITEUR_ID,
        date: dateLabel(-2),
        startTime: '08:00',
        endTime: '09:00',
        vehicleType: 'voiture',
      },
    })
    expect(status).toBe(400)
  })
})

describe('annulation', () => {
  it('annule + recrédite + libère, autrui 404', async () => {
    await setup()
    const mine = await api('/api/reservations/mine', { token: TOKEN_A })
    const resa = mine.json.data.reservations?.[0] || mine.json.data[0]
    expect(resa).toBeTruthy()
    const resaId = String(resa.id || resa._id)

    const other = await api(`/api/reservations/reservations/${resaId}/cancel`, {
      method: 'POST',
      token: TOKEN_B,
      body: { reason: 'Tentative annulation par autrui' },
    })
    expect(other.status).toBe(404)

    const before = await api('/api/reservations/dashboard', { token: TOKEN_A })
    const soldeBefore = before.json.data.progress.soldeHeures
    const cancelled = await api(`/api/reservations/reservations/${resaId}/cancel`, {
      method: 'POST',
      token: TOKEN_A,
      body: { reason: 'Empêchement de dernière minute QA' },
    })
    expect(cancelled.status).toBe(200)

    const after = await api('/api/reservations/dashboard', { token: TOKEN_A })
    expect(after.json.data.progress.soldeHeures).toBe(soldeBefore + 1)

    const { Creneau } = models
    const slot = await Creneau.findById(resa.creneauId || resa.creneau?.id)
    if (slot) expect(slot.status).toBe('libre')
  })
})
