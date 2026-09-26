// QA — authentification apprenant : succès + erreurs 400/401/403/409.
import { describe, expect, it } from 'vitest'
import { api, useQaWorld } from './helpers/world.mjs'
import { models } from './helpers/db.mjs'
import { QA_PASSWORD, seedLearner } from './helpers/seed.mjs'

useQaWorld()

const REGISTER = '/api/auth/register'
const LOGIN = '/api/auth/login'

async function loginAs(email, password = QA_PASSWORD, client = 'mobile') {
  const { status, json } = await api(LOGIN, {
    method: 'POST',
    body: { identifier: email, password, client },
  })
  expect(status).toBe(200)
  return json.data
}

describe('register', () => {
  it('crée un compte par email (201)', async () => {
    const { status, json } = await api(REGISTER, {
      method: 'POST',
      body: {
        firstName: 'Qa',
        lastName: 'One',
        email: 'qa.one@test.local',
        password: QA_PASSWORD,
      },
    })
    expect(status).toBe(201)
    expect(json.success).toBe(true)
    expect(json.data.email).toBe('qa.one@test.local')
  })

  it('refuse sans email (400)', async () => {
    const { status } = await api(REGISTER, {
      method: 'POST',
      body: { firstName: 'Qa', lastName: 'Two', phone: '0147880143', password: QA_PASSWORD },
    })
    expect(status).toBe(400)
  })

  it('refuse un email invalide (400)', async () => {
    const { status } = await api(REGISTER, {
      method: 'POST',
      body: { firstName: 'Qa', lastName: 'Two', email: 'pas-un-email', password: QA_PASSWORD },
    })
    expect(status).toBe(400)
  })

  it('refuse un doublon email (409)', async () => {
    const body = { firstName: 'Qa', lastName: 'Dup', email: 'qa.dup@test.local', password: QA_PASSWORD }
    expect((await api(REGISTER, { method: 'POST', body })).status).toBe(201)
    expect((await api(REGISTER, { method: 'POST', body })).status).toBe(409)
  })

  it('refuse un mot de passe faible (400)', async () => {
    for (const weak of ['short1A', 'alllowercase1', 'ALLUPPERCASE1', 'NoDigitsHere']) {
      const { status } = await api(REGISTER, {
        method: 'POST',
        body: { firstName: 'Qa', lastName: 'Weak', email: `weak.${weak.length}@test.local`, password: weak },
      })
      expect(status).toBe(400)
    }
  })

  it('accepte un téléphone optionnel valide', async () => {
    const { status, json } = await api(REGISTER, {
      method: 'POST',
      body: {
        firstName: 'Qa',
        lastName: 'Phone',
        email: 'qa.phone@test.local',
        phone: '0147880143',
        password: QA_PASSWORD,
      },
    })
    expect(status).toBe(201)
    expect(json.data.phone).toBe('0147880143')
  })

  it('refuse un téléphone optionnel invalide (400)', async () => {
    const { status } = await api(REGISTER, {
      method: 'POST',
      body: {
        firstName: 'Qa',
        lastName: 'BadPhone',
        email: 'qa.badphone@test.local',
        phone: '123',
        password: QA_PASSWORD,
      },
    })
    expect(status).toBe(400)
  })
})

describe('login', () => {
  it('connecte par email (200 + token, sans mot de passe)', async () => {
    await seedLearner({ email: 'qa.login@test.local', phone: '0100000001' })
    const { status, json } = await api(LOGIN, {
      method: 'POST',
      body: { identifier: 'qa.login@test.local', password: QA_PASSWORD, client: 'mobile' },
    })
    expect(status).toBe(200)
    expect(json.data.token).toBeTruthy()
    expect(json.data.user.email).toBe('qa.login@test.local')
    expect(JSON.stringify(json)).not.toMatch(/QaTest1234|passwordHash/)
  })

  it('mauvais mot de passe → 401 générique', async () => {
    const { status, json } = await api(LOGIN, {
      method: 'POST',
      body: { identifier: 'qa.login@test.local', password: 'Wrong1234', client: 'mobile' },
    })
    expect(status).toBe(401)
    expect(json.error).toMatch(/incorrect/i)
  })

  it('email inconnu → 401', async () => {
    const { status } = await api(LOGIN, {
      method: 'POST',
      body: { identifier: 'inconnu@test.local', password: QA_PASSWORD, client: 'mobile' },
    })
    expect(status).toBe(401)
  })

  it('compte non vérifié : web 403, mobile 200', async () => {
    await seedLearner({ email: 'qa.unverified@test.local', phone: '0100000002', verified: false })
    const web = await api(LOGIN, {
      method: 'POST',
      body: { identifier: 'qa.unverified@test.local', password: QA_PASSWORD },
    })
    expect(web.status).toBe(403)
    expect(web.json.code).toBe('EMAIL_NOT_VERIFIED')
    const mobile = await api(LOGIN, {
      method: 'POST',
      body: { identifier: 'qa.unverified@test.local', password: QA_PASSWORD, client: 'mobile' },
    })
    expect(mobile.status).toBe(200)
  })

  it('compatibilité : ancien compte téléphone seul', async () => {
    const { User } = models
    await User.deleteOne({ phone: '0100000003' })
    await User.create({
      firstName: 'Qa',
      lastName: 'Legacy',
      email: '',
      phone: '0100000003',
      password: QA_PASSWORD,
      authProvider: 'local',
      isEmailVerified: true,
      isActive: true,
    })
    const { status, json } = await api(LOGIN, {
      method: 'POST',
      body: { identifier: '0100000003', password: QA_PASSWORD, client: 'mobile' },
    })
    expect(status).toBe(200)
    expect(json.data.user.phone).toBe('0100000003')
  })
})

