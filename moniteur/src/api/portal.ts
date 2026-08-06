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
