import { apiFetch, ApiError } from './client'
import { getApiOrigin } from '../utils/mediaUrl'
import type { AccessPayment, LearnerRef, PaymentMethod, PaymentStatus } from './accessRequests'

export type FinanceStatus =
  | PaymentStatus
  | 'needsRefund'
  | 'refunded'

export type FinanceKind = 'abonnement' | 'reservation' | 'autre'

export interface FinanceAmountBucket {
  total: number
  count: number
}

export interface FinancePeriodSummary {
  from: string
  to: string
  encaisse: FinanceAmountBucket
  enAttente: FinanceAmountBucket
  aRembourser: FinanceAmountBucket
  rembourse: FinanceAmountBucket
  outstandingRefunds: FinanceAmountBucket
}

export interface FinanceSummary {
  today: FinancePeriodSummary
  week: FinancePeriodSummary
  month: FinancePeriodSummary
  outstandingRefunds: FinanceAmountBucket
  currency: string
}

export interface FinancePayment extends AccessPayment {
  financeStatus: FinanceStatus
  kind: FinanceKind
  refundResolvedAt?: string | null
  fedapayTransactionId?: string
  lastEventName?: string
  processedEventIds?: string[]
  accessRequests?: {
    id: string
    module?: string
    quantity?: number
    unit?: string
    status?: string
    amount?: number
    currency?: string
  }[]
  reservations?: {
    id: string
    status: string
    paymentStatus: string
    priceFcfa?: number
    startAt?: string
    endAt?: string
  }[]
}

export interface FinanceLedgerEvent {
  id: string
  paymentId: string
  userId: string | null
  kind: FinanceKind
  eventType: string
  fromStatus: string
  toStatus: string
  amount: number
  currency: string
  needsRefund: boolean
  actor: string
  actorLabel: string
  adminId: string | null
  note: string
  fedapayEventId: string
  fedapayEventName: string
  metadata: Record<string, unknown> | null
  createdAt: string
}

export interface FinancePaymentDetail {
  payment: FinancePayment
  timeline: FinanceLedgerEvent[]
  relatedPromos: {
    redemptionId: string
    redeemedAt: string
    code: string
    label: string
    modules: string[]
    heuresBonus: number | null
  }[]
  learnerSoldeHeures: number | null
  rawLastEvent: unknown
}

export interface FinanceLedgerFilters {
  page?: number
  limit?: number
  status?: FinanceStatus | ''
  kind?: FinanceKind | ''
  operator?: 'mtn' | 'moov' | 'celtiis' | ''
  q?: string
  from?: string
  to?: string
}

function buildQuery(filters: FinanceLedgerFilters = {}) {
  const params = new URLSearchParams()
  if (filters.page) params.set('page', String(filters.page))
  if (filters.limit) params.set('limit', String(filters.limit))
  if (filters.status) params.set('status', filters.status)
  if (filters.kind) params.set('kind', filters.kind)
  if (filters.operator) params.set('operator', filters.operator)
  if (filters.q) params.set('q', filters.q)
  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)
  const query = params.toString()
  return query ? `?${query}` : ''
}

export function fetchFinanceSummary(token: string) {
  return apiFetch<FinanceSummary>('/api/admin/finances/summary', {}, token)
}

export function fetchFinanceLedger(token: string, filters: FinanceLedgerFilters = {}) {
  return apiFetch<{
    payments: FinancePayment[]
    pagination: { page: number; limit: number; total: number; pages: number }
  }>(`/api/admin/finances/ledger${buildQuery(filters)}`, {}, token)
}

export function fetchFinancePaymentDetail(token: string, paymentId: string) {
  return apiFetch<FinancePaymentDetail>(`/api/admin/finances/payments/${paymentId}`, {}, token)
}

export function resolveFinanceRefund(token: string, paymentId: string, note: string) {
  return apiFetch<{ payment: FinancePayment }>(
    `/api/admin/finances/payments/${paymentId}/resolve-refund`,
    { method: 'PATCH', body: JSON.stringify({ note }) },
    token,
  )
}

export async function downloadFinanceCsv(token: string, filters: FinanceLedgerFilters = {}) {
  const response = await fetch(`${getApiOrigin()}/api/admin/finances/export.csv${buildQuery(filters)}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    let message = 'Export impossible'
    try {
      const body = (await response.json()) as { error?: string }
      if (body.error) message = body.error
    } catch {
      // ignore
    }
    throw new ApiError(message, response.status)
  }
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `tresorerie-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function financeStatusLabel(status: FinanceStatus | string) {
  switch (status) {
    case 'pending':
      return 'En attente'
    case 'approved':
      return 'Encaissé'
    case 'failed':
      return 'Échoué'
    case 'declined':
      return 'Refusé'
    case 'canceled':
      return 'Annulé'
    case 'needsRefund':
      return 'À rembourser'
    case 'refunded':
      return 'Remboursé'
    default:
      return status
  }
}

export function financeStatusTone(
  status: FinanceStatus | string,
): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'approved') return 'success'
  if (status === 'pending') return 'warning'
  if (status === 'needsRefund') return 'danger'
  if (status === 'refunded') return 'neutral'
  if (status === 'failed' || status === 'declined' || status === 'canceled') return 'danger'
  return 'neutral'
}

export function financeKindLabel(kind: FinanceKind | string) {
  if (kind === 'reservation') return 'Réservation'
  if (kind === 'abonnement') return 'Abonnement'
  return 'Autre'
}

export function ledgerEventLabel(eventType: string) {
  const map: Record<string, string> = {
    created: 'Paiement initié',
    approved: 'Paiement approuvé',
    failed: 'Paiement échoué',
    declined: 'Paiement refusé',
    canceled: 'Paiement annulé',
    needs_refund: 'Signalé à rembourser',
    refund_resolved: 'Remboursement traité',
    note: 'Note',
  }
  return map[eventType] || eventType
}

export type { LearnerRef, PaymentMethod, PaymentStatus }
