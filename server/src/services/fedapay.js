import fedapay from 'fedapay'

const { FedaPay, Transaction, Webhook } = fedapay

let configuredKey = ''
let configuredEnvironment = ''

/**
 * Identifiants UI (app / web) → modes API FedaPay (Benin, sans redirection).
 * Docs : mtn_open (MTN BJ), moov (Moov BJ), sbin (Celtiis BJ).
 */
export const FEDAPAY_MOBILE_OPERATORS = ['mtn', 'moov', 'celtiis']

const UI_TO_FEDAPAY_MODE = {
  mtn: 'mtn_open',
  moov: 'moov',
  celtiis: 'sbin',
  // Alias déjà au format API (tolérance)
  mtn_open: 'mtn_open',
  sbin: 'sbin',
}

export function toFedaPayMode(operator) {
  const key = String(operator || '')
    .trim()
    .toLowerCase()
  return UI_TO_FEDAPAY_MODE[key] || null
}

export function normalizeOperatorId(operator) {
  const mode = toFedaPayMode(operator)
  if (mode === 'mtn_open') return 'mtn'
  if (mode === 'sbin') return 'celtiis'
  if (mode === 'moov') return 'moov'
  return null
}

/** Extrait un message lisible depuis une erreur SDK / HTTP FedaPay. */
export function formatFedaPayError(error) {
  if (!error) return 'Erreur FedaPay inconnue'
  const data = error.httpResponse?.data
  const fromBody =
    error.errorMessage ||
    data?.message ||
    (Array.isArray(error.errors) ? error.errors.map((e) => e.message || e).join(', ') : '') ||
    (data?.errors && typeof data.errors === 'object'
      ? Object.values(data.errors)
          .flat()
          .map((e) => (typeof e === 'string' ? e : e?.message || String(e)))
          .join(', ')
      : '') ||
    (error.errors && typeof error.errors === 'object'
      ? Object.values(error.errors)
          .flat()
          .map((e) => (typeof e === 'string' ? e : e?.message || String(e)))
          .join(', ')
      : '')
  const message = String(fromBody || error.message || 'Erreur FedaPay').trim()
  if (/socket hang up|ECONNRESET|ETIMEDOUT|ENOTFOUND|network/i.test(message)) {
    return 'Impossible de joindre FedaPay. Réessayez dans un instant.'
  }
  if (/api key|unauthorized|401|clé/i.test(message)) {
    return 'Clés API FedaPay invalides ou environnement incorrect (live/sandbox).'
  }
  if (/op[eé]ration non autoris[eé]e|not allowed|404/i.test(message)) {
    return 'Ce réseau Mobile Money n’est pas disponible pour votre compte FedaPay. Vérifiez MTN / Moov / Celtiis dans le dashboard MyFeda.'
  }
  if (/Request failed with status code/i.test(message) && data?.message) {
    return String(data.message)
  }
  if (/Request failed with status code/i.test(message)) {
    return 'FedaPay a refusé la demande de paiement. Vérifiez le numéro et réessayez.'
  }
  return message
}

export function configureFedaPay() {
  const secret = String(process.env.FEDAPAY_SECRET_KEY || '').trim()
  const publicKey = String(process.env.FEDAPAY_PUBLIC_KEY || '').trim()
  const environment = process.env.FEDAPAY_ENVIRONMENT === 'sandbox' ? 'sandbox' : 'live'
  if (!secret) {
    const error = new Error('FEDAPAY_SECRET_KEY manquante dans la configuration serveur')
    error.status = 500
    throw error
  }
  if (!secret.startsWith(environment === 'live' ? 'sk_live_' : 'sk_sandbox_')) {
    const error = new Error(
      `Clé FedaPay incompatible avec l’environnement « ${environment} ». Utilisez une clé ${
        environment === 'live' ? 'sk_live_…' : 'sk_sandbox_…'
      }.`,
    )
    error.status = 500
    throw error
  }
  if (publicKey && !publicKey.startsWith(environment === 'live' ? 'pk_live_' : 'pk_sandbox_')) {
    const error = new Error(
      `FEDAPAY_PUBLIC_KEY incompatible avec l’environnement « ${environment} ».`,
    )
    error.status = 500
    throw error
  }

  if (configuredKey !== secret || configuredEnvironment !== environment) {
    FedaPay.setApiKey(secret)
    FedaPay.setEnvironment(environment)
    configuredKey = secret
    configuredEnvironment = environment
  }

  return { environment, publicKeyConfigured: Boolean(publicKey) }
}

