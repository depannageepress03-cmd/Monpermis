/** Dates calendaires locales (YYYY-MM-DD) — évite le décalage UTC de toISOString(). */

export function formatLocalDate(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseLocalDate(isoDate) {
  const [y, m, d] = String(isoDate).split('-').map(Number)
  if (!y || !m || !d) return null
  const date = new Date(y, m - 1, d)
  return Number.isNaN(date.getTime()) ? null : date
}

export function addLocalDays(isoDate, days) {
  const date = parseLocalDate(isoDate)
  if (!date) return null
  date.setDate(date.getDate() + days)
  return formatLocalDate(date)
}

export function normalizeVehicleType(value, fallback = 'voiture') {
  const cleaned = String(value || '')
    .trim()
    .toLowerCase()
  return cleaned.length >= 2 ? cleaned : fallback
}
