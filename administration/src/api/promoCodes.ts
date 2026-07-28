import { apiFetch } from './client'

export type PromoModuleKey = 'code' | 'conduite_heures' | 'ecodepermis' | 'aiChat'
export type PromoDurationUnit = 'day' | 'week' | 'month'

export interface PromoCode {
  id: string
  code: string
  label: string
  modules: PromoModuleKey[]
  durationQuantity: number
  durationUnit: PromoDurationUnit
  heuresBonus: number
  maxUses: number | null
  usesCount: number
  active: boolean
  createdAt: string
  updatedAt: string
}

export function fetchPromoCodes(token: string) {
  return apiFetch<{ promoCodes: PromoCode[] }>('/api/admin/promo-codes', {}, token)
}

export function createPromoCode(
  token: string,
  payload: {
    code: string
    label?: string
    modules: PromoModuleKey[]
    durationQuantity: number
    durationUnit: PromoDurationUnit
    heuresBonus?: number
    maxUses?: number | null
  },
) {
  return apiFetch<{ promoCode: PromoCode }>(
    '/api/admin/promo-codes',
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  )
}

export function updatePromoCode(
  token: string,
  id: string,
  payload: Partial<{
    label: string
    modules: PromoModuleKey[]
    durationQuantity: number
    durationUnit: PromoDurationUnit
    heuresBonus: number
    maxUses: number | null
    active: boolean
  }>,
) {
  return apiFetch<{ promoCode: PromoCode }>(
    `/api/admin/promo-codes/${id}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
    token,
  )
}

export function deletePromoCode(token: string, id: string) {
  return apiFetch<{ deleted: boolean }>(
    `/api/admin/promo-codes/${id}`,
    { method: 'DELETE' },
    token,
  )
}
