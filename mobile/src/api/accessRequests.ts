import { getStoredToken } from './auth'
import { getApiBase } from './config'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  code?: string
}

export class AccessRequestError extends Error {
  code?: string

  constructor(message: string, code?: string) {
    super(message)
    this.name = 'AccessRequestError'
    this.code = code
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = await getStoredToken()
  if (!token) throw new AccessRequestError('Authentification requise')

  const url = `${getApiBase()}${path}`
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...options?.headers,
  }

  let response: Response | null = null
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      response = await fetch(url, { ...options, headers })
      break
    } catch {
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)))
      }
    }
  }

  if (!response) {
    throw new AccessRequestError(
      'Impossible de joindre le serveur. Vérifiez votre connexion ou réessayez dans quelques secondes.',
    )
  }

  const body = (await response.json().catch(() => ({}))) as ApiResponse<T>
  if (!response.ok || !body.success || body.data === undefined) {
    throw new AccessRequestError(body.error ?? 'Action impossible', body.code)
  }
  return body.data
}

export type AccessModuleKey = 'code' | 'conduite_heures' | 'conduite_videos' | 'ecodepermis' | 'aiChat'
export type AccessModuleUnit = 'flat' | 'month' | 'hour' | 'week'
export type AccessRequestStatus =
  | 'en_attente'
  | 'paiement_declare'
  | 'en_verification'
  | 'valide'
  | 'actif'
  | 'expire'
  | 'rejete'
export type MobileMoneyOperator = 'mtn' | 'moov' | 'celtiis'

export interface AccessModule {
  key: AccessModuleKey
  label: string
  unit: AccessModuleUnit
  price: number
  currency: string
  active: boolean
  hoursDiscount?: number
  amountForTwoHours?: number | null
}

export interface AccessRequest {
  id: string
  module: AccessModuleKey
  status: AccessRequestStatus
  quantity: number
  amount: number
  currency: string
  unit: AccessModuleUnit
  startAt: string | null
  endAt: string | null
  lastDecisionNote: string
  createdAt: string
  updatedAt: string
}

export interface AccessPaymentSummary {
  id: string
  accessRequestId: string
  accessRequestIds?: string[]
  method: 'fedapay'
  amount: number
  currency: string
  status: 'pending' | 'approved' | 'declined' | 'canceled' | 'failed'
  paymentUrl: string
  paymentMethod?: string
  fedapayReference: string
  callbackUrl?: string
  errorMessage: string
  createdAt: string
  updatedAt: string
}

export interface AccessMe {
  access: Record<AccessModuleKey, boolean>
  pendingRequest: AccessRequest | null
  pendingPayment: AccessPaymentSummary | null
  requests: AccessRequest[]
  user: { soldeHeures: number }
}

export interface CheckoutCartItem {
  module: AccessModuleKey
  quantity: number
}

export interface MobileMoneyCheckoutResult {
  payment: AccessPaymentSummary
  accessRequest: AccessRequest
  accessRequests: AccessRequest[]
  operator: MobileMoneyOperator
  phone: string
  country: string
  access: AccessMe
  message: string
}

export interface CheckoutResult {
  accessRequest: AccessRequest
  payment?: AccessPaymentSummary | null
  paymentUrl?: string
  callbackUrl?: string
  resumed?: boolean
  alreadyActive?: boolean
  access?: AccessMe
}

export function computeModuleAmount(module: AccessModuleKey, unitPrice: number, quantity = 1) {
  const qty = Math.max(1, Number(quantity) || 1)
  let amount = Math.round(Number(unitPrice) || 0) * qty
  if (module === 'conduite_heures' && qty >= 2) amount = Math.max(0, amount - 1000)
  return amount
}

export const fetchAccessModules = () =>
  request<{ modules: AccessModule[] }>('/access-requests/modules').then((data) => data.modules)

export const fetchAccessMe = () => request<AccessMe>('/access-requests/me')

export const redeemPromoCode = (code: string) =>
  request<{ modules: string[]; access: AccessMe }>('/promo-codes/redeem', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })

export const quoteAccessCart = (items: CheckoutCartItem[]) =>
  request<{
    lines: Array<{
      module: AccessModuleKey
      label: string
      quantity: number
      amount: number
      discountApplied: number
    }>
    total: number
    currency: string
  }>('/access-requests/quote', {
    method: 'POST',
    body: JSON.stringify({ items }),
  })

export const checkoutMobileMoney = (payload: {
  items: CheckoutCartItem[]
  operator: MobileMoneyOperator
  country?: string
  phone: string
  replace?: boolean
}) =>
  request<MobileMoneyCheckoutResult>('/access-requests/checkout', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const createAccessRequest = (payload: {
  module: AccessModuleKey
  quantity: number
  replace?: boolean
}) =>
  request<CheckoutResult>('/access-requests/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const cancelAccessRequest = (id: string) =>
  request<{ accessRequest: AccessRequest; access: AccessMe }>(`/access-requests/${id}/cancel`, {
    method: 'POST',
  })

export const syncAccessRequest = (id: string) =>
  request<{
    accessRequest: AccessRequest
    accessRequests?: AccessRequest[]
    payment?: AccessPaymentSummary
    access: AccessMe
  }>(`/access-requests/${id}/sync`, { method: 'POST' })
