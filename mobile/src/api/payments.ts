import { apiAuthed, ApiError } from './client'
import type { AccessModuleKey } from './accessRequests'

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

export function paymentStatusLabel(status: PaymentStatus) {
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

export function paymentChannelLabel(channel: string) {
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
  try {
    const data = await apiAuthed<{ payments: PaymentHistoryItem[] }>('/payments/me')
    return data.payments
  } catch (error) {
    if (error instanceof ApiError) throw new PaymentHistoryError(error.message)
    throw new PaymentHistoryError('Chargement impossible')
  }
}
