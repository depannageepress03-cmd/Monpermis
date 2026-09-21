import rateLimit from 'express-rate-limit'

const isProduction = process.env.NODE_ENV === 'production'

function limitMax(defaultProd, envKey) {
  const parsed = Number(process.env[envKey])
  if (Number.isFinite(parsed) && parsed > 0) return parsed
  return isProduction ? defaultProd : 200
}

function authAttemptMessage() {
  return { success: false, error: 'Trop de tentatives. Réessayez dans 15 minutes.' }
}

/** Login / OAuth — seules les réponses ≥ 400 comptent (skipSuccessfulRequests). */
export const learnerLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: limitMax(12, 'AUTH_LOGIN_RATE_LIMIT_MAX'),
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: authAttemptMessage(),
})

export const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: limitMax(12, 'AUTH_LOGIN_RATE_LIMIT_MAX'),
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: authAttemptMessage(),
})

export const moniteurLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: limitMax(12, 'AUTH_LOGIN_RATE_LIMIT_MAX'),
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: authAttemptMessage(),
})

/** Inscription — fenêtre plus longue, plafond séparé. */
export const learnerRegisterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: limitMax(15, 'AUTH_REGISTER_RATE_LIMIT_MAX'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Trop de créations de compte. Réessayez plus tard.' },
})

/** Mot de passe oublié / reset. */
export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: limitMax(8, 'AUTH_RESET_RATE_LIMIT_MAX'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Trop de demandes. Réessayez dans 15 minutes.' },
})

export const googleAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: limitMax(20, 'AUTH_GOOGLE_RATE_LIMIT_MAX'),
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: authAttemptMessage(),
})

/** Vérification email / renvoi (anti-énumération + anti email-bombing). */
export const emailVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: limitMax(20, 'AUTH_VERIFY_RATE_LIMIT_MAX'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Trop de demandes. Réessayez dans 15 minutes.' },
})

/**
 * Initiation de paiement (checkout, création d'accès, redeem promo, réservation).
 * Freine le spam d'initiation Mobile Money (coût FedaPay + SMS opérateur)
 * et le guessing de codes promo.
 */
export const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: limitMax(30, 'PAYMENT_RATE_LIMIT_MAX'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Trop de tentatives de paiement. Réessayez plus tard.' },
})

/**
 * Webhook FedaPay : plafond large pour absorber les retries légitimes
 * tout en freinant le flood de signatures invalides (CPU HMAC + logs).
 */
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: limitMax(300, 'WEBHOOK_RATE_LIMIT_MAX'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Trop de requêtes. Réessayez.' },
})

/**
 * Tracking + resynchronisation de paiement (poll client) : plafond large,
 * anti-gonflement de LearnerTrackEvent et anti-hammering FedaPay retrieve.
 */
export const trackingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: limitMax(300, 'TRACKING_RATE_LIMIT_MAX'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Trop de requêtes. Réessayez dans 15 minutes.' },
})
