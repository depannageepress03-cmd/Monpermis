import { apiFetch } from './client'

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
  subscriptions: {
    active: number
    pending: number
    expired: number
  }
}

export function fetchDashboardSummary(token: string) {
  return apiFetch<{ summary: DashboardSummary }>('/api/admin/dashboard/summary', {}, token)
}