function ensureConfigured() {
  configureFedaPay()
}

export function getFedaPayPublicKey() {
  return String(process.env.FEDAPAY_PUBLIC_KEY || '').trim()
}

export function isFedaPayConfigured() {
  const secret = String(process.env.FEDAPAY_SECRET_KEY || '').trim()
  const environment = process.env.FEDAPAY_ENVIRONMENT === 'sandbox' ? 'sandbox' : 'live'
  if (!secret) return false
  return secret.startsWith(environment === 'live' ? 'sk_live_' : 'sk_sandbox_')
}

/**
 * Normalise un numéro béninois pour FedaPay.
 * Accepte l’ancien format (8 chiffres) et le nouveau (10 chiffres, préfixe 01).
 */
export function normalizeBeninPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '')
  if (!digits) return null

  let local = digits
  if (local.startsWith('00229')) local = local.slice(5)
  else if (local.startsWith('229')) local = local.slice(3)

  // Nouveau plan BJ : 10 chiffres (ex. 01XXXXXXXX)
  if (local.length >= 10) {
    local = local.slice(-10)
    if (!/^0\d{9}$/.test(local)) return null
    return local
  }

  // Ancien plan : 8 chiffres (ex. 97XXXXXX)
  if (local.length === 8 && /^\d{8}$/.test(local)) {
    return local
  }

  return null
}

function extractPaymentUrl(tokenObject, transaction) {
  const candidates = [
    tokenObject?.url,
    tokenObject?.payment_url,
    tokenObject?.token && String(tokenObject.token).startsWith('http') ? tokenObject.token : null,
    transaction?.payment_url,
  ]
  for (const value of candidates) {
    if (value && String(value).startsWith('http')) return String(value)
  }
  // Fallback officiel FedaPay process page
  const rawToken = tokenObject?.token
  if (rawToken && typeof rawToken === 'string' && rawToken.length > 20) {
    return `https://process.fedapay.com/${rawToken}`
  }
  return ''
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
    const error = new Error('Montant de paiement invalide (minimum 100 XOF)')
    error.status = 400
    throw error
  }

  if (!callbackUrl || !String(callbackUrl).startsWith('http')) {
    const error = new Error('URL de retour FedaPay invalide (FEDAPAY_CALLBACK_URL / CLIENT_URL)')
    error.status = 500
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
    },
  }

  if (customer.email) payload.customer.email = customer.email

  const phone = normalizeBeninPhone(customer.phone)
  if (phone) {
    payload.customer.phone_number = {
      number: phone,
      country: 'bj',
    }
  }

  let transaction
  try {
    transaction = await Transaction.create(payload)
  } catch (error) {
    const wrapped = new Error(formatFedaPayError(error))
    wrapped.status = error.httpStatus || 502
    wrapped.cause = error
    throw wrapped
  }

  let token
  try {
    token = await transaction.generateToken()
  } catch (error) {
    const wrapped = new Error(formatFedaPayError(error))
    wrapped.status = error.httpStatus || 502
    wrapped.cause = error
    throw wrapped
  }

  const paymentToken = token?.token || ''
  const paymentUrl = extractPaymentUrl(token, transaction)
  if (!paymentToken || !paymentUrl) {
    const error = new Error('FedaPay n’a pas renvoyé de lien / token de paiement')
    error.status = 502
    throw error
  }

  return {
    transactionId: String(transaction.id),
    reference: transaction.reference || '',
    status: transaction.status || 'pending',
    paymentUrl,
    token: paymentToken,
    raw: transaction,
  }
}

