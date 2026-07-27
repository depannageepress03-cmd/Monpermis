import { getApiBase } from './config'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  code?: string
}

function getToken() {
  return localStorage.getItem('token') ?? sessionStorage.getItem('token')
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
  const token = getToken()
  if (!token) throw new AccessRequestError('Authentification requise')

  const response = await fetch(`${getApiBase()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options?.headers as Record<string, string> | undefined),
    },
  })
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
export type PaymentMethod = 'fedapay' | 'manual'

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

export interface AccessMe {
  access: Record<AccessModuleKey, boolean>
  pendingRequest: AccessRequest | null
  requests: AccessRequest[]
  user: { soldeHeures: number }
}

export const fetchAccessModules = () =>
  request<{ modules: AccessModule[] }>('/access-requests/modules').then((data) => data.modules)

export const fetchAccessMe = () => request<AccessMe>('/access-requests/me')

export const createAccessRequest = (payload: { module: AccessModuleKey; quantity: number; method: PaymentMethod }) =>
  request<{
    accessRequest: AccessRequest
    payment?: { id: string }
    paymentUrl?: string
    callbackUrl?: string
  }>('/access-requests/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const declareAccessPayment = (
  id: string,
  payload: { declaredReference: string; note: string },
) =>
  request<{ accessRequest: AccessRequest }>(`/access-requests/${id}/declare-payment`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const syncAccessRequest = (id: string) =>
  request<{ accessRequest: AccessRequest; access: AccessMe }>(`/access-requests/${id}/sync`, {
    method: 'POST',
  })
