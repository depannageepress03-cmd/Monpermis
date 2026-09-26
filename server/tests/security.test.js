// QA — rôles, IDOR, injection NoSQL, CORS, fuite de secrets.
import { describe, expect, it } from 'vitest'
import { api, useQaWorld } from './helpers/world.mjs'
import { models } from './helpers/db.mjs'
import { QA_PASSWORD, seedAdmin, seedLearner, grantCodeAccess, seedCodeContent } from './helpers/seed.mjs'

useQaWorld()

async function learnerToken(email) {
  const { status, json } = await api('/api/auth/login', {
    method: 'POST',
    body: { identifier: email, password: QA_PASSWORD, client: 'mobile' },
  })
  expect(status).toBe(200)
  return json.data.token
}

async function adminToken() {
  await seedAdmin()
  const { status, json } = await api('/api/admin/auth/login', {
    method: 'POST',
    body: { phone: '0199000001', password: QA_PASSWORD },
  })
  expect(status).toBe(200)
  return json.data.token
}

describe('rôles', () => {
  it('apprenant bloqué sur routes admin (401/403)', async () => {
    await seedLearner({ email: 'qa.role@test.local', phone: '0100000011' })
    const token = await learnerToken('qa.role@test.local')
    for (const path of [
      '/api/admin/dashboard/summary',
      '/api/admin/users',
      '/api/admin/revision/chapters',
      '/api/admin/conduite/moniteurs',
    ]) {
      const { status } = await api(path, { token })
      expect([401, 403]).toContain(status)
    }
  })

  it('admin bloqué sur routes apprenant (401/403)', async () => {
    const token = await adminToken()
    const { status } = await api('/api/access-requests/me', { token })
    expect([401, 403]).toContain(status)
  })

  it('superadmin crée un admin, simple admin refusé (403)', async () => {
    const superToken = await adminToken()
    const created = await api('/api/admin/auth/register', {
      method: 'POST',
      token: superToken,
      body: {
        fullName: 'QA Simple',
        phone: '0199000002',
        password: QA_PASSWORD,
        confirmPassword: QA_PASSWORD,
        role: 'admin',
      },
    })
    expect([200, 201]).toContain(created.status)

    const simpleLogin = await api('/api/admin/auth/login', {
      method: 'POST',
      body: { phone: '0199000002', password: QA_PASSWORD },
    })
    expect(simpleLogin.status).toBe(200)
    const retry = await api('/api/admin/auth/register', {
      method: 'POST',
      token: simpleLogin.json.data.token,
      body: {
        fullName: 'QA Autre',
        phone: '0199000003',
        password: QA_PASSWORD,
        confirmPassword: QA_PASSWORD,
        role: 'admin',
      },
    })
    expect(retry.status).toBe(403)
  })
})

describe('idor', () => {
  it('notification d’autrui illisible (404)', async () => {
    await seedLearner({ email: 'qa.idor.a@test.local', phone: '0100000012' })
    await seedLearner({ email: 'qa.idor.b@test.local', phone: '0100000013' })
    const tokenA = await learnerToken('qa.idor.a@test.local')
    const tokenB = await learnerToken('qa.idor.b@test.local')
    const { Notification } = models
    const { default: mongoose } = await import('mongoose')
    const notif = await Notification.create({
      userId: new mongoose.Types.ObjectId(),
      type: 'general',
      title: 'QA',
      body: 'QA',
    })
    // Rattache la notif à A via son userId réel.
    const meA = await api('/api/access-requests/me', { token: tokenA })
    expect(meA.status).toBe(200)
    const { User } = models
    const userA = await User.findOne({ email: 'qa.idor.a@test.local' })
    notif.userId = userA._id
    await notif.save()

    const readB = await api(`/api/notifications/${notif._id}/read`, {
      method: 'PATCH',
      token: tokenB,
    })
    expect(readB.status).toBe(404)
    const readA = await api(`/api/notifications/${notif._id}/read`, {
      method: 'PATCH',
      token: tokenA,
    })
    expect(readA.status).toBe(200)
  })

  it('tentative d’examen d’autrui introuvable (404)', async () => {
    await seedCodeContent()
    await seedLearner({ email: 'qa.exam.a@test.local', phone: '0100000014' })
    await seedLearner({ email: 'qa.exam.b@test.local', phone: '0100000015' })
    const { User } = models
    const userA = await User.findOne({ email: 'qa.exam.a@test.local' })
    const userB = await User.findOne({ email: 'qa.exam.b@test.local' })
    await grantCodeAccess(userA._id)
    await grantCodeAccess(userB._id)
    const tokenA = await learnerToken('qa.exam.a@test.local')
    const tokenB = await learnerToken('qa.exam.b@test.local')

    const started = await api('/api/content/revision/practice-exams/10/start', {
      method: 'POST',
      token: tokenA,
    })
    expect([200, 201]).toContain(started.status)
    const attemptId = started.json.data.attempt?.id || started.json.data.attemptId
    expect(attemptId).toBeTruthy()

    const readB = await api(`/api/content/revision/practice-exams/attempts/${attemptId}`, {
      token: tokenB,
    })
    expect(readB.status).toBe(404)
  })
})

describe('injection nosql', () => {
  it('payload objet rejeté sans fuite (400/401)', async () => {
    const { status, json } = await api('/api/auth/login', {
      method: 'POST',
      body: { identifier: { $gt: '' }, password: QA_PASSWORD, client: 'mobile' },
    })
    expect([400, 401]).toContain(status)
    expect(JSON.stringify(json)).not.toMatch(/token|passwordHash/)
  })

  it('register avec email objet rejeté (400)', async () => {
    const { status } = await api('/api/auth/register', {
      method: 'POST',
      body: { firstName: 'Qa', lastName: 'NoSql', email: { $gt: '' }, password: QA_PASSWORD },
    })
    expect(status).toBe(400)
  })
})

describe('cors', () => {
  it('origine non listée non reflétée, origine autorisée reflétée', async () => {
    const evil = await api('/api/health', { headers: { Origin: 'https://evil.test' } })
    expect(evil.status).toBe(200)
    expect(evil.headers.get('access-control-allow-origin')).not.toBe('https://evil.test')
    const ok = await api('/api/health', { headers: { Origin: 'http://localhost:5174' } })
    expect(ok.headers.get('access-control-allow-origin')).toBe('http://localhost:5174')
  })
})

describe('secrets', () => {
  it('aucun mot de passe ni hash dans les réponses auth', async () => {
    await seedLearner({ email: 'qa.leak@test.local', phone: '0100000016' })
    const login = await api('/api/auth/login', {
      method: 'POST',
      body: { identifier: 'qa.leak@test.local', password: QA_PASSWORD, client: 'mobile' },
    })
    expect(JSON.stringify(login.json)).not.toMatch(/passwordHash|"password":/i)
    const me = await api('/api/access-requests/me', { token: login.json.data.token })
    expect(JSON.stringify(me.json)).not.toMatch(/passwordHash|"password":/i)
  })
})
