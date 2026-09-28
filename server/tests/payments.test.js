// QA — abonnements & FedaPay sandbox : catalogue, webhook HMAC
// (valide/invalide/rejeu/échec), activation + crédit d'heures.
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import { api, useQaWorld } from './helpers/world.mjs'
import { models } from './helpers/db.mjs'
import { QA_PASSWORD, seedLearner, grantConduiteHours } from './helpers/seed.mjs'
import { QA_WEBHOOK_SECRET } from './helpers/env.mjs'

const require = createRequire(import.meta.url)
const { Webhook } = require('fedapay')

useQaWorld()

function sign(payload) {
  return Webhook.generateTestHeaderString({ payload, secret: QA_WEBHOOK_SECRET })
}

describe('catalogue', () => {
  it('formules en XOF avec prix cohérents', async () => {
    await seedLearner({ email: 'qa.pay.cat@test.local', phone: '0100000031' })
    const login = await api('/api/auth/login', {
      method: 'POST',
      body: { identifier: 'qa.pay.cat@test.local', password: QA_PASSWORD, client: 'mobile' },
    })
    const { status, json } = await api('/api/access-requests/modules', {
      token: login.json.data.token,
    })
    expect(status).toBe(200)
    const modules = json.data.modules || json.data
    const code = modules.find((m) => m.key === 'code')
    expect(code).toBeTruthy()
    expect(code.currency).toBe('XOF')
    expect(code.price).toBeGreaterThan(0)
  })
})

describe('accès aux offres', () => {
  it('n’active que les formules liées à un paiement confirmé', async () => {
    const email = `qa.pay.access.${Date.now()}@test.local`
    const user = await seedLearner({
      email,
      phone: `03${String(Date.now()).slice(-8)}`,
    })
    const login = await api('/api/auth/login', {
      method: 'POST',
      body: { identifier: email, password: QA_PASSWORD, client: 'mobile' },
    })
    const token = login.json.data.token
    const { AccessRequest, Payment } = models
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    const code = await AccessRequest.create({
      userId: user._id,
      module: 'code',
      status: 'actif',
      quantity: 1,
      amount: 2000,
      currency: 'XOF',
      unit: 'month',
      startAt: new Date(),
      endAt: future,
    })
    const hours = await AccessRequest.create({
      userId: user._id,
      module: 'conduite_heures',
      status: 'valide',
      quantity: 2,
      amount: 9000,
      currency: 'XOF',
      unit: 'hour',
      hoursCredited: true,
    })
    const videos = await AccessRequest.create({
      userId: user._id,
      module: 'conduite_videos',
      status: 'actif',
      quantity: 1,
      amount: 0,
      currency: 'XOF',
      unit: 'month',
      startAt: new Date(),
      endAt: future,
    })

    const codePayment = await Payment.create({
      accessRequestId: code._id,
      accessRequestIds: [code._id],
      userId: user._id,
      method: 'fedapay',
      amount: 2000,
      currency: 'XOF',
      status: 'pending',
    })
    await Payment.create({
      accessRequestId: hours._id,
      accessRequestIds: [hours._id],
      userId: user._id,
      method: 'manual',
      amount: 9000,
      currency: 'XOF',
      status: 'approved',
    })
    const videosPayment = await Payment.create({
      accessRequestId: videos._id,
      accessRequestIds: [videos._id],
      userId: user._id,
      method: 'fedapay',
      amount: 0,
      currency: 'XOF',
      status: 'approved',
    })

    const beforeConfirmation = await api('/api/access-requests/me', { token })
    expect(beforeConfirmation.json.data.access).toMatchObject({
      code: false,
      conduite_heures: true,
      conduite_videos: false,
    })

    const freeClaim = await api('/api/access-requests/claim-free', {
      method: 'POST',
      token,
      body: { modules: ['conduite_videos'] },
    })
    expect(freeClaim.status).toBe(403)

    await Payment.updateOne({ _id: codePayment._id }, { $set: { status: 'approved' } })
    await Promise.all([
      AccessRequest.updateOne({ _id: videos._id }, { $set: { amount: 2000 } }),
      Payment.updateOne({ _id: videosPayment._id }, { $set: { amount: 2000 } }),
    ])
    const afterConfirmation = await api('/api/access-requests/me', { token })
    expect(afterConfirmation.json.data.access).toMatchObject({
      code: true,
      conduite_heures: true,
      conduite_videos: true,
    })
  })
})