/** Régénère un lien de paiement (token FedaPay à usage unique / 24h). */
export async function refreshFedaPayPaymentUrl(transactionId) {
  ensureConfigured()
  if (!transactionId) {
    const error = new Error('Identifiant de transaction FedaPay manquant')
    error.status = 400
    throw error
  }

  try {
    const transaction = await Transaction.retrieve(transactionId)
    const token = await transaction.generateToken()
    const paymentUrl = extractPaymentUrl(token, transaction)
    if (!paymentUrl || !token?.token) {
      const error = new Error('Impossible de régénérer le lien de paiement FedaPay')
      error.status = 502
      throw error
    }
    return {
      transactionId: String(transaction.id),
      reference: transaction.reference || '',
      status: transaction.status || 'pending',
      paymentUrl,
      token: token.token,
      raw: transaction,
    }
  } catch (error) {
    if (error.status) throw error
    const wrapped = new Error(formatFedaPayError(error))
    wrapped.status = error.httpStatus || 502
    wrapped.cause = error
    throw wrapped
  }
}

export async function retrieveFedaPayTransaction(transactionId) {
  ensureConfigured()
  try {
    return await Transaction.retrieve(transactionId)
  } catch (error) {
    const wrapped = new Error(formatFedaPayError(error))
    wrapped.status = error.httpStatus || 502
    wrapped.cause = error
    throw wrapped
  }
}

export function constructFedaPayEvent(rawBody, signatureHeader) {
  const secret = String(process.env.FEDAPAY_WEBHOOK_SECRET || '').trim()
  if (!secret) {
    const error = new Error(
      'FEDAPAY_WEBHOOK_SECRET manquant. Configurez le secret du webhook dans le tableau de bord FedaPay.',
    )
    error.status = 500
    throw error
  }
  const payload = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody || '')
  const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader
  return Webhook.constructEvent(payload, signature, secret)
}

export function mapFedaPayStatus(status) {
  const value = String(status || '').toLowerCase()
  if (value === 'approved' || value === 'transferred') return 'approved'
  if (value === 'declined') return 'declined'
  if (value === 'canceled' || value === 'cancelled') return 'canceled'
  if (value === 'pending') return 'pending'
  return 'failed'
}

export function normalizeFedaPayCountry(country) {
  const value = String(country || 'bj').trim().toLowerCase()
  if (['bj', 'tg', 'ci', 'ne', 'sn'].includes(value)) return value
  return 'bj'
}

/**
 * Crée une transaction FedaPay puis déclenche immédiatement le retrait Mobile Money (sendNow).
 */
export async function sendFedaPayMobileMoney({
  amount,
  description,
  customer,
  callbackUrl,
  customMetadata = {},
  operator,
  phone,
  country = 'BJ',
}) {
  ensureConfigured()
  const uiOperator = normalizeOperatorId(operator)
  const mode = toFedaPayMode(operator)
  if (!uiOperator || !mode) {
    const error = new Error('Réseau Mobile Money invalide. Choisissez MTN, Moov ou Celtiis.')
    error.status = 400
    throw error
  }

  const normalizedPhone = normalizeBeninPhone(phone) || normalizeBeninPhone(customer?.phone)
  if (!normalizedPhone) {
    const error = new Error('Numéro de téléphone Mobile Money invalide.')
    error.status = 400
    throw error
  }

  const isoCountry = normalizeFedaPayCountry(country)
  const checkout = await createFedaPayCheckout({
    amount,
    description,
    customer: {
      ...customer,
      phone: normalizedPhone,
    },
    callbackUrl,
    customMetadata: {
      ...customMetadata,
      operator: uiOperator,
      fedapayMode: mode,
      country: isoCountry,
    },
  })

  try {
    const transaction = await Transaction.retrieve(checkout.transactionId)
    // Body attendu par l’API : { token, phone_number: { number, country } }
    await transaction.sendNowWithToken(mode, checkout.token, {
      phone_number: {
        number: normalizedPhone,
        country: isoCountry,
      },
    })
  } catch (error) {
    const wrapped = new Error(formatFedaPayError(error))
    wrapped.status = error.httpStatus || 502
    wrapped.cause = error
    throw wrapped
  }

  return {
    ...checkout,
    operator: uiOperator,
    fedapayMode: mode,
    phone: normalizedPhone,
    country: isoCountry,
  }
}
