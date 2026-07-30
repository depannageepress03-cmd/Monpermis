import { apiFetch } from './client'
import { getApiOrigin } from '../utils/mediaUrl'
import type { AccessModuleKey, AccessPayment, PaymentStatus } from './accessRequests'

export interface DashboardPayment extends AccessPayment {
  module: AccessModuleKey | null
  /** Modules couverts par un panier multi-offres. */
  modules?: AccessModuleKey[]
  accessRequestStatus?: string | null
}

export interface DashboardSummary {
  users: {
    total: number
    active: number
    suspended: number
  }
  code: {
    chapters: number
    published: number
    courses: number
    questions: number
  }
  conduite: {
    chapters: number
    published: number
    courses: number
    moniteurs: number
    moniteursActive: number
    creneauxLibre: number
    reservations: number
    reservationsPending: number
    reservationsConfirmed: number
  }
  admins: {
    total: number
  }
  revenue: {
    currency: string
    total: number
    month: number
    transactions: number
  }
  accessRequests: {
    active: number
    pending: number
    expired: number
  }
  payments: {
    pending: number
    needsRefund: number
    recent: DashboardPayment[]
  }
}

export function fetchDashboardSummary(token: string) {
  return apiFetch<{ summary: DashboardSummary }>('/api/admin/dashboard/summary', {}, token)
}

/**
 * Flux SSE paiements / demandes d’accès (Authorization via fetch — EventSource ne le permet pas).
 */
export function subscribeToDashboardPaymentEvents(
  token: string,
  onPayment: (payment: DashboardPayment) => void,
  onStatusChange?: (connected: boolean) => void,
): () => void {
  const controller = new AbortController()

  void (async () => {
    while (!controller.signal.aborted) {
      try {
        const response = await fetch(`${getApiOrigin()}/api/admin/access-requests/payments/stream`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        if (!response.ok || !response.body) throw new Error('Flux indisponible')

        onStatusChange?.(true)
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          const events = buffer.split('\n\n')
          buffer = events.pop() ?? ''
          for (const chunk of events) {
            const line = chunk.split('\n').find((l) => l.startsWith('data: '))
            if (!line) continue
            try {
              const parsed = JSON.parse(line.slice(6)) as {
                type: string
                payment?: DashboardPayment
              }
              if (parsed.type === 'payment.updated' && parsed.payment) {
                onPayment(parsed.payment)
              }
            } catch {
              // ignore trame invalide
            }
          }
        }
      } catch {
        if (controller.signal.aborted) return
      }
      onStatusChange?.(false)
      if (controller.signal.aborted) return
      await new Promise((resolve) => setTimeout(resolve, 3000))
    }
  })()

  return () => controller.abort()
}

export function paymentStatusLabel(status: PaymentStatus) {
  switch (status) {
    case 'approved':
      return 'Payé'
    case 'declined':
      return 'Refusé'
    case 'canceled':
      return 'Annulé'
    case 'failed':
      return 'Échoué'
    default:
      return 'En attente'
  }
}
