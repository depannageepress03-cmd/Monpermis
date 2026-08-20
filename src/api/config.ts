/** Origine de l’API (sans slash final). Vide en local → proxy Vite `/api` et `/uploads`. */
export function getApiOrigin(): string {
  let value = String(import.meta.env.VITE_API_URL || '').trim()
  value = value.replace(/^https:\/(?!\/)/i, 'https://').replace(/^http:\/(?!\/)/i, 'http://')
  value = value.replace(/\/$/, '')
  // Build preview sans .env : même API que l’admin / mobile.
  if (!value && import.meta.env.PROD) {
    return 'https://monpermis-api.onrender.com'
  }
  return value
}

/** Base des routes JSON (`…/api`). */
export function getApiBase(): string {
  const origin = getApiOrigin()
  return origin ? `${origin}/api` : '/api'
}
