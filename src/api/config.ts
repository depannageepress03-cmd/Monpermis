/** Origine de l’API (sans slash final). Vide en local → proxy Vite `/api` et `/uploads`. */
export function getApiOrigin(): string {
  return String(import.meta.env.VITE_API_URL || '')
    .trim()
    .replace(/\/$/, '')
}

/** Base des routes JSON (`…/api`). */
export function getApiBase(): string {
  const origin = getApiOrigin()
  return origin ? `${origin}/api` : '/api'
}
