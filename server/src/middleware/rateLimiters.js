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
