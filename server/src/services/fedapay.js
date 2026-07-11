import fedapay from 'fedapay'

const { FedaPay, Transaction, Webhook } = fedapay

let configured = false

export function configureFedaPay() {
  const secret = process.env.FEDAPAY_SECRET_KEY
  const environment = process.env.FEDAPAY_ENVIRONMENT === 'sandbox' ? 'sandbox' : 'live'
  if (!secret) {
    throw new Error('FEDAPAY_SECRET_KEY manquante dans la configuration serveur')
  }
  FedaPay.setApiKey(secret)
  FedaPay.setEnvironment(environment)
  configured = true
  return { environment }
}

function ensureConfigured() {
  if (!configured) configureFedaPay()
}

export function getFedaPayPublicKey() {
  return process.env.FEDAPAY_PUBLIC_KEY || ''
}

export function normalizeBeninPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return null
  let local = digits
  if (local.startsWith('229') && local.length >= 11) local = local.slice(3)
  if (local.length < 8) return null
  return local.slice(-10)
}

export async function createFedaPayCheckout({
  amount,
  description,
  customer,
  callbackUrl,
  customMetadata = {},
}) {
  ensureConfigured()
  const safeAmount = Math.round(Number(amount) || 0)
  if (safeAmount < 100) {
    const error = new Error('Montant de paiement invalide')
    error.status = 400
    throw error
  }

  const payload = {
    description: description || 'Abonnement Monpermis.bj',
    amount: safeAmount,
    currency: { iso: 'XOF' },
    callback_url: callbackUrl,
    custom_metadata: customMetadata,
    customer: {
      firstname: customer.firstName || 'Apprenant',
      lastname: customer.lastName || 'Monpermis',
      email: customer.email,
    },
  }

  const phone = normalizeBeninPhone(customer.phone)
  if (phone) {
    payload.customer.phone_number = {
      number: phone,
      country: 'BJ',
    }
  }

  const transaction = await Transaction.create(payload)
  const token = await transaction.generateToken()
  const paymentUrl =
    token?.url || token?.token || token?.payment_url || transaction.payment_url || ''

  if (!paymentUrl) {
    const error = new Error('FedaPay n’a pas renvoyé de lien de paiement')
    error.status = 502
    throw error
  }

  return {
    transactionId: String(transaction.id),
    reference: transaction.reference || '',
    status: transaction.status || 'pending',
    paymentUrl: String(paymentUrl),
    raw: transaction,
  }
}

export async function retrieveFedaPayTransaction(transactionId) {
  ensureConfigured()
  return Transaction.retrieve(transactionId)
}

export function constructFedaPayEvent(rawBody, signatureHeader) {
  const secret = process.env.FEDAPAY_WEBHOOK_SECRET
  if (!secret) {
    const error = new Error(
      'FEDAPAY_WEBHOOK_SECRET manquant. Configurez le secret du webhook dans le tableau de bord FedaPay.',
    )
    error.status = 500
    throw error
  }
  const payload = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody || '')
  return Webhook.constructEvent(payload, signatureHeader, secret)
}

export function mapFedaPayStatus(status) {
  const value = String(status || '').toLowerCase()
  if (value === 'approved' || value === 'transferred') return 'approved'
  if (value === 'declined') return 'declined'
  if (value === 'canceled' || value === 'cancelled') return 'canceled'
  if (value === 'pending') return 'pending'
  return 'failed'
}
