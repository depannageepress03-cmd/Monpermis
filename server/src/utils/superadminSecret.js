import crypto from 'crypto'

/**
 * Clé d’accès Direction (superadmin) — uniquement côté serveur (.env).
 * Jamais exposée au front ni aux comptes admin simples.
 */
export function getSuperadminAccessKey() {
  return String(process.env.SUPERADMIN_ACCESS_KEY || '').trim()
}

export function isSuperadminAccessKeyConfigured() {
  return getSuperadminAccessKey().length >= 12
}

/**
 * Comparaison anti-timing (hash SHA-256 des deux côtés).
 */
export function verifySuperadminAccessKey(candidate) {
  const expected = getSuperadminAccessKey()
  if (!expected || expected.length < 12) return false
  const provided = String(candidate || '')
  if (!provided) return false

  const a = crypto.createHash('sha256').update(expected, 'utf8').digest()
  const b = crypto.createHash('sha256').update(provided, 'utf8').digest()
  return crypto.timingSafeEqual(a, b)
}

/**
 * Exige la clé pour toute opération sensible (login / création / promotion superadmin).
 * @returns {{ ok: true } | { ok: false, status: number, error: string }}
 */
export function requireSuperadminAccessKey(candidate) {
  if (!isSuperadminAccessKeyConfigured()) {
    return {
      ok: false,
      status: 503,
      error:
        'Accès Direction non configuré (SUPERADMIN_ACCESS_KEY). Contactez l’hébergeur.',
    }
  }
  if (!verifySuperadminAccessKey(candidate)) {
    return {
      ok: false,
      status: 401,
      error: 'Identifiants incorrects',
    }
  }
  return { ok: true }
}
