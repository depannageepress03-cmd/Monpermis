/**
 * Permissive email format: local@domain with at least one dot in the domain.
 * Allows +, _, digits, hyphens, subdomains, and long/new gTLDs.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmailFormat(email) {
  const value = String(email || '').trim()
  if (!value || value.length > 254) return false
  return EMAIL_PATTERN.test(value)
}

export function normalizeEmail(email) {
  const value = String(email || '').trim().toLowerCase()
  return value || ''
}