describe('jwt', () => {
  it('validité 7 jours, trafic refusé sans/faux token', async () => {
    const { token } = await loginAs('qa.login@test.local')
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
    const days = (payload.exp - payload.iat) / 86400
    expect(days).toBeGreaterThan(6.9)
    expect(days).toBeLessThan(7.1)

    expect((await api('/api/auth/profile', { method: 'PATCH', body: {} })).status).toBe(401)
    const tampered = `${token.slice(0, -2)}ab`
    expect(
      (await api('/api/access-requests/me', { token: tampered })).status,
    ).toBe(401)
    const other = 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiIxMjM0NTY3ODkwMTIzNDU2Nzg5MDEyIn0.invalid'
    expect((await api('/api/access-requests/me', { token: other })).status).toBe(401)
  })
})

describe('compte (protégé)', () => {
  it('change-password puis reconnexion', async () => {
    await seedLearner({ email: 'qa.pwd@test.local', phone: '0100000004' })
    const { token } = await loginAs('qa.pwd@test.local')
    const changed = await api('/api/auth/change-password', {
      method: 'POST',
      token,
      body: { currentPassword: QA_PASSWORD, newPassword: 'NewPass1234' },
    })
    expect(changed.status).toBe(200)
    const relogin = await api(LOGIN, {
      method: 'POST',
      body: { identifier: 'qa.pwd@test.local', password: 'NewPass1234', client: 'mobile' },
    })
    expect(relogin.status).toBe(200)
  })

  it('PATCH /profile met à jour prénom/nom', async () => {
    const { token } = await loginAs('qa.pwd@test.local', 'NewPass1234')
    const { status, json } = await api('/api/auth/profile', {
      method: 'PATCH',
      token,
      body: { firstName: 'QaNew' },
    })
    expect(status).toBe(200)
    expect(json.data.user.firstName).toBe('QaNew')
  })

  it('DELETE /account refuse sans confirmation, supprime avec', async () => {
    await seedLearner({ email: 'qa.del@test.local', phone: '0100000005' })
    const { token } = await loginAs('qa.del@test.local')
    const noConfirm = await api('/api/auth/account', {
      method: 'DELETE',
      token,
      body: { password: QA_PASSWORD },
    })
    expect(noConfirm.status).toBe(400)
    const done = await api('/api/auth/account', {
      method: 'DELETE',
      token,
      body: { password: QA_PASSWORD, confirm: true },
    })
    expect(done.status).toBe(200)
    const relogin = await api(LOGIN, {
      method: 'POST',
      body: { identifier: 'qa.del@test.local', password: QA_PASSWORD, client: 'mobile' },
    })
    expect(relogin.status).toBe(401)
  })

  it('verify-email + forgot/reset : tokens invalides 400, neutres 200', async () => {
    expect(
      (await api('/api/auth/verify-email', { method: 'POST', body: { token: 'nope' } })).status,
    ).toBe(400)
    const resend = await api('/api/auth/resend-verification', {
      method: 'POST',
      body: { email: 'personne@test.local' },
    })
    expect(resend.status).toBe(200)
    const forgot = await api('/api/auth/forgot-password', {
      method: 'POST',
      body: { email: 'personne@test.local' },
    })
    expect(forgot.status).toBe(200)
    const reset = await api('/api/auth/reset-password', {
      method: 'POST',
      body: { token: 'nope', password: 'NewPass1234' },
    })
    expect(reset.status).toBe(400)
  })
})
