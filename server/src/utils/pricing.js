/**
 * Règle tarifaire des heures de conduite, partagée par les deux chemins d'achat :
 * pack d'heures (AccessRequest) et paiement direct à la réservation.
 */

/** Remise forfaitaire unique, quel que soit le nombre d'heures au-delà de 2. */
export const HOURS_DISCOUNT_FCFA = 1000
export const HOURS_DISCOUNT_MIN_HOURS = 2

export function applyHoursDiscount(amount, hours) {
  const total = Math.max(0, Math.round(Number(amount) || 0))
  if ((Number(hours) || 0) < HOURS_DISCOUNT_MIN_HOURS) return total
  return Math.max(0, total - HOURS_DISCOUNT_FCFA)
}

/** Montant d'une séance de conduite : prix horaire × heures, remise incluse. */
export function computeDrivingAmount(hourlyPrice, hours) {
  const price = Math.max(0, Number(hourlyPrice) || 0)
  const qty = Math.max(0, Number(hours) || 0)
  return applyHoursDiscount(Math.round(price * qty), qty)
}