describe('webhook fedapay', () => {
  async function setupPendingAccess() {
    const email = `qa.pay.${Date.now()}${Math.floor(Math.random() * 1000)}@test.local`
    const user = await seedLearner({ email, phone: `01${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}` })
    const { AccessRequest, Payment } = models
    const access = await AccessRequest.create({
      userId: user._id,
      module: 'code',
      status: 'en_verification',
      quantity: 1,
      amount: 5000,
      currency: 'XOF',
      unit: 'flat',
    })
    const payment = await Payment.create({
      accessRequestId: access._id,
      userId: user._id,
      method: 'fedapay',
      amount: 5000,
      currency: 'XOF',
      status: 'pending',
      fedapayTransactionId: `tx-qa-${Date.now()}`,
    })
    return { user, access, payment }
  }

  async function sendWebhook(base, eventObj, signature) {
    const payload = JSON.stringify(eventObj)
    const res = await fetch(`${base}/api/webhooks/fedapay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-fedapay-signature': signature },
      body: payload,
    })
    let json = null
    try {
      json = await res.json()
    } catch {
      /* vide */
    }
    return { status: res.status, json, payload }
  }

  it('signature valide approved → activation code', async () => {
    const { BASE } = await import('./helpers/world.mjs')
    const { user, payment } = await setupPendingAccess()
    const event = {
      id: `evt-qa-${Date.now()}`,
      name: 'transaction.approved',
      entity: {
        id: payment.fedapayTransactionId,
        status: 'approved',
        custom_metadata: { paymentId: String(payment._id) },
      },
    }
    const payload = JSON.stringify(event)
    const { status } = await sendWebhook(BASE, event, sign(payload))
    expect(status).toBe(200)

    const { Payment, AccessRequest } = models
    const updated = await Payment.findById(payment._id)
    expect(updated.status).toBe('approved')
    const access = await AccessRequest.findOne({ userId: user._id, module: 'code' })
    expect(access.status).toBe('actif')
  })

  it('rejeu du même événement → idempotent (pas de double activation)', async () => {
    const { BASE } = await import('./helpers/world.mjs')
    const { user, payment } = await setupPendingAccess()
    const event = {
      id: `evt-qa-replay-${Date.now()}`,
      name: 'transaction.approved',
      entity: {
        id: payment.fedapayTransactionId,
        status: 'approved',
        custom_metadata: { paymentId: String(payment._id) },
      },
    }
    const payload = JSON.stringify(event)
    const sig = sign(payload)
    expect((await sendWebhook(BASE, event, sig)).status).toBe(200)
    expect((await sendWebhook(BASE, event, sig)).status).toBe(200)

    const { Payment, AccessRequest } = models
    const count = await AccessRequest.countDocuments({ userId: user._id, module: 'code', status: 'actif' })
    expect(count).toBe(1)
    const updated = await Payment.findById(payment._id)
    expect(updated.processedEventIds.length).toBeGreaterThan(0)
  })

  it('signature invalide → 400, aucune activation', async () => {
    const { BASE } = await import('./helpers/world.mjs')
    const { payment } = await setupPendingAccess()
    const event = {
      id: `evt-qa-bad-${Date.now()}`,
      name: 'transaction.approved',
      entity: {
        id: payment.fedapayTransactionId,
        status: 'approved',
        custom_metadata: { paymentId: String(payment._id) },
      },
    }
    const { status } = await sendWebhook(BASE, event, 't=123,v1=falsifiée')
    expect(status).toBe(400)
    const { Payment } = models
    expect((await Payment.findById(payment._id)).status).toBe('pending')
  })

  it('paiement échoué → aucune activation', async () => {
    const { BASE } = await import('./helpers/world.mjs')
    const { user, payment } = await setupPendingAccess()
    const event = {
      id: `evt-qa-fail-${Date.now()}`,
      name: 'transaction.declined',
      entity: {
        id: payment.fedapayTransactionId,
        status: 'declined',
        custom_metadata: { paymentId: String(payment._id) },
      },
    }
    const payload = JSON.stringify(event)
    const { status } = await sendWebhook(BASE, event, sign(payload))
    expect(status).toBe(200)
    const { AccessRequest } = models
    const access = await AccessRequest.findOne({ userId: user._id, module: 'code' })
    expect(access.status).not.toBe('actif')
  })

  it('heures conduite créditées au solde (webhook pack heures)', async () => {
    const { BASE } = await import('./helpers/world.mjs')
    const email = `qa.pay.h${Date.now()}@test.local`
    const user = await seedLearner({ email, phone: `02${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}` })
    const { AccessRequest, Payment, User } = models
    const access = await AccessRequest.create({
      userId: user._id,
      module: 'conduite_heures',
      status: 'en_verification',
      quantity: 2,
      amount: 10000,
      currency: 'XOF',
      unit: 'hour',
    })
    const payment = await Payment.create({
      accessRequestId: access._id,
      userId: user._id,
      method: 'fedapay',
      amount: 10000,
      currency: 'XOF',
      status: 'pending',
      fedapayTransactionId: `tx-qa-h-${Date.now()}`,
    })
    const event = {
      id: `evt-qa-h-${Date.now()}`,
      name: 'transaction.approved',
      entity: {
        id: payment.fedapayTransactionId,
        status: 'approved',
        custom_metadata: { paymentId: String(payment._id) },
      },
    }
    const payload = JSON.stringify(event)
    const { status } = await sendWebhook(BASE, event, sign(payload))
    expect(status).toBe(200)
    const updated = await User.findById(user._id)
    expect(updated.soldeHeures).toBeGreaterThanOrEqual(2)
  })
})
