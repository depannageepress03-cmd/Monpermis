import type { AccessModuleKey } from '../api/accessRequests'

export const HOURS_DISCOUNT_FCFA = 1000
export const HOURS_DISCOUNT_MIN_HOURS = 2

export function computeModuleAmount(module: AccessModuleKey, unitPrice: number, quantity = 1) {
  const qty = Math.max(1, Number(quantity) || 1)
  let amount = Math.round(Number(unitPrice) || 0) * qty
  if (module === 'conduite_heures' && qty >= 2) amount = Math.max(0, amount - HOURS_DISCOUNT_FCFA)
  return amount
}

/** Même règle serveur : remise forfaitaire unique dès 2 h réservées ensemble. */
export function computeDrivingAmount(
  hourlyPrice: number,
  hours: number,
  discount = HOURS_DISCOUNT_FCFA,
  minHours = HOURS_DISCOUNT_MIN_HOURS,
) {
  const base = Math.round(Math.max(0, Number(hourlyPrice) || 0) * Math.max(0, Number(hours) || 0))
  if ((Number(hours) || 0) < minHours) return base
  return Math.max(0, base - discount)
}
