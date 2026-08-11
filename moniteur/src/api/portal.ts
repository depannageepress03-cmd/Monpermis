import { apiFetch } from './client'

export interface CreneauItem {
  id: string
  moniteurId: string
  date: string
  startTime: string
  endTime: string
  vehicleType: string
  status: 'libre' | 'reserve' | 'bloque'
  priceFcfa: number
  editable?: boolean
  reservationStatus?: string | null
}

export interface ReservationItem {
  id: string
  status: string
  paymentStatus: string
  priceFcfa: number
  heuresDebitees: number
  cancellationReason?: string
  cancelledBy?: string
  cancelledAt?: string
  createdAt?: string
  updatedAt?: string
  user: {
    id: string
    firstName: string
    lastName: string
    fullName: string
    phone: string
    email: string
  } | null
  creneau: {
    id: string
    date: string
    startTime: string
    endTime: string
    status: string
  } | null
}

export interface WeeklySlot {
  dayOfWeek: number
  start: string
  end: string
}

export interface DashboardData {
  stats: {
    pending: number
    confirmedUpcoming: number
    confirmedTotal: number
    completed: number
    cancelled: number
    hoursCompleted: number
    totalEarned: number
    monthEarned: number
    totalPaid: number
    outstanding: number
    weeklySlots: number
  }
  pending: ReservationItem[]
  upcoming: ReservationItem[]
  today: ReservationItem[]
  earnings: {
    totalEarned: number
    monthEarned: number
    prevMonthEarned: number
    pendingEarned: number
    totalPaid: number
    outstanding: number
    completedSessions: number
  }
}

export interface EarningsData {
  totals: DashboardData['earnings'] & {
    hoursCompleted: number
    hoursPending: number
    confirmedPendingSessions: number
  }
  recentSessions: {
    id: string
    status: string
    priceFcfa: number
    heures: number
    completedAt?: string
    user: { id: string; fullName: string } | null
    creneau: { date: string; startTime: string; endTime: string } | null
  }[]
  payouts: {
    id: string
    amountFcfa: number
    paidAt: string | null
    note: string
    periodLabel: string
  }[]
}

export interface MoniteurProfile {
  id: string
  firstName: string
  lastName: string
  fullName: string
  email: string
  phone: string
  city: string
  bio: string
  photoUrl: string
  vehicleBrand: string
  vehicleTypes: string[]
  specialties: string[]
  defaultPriceFcfa: number
  activeLogin: boolean
  lastLoginAt: string | null
}

export function fetchMyCreneaux(token: string, from?: string) {
  const query = from ? `?from=${encodeURIComponent(from)}` : ''
  return apiFetch<{ creneaux: CreneauItem[] }>(`/api/moniteur/creneaux${query}`, {}, token)
}

export function createCreneau(
  token: string,
  payload: { date: string; startTime: string; endTime: string },
) {
  return apiFetch<{ creneau: CreneauItem }>(
    '/api/moniteur/creneaux',
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  )
}

export function updateCreneau(
  token: string,
  id: string,
  payload: Partial<{ date: string; startTime: string; endTime: string }>,
) {
  return apiFetch<{ creneau: CreneauItem }>(
    `/api/moniteur/creneaux/${id}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
    token,
  )
}

export function deleteCreneau(token: string, id: string) {
  return apiFetch<{ deleted: boolean }>(
    `/api/moniteur/creneaux/${id}`,
    { method: 'DELETE' },
    token,
  )
}

export function fetchPendingReservations(token: string) {
  return apiFetch<{ reservations: ReservationItem[] }>(
    '/api/moniteur/reservations/pending',
    {},
    token,
  )
}

export function fetchReservations(token: string, scope?: string) {
  const query = scope ? `?scope=${encodeURIComponent(scope)}` : ''
  return apiFetch<{ reservations: ReservationItem[]; today: string }>(
    `/api/moniteur/reservations${query}`,
    {},
    token,
  )
}

export function confirmReservation(token: string, id: string) {
  return apiFetch<{ reservation: ReservationItem }>(
    `/api/moniteur/reservations/${id}/confirm`,
    { method: 'POST', body: '{}' },
    token,
  )
}

export function refuseReservation(token: string, id: string, reason?: string) {
  return apiFetch<{ reservation: ReservationItem }>(
    `/api/moniteur/reservations/${id}/refuse`,
    { method: 'POST', body: JSON.stringify({ reason: reason || '' }) },
    token,
  )
}

export function fetchHistory(token: string, status?: string) {
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  return apiFetch<{ reservations: ReservationItem[] }>(
    `/api/moniteur/reservations/history${query}`,
    {},
    token,
  )
}

export function fetchDashboard(token: string) {
  return apiFetch<DashboardData>('/api/moniteur/dashboard', {}, token)
}

export function fetchAvailability(token: string) {
  return apiFetch<{ weeklyAvailability: WeeklySlot[] }>('/api/moniteur/availability', {}, token)
}

export function saveAvailability(token: string, weeklyAvailability: WeeklySlot[]) {
  return apiFetch<{ weeklyAvailability: WeeklySlot[] }>(
    '/api/moniteur/availability',
    { method: 'PUT', body: JSON.stringify({ weeklyAvailability }) },
    token,
  )
}

export function fetchEarnings(token: string) {
  return apiFetch<EarningsData>('/api/moniteur/earnings', {}, token)
}

export function fetchProfile(token: string) {
  return apiFetch<{ profile: MoniteurProfile }>('/api/moniteur/profile', {}, token)
}

export function updateProfile(
  token: string,
  payload: Partial<{
    phone: string
    city: string
    bio: string
    photoUrl: string
    currentPassword: string
    newPassword: string
  }>,
) {
  return apiFetch<{ profile: MoniteurProfile; moniteur: MoniteurProfile }>(
    '/api/moniteur/profile',
    { method: 'PATCH', body: JSON.stringify(payload) },
    token,
  )
}
