import { getApiBase } from './config'
import type { AccessModuleKey } from './accessRequests'
import { getStoredToken, invalidateSessionIfUnauthorized } from './auth'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

function getToken() {
  return getStoredToken()
}

export class PaymentHistoryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PaymentHistoryError'
  }
}

export type PaymentStatus = 'pending' | 'approved' | 'declined' | 'canceled' | 'failed'
export type PaymentKind = 'abonnement' | 'reservation' | 'autre'

export interface PaymentHistoryLine {
  module: AccessModuleKey
  label: string
  quantity: number
  unit: string
  amount: number
  status: string
  startAt?: string | null
  endAt?: string | null
}

export interface PaymentHistoryItem {
  id: string
  kind: PaymentKind
  title: string
  modules: AccessModuleKey[]
  lines: PaymentHistoryLine[]
  moniteurName?: string
  method: 'fedapay' | 'manual'
  amount: number
  currency: string
  status: PaymentStatus
  paymentMethod: string
  fedapayReference: string
  errorMessage: string
  createdAt: string
  activatedAt?: string | null
}

export const paymentStatusLabel = (status: PaymentStatus) => {
  switch (status) {
    case 'approved':
      return 'Payé'
    case 'pending':
      return 'En attente'
    case 'declined':
      return 'Refusé'
    case 'canceled':
      return 'Annulé'
    default:
      return 'Échoué'
  }
}

export const paymentChannelLabel = (channel: string) => {
  switch (channel) {
    case 'mtn':
      return 'MTN MoMo'
    case 'moov':
      return 'Moov Money'
    case 'celtiis':
      return 'Celtiis Cash'
    default:
      return channel || 'Mobile Money'
  }
}

export async function fetchMyPayments() {
  const token = getToken()
  if (!token) throw new PaymentHistoryError('Authentification requise')

  const response = await fetch(`${getApiBase()}/payments/me`, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  })
  const body = (await response.json().catch(() => ({}))) as ApiResponse<{
    payments: PaymentHistoryItem[]
  }>

  if (!response.ok || !body.success || !body.data) {
    invalidateSessionIfUnauthorized(response.status)
    throw new PaymentHistoryError(body.error ?? 'Chargement impossible')
  }
  return body.data.payments
}
