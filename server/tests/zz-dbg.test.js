import { describe, expect, it } from 'vitest'
import { api, useQaWorld } from './helpers/world.mjs'
import { models } from './helpers/db.mjs'
import { seedMoniteur, seedCreneaux, seedLearner, grantConduiteHours, QA_PASSWORD } from './helpers/seed.mjs'

useQaWorld()

describe('dbg', () => {
  it('prints', async () => {
    const m = await seedMoniteur({})
    console.log('MONITEUR', String(m._id), 'active=', m.active)
    await seedCreneaux(m._id, 7)
    await seedLearner({ email: 'qa.dbg@test.local', phone: '0100000099' })
    const { User } = models
    await grantConduiteHours((await User.findOne({ email: 'qa.dbg@test.local' }))._id, 2)
    const login = await api('/api/auth/login', { method: 'POST', body: { identifier: 'qa.dbg@test.local', password: QA_PASSWORD, client: 'mobile' } })
    const d = new Date()
    d.setDate(d.getDate() + 4)
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const req = await api('/api/reservations/request-slot', { method: 'POST', token: login.json.data.token, body: { moniteurId: String(m._id), date, startTime: '08:00', endTime: '09:00', vehicleType: 'voiture' } })
    console.log('REQ', req.status, JSON.stringify(req.json))
    expect(true).toBe(true)
  })
})
