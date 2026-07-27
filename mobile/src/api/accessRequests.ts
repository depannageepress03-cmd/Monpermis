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

export interface AccessModule {
  key: AccessModuleKey
  label: string
  unit: AccessModuleUnit
  price: number
  currency: string
  active: boolean
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
  method: 'fedapay'
  amount: number
  currency: string
  status: 'pending' | 'approved' | 'declined' | 'canceled' | 'failed'
  paymentUrl: string
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

export interface CheckoutResult {
  accessRequest: AccessRequest
  payment?: AccessPaymentSummary | null
  paymentUrl?: string
  callbackUrl?: string
  resumed?: boolean
  alreadyActive?: boolean
  access?: AccessMe
}

export const fetchAccessModules = () =>
  request<{ modules: AccessModule[] }>('/access-requests/modules').then((data) => data.modules)

export const fetchAccessMe = () => request<AccessMe>('/access-requests/me')

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
  request<{ accessRequest: AccessRequest; payment?: AccessPaymentSummary; access: AccessMe }>(
    `/access-requests/${id}/sync`,
    { method: 'POST' },
  )
