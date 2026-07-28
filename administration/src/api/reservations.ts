import { apiFetch, apiUpload } from './client'
import type {
  Creneau,
  Moniteur,
  ReservationAdmin,
  WeeklyAvailabilitySlot,
} from '../types/reservations'

export function fetchMoniteurs(token: string) {
  return apiFetch<{ moniteurs: Moniteur[] }>('/api/admin/conduite/moniteurs', {}, token)
}

export function createMoniteur(
  token: string,
  payload: {
    firstName?: string
    lastName?: string
    fullName?: string
    name?: string
    phone?: string
    specialties?: string[]
    vehicleTypes?: string[]
    defaultPriceFcfa?: number
    vehicleBrand?: string
    vehiclePhotoUrl?: string
    photoUrl?: string
    city?: string
    bio?: string
    photos?: string[]
    videos?: string[]
    weeklyAvailability?: WeeklyAvailabilitySlot[]
  },
) {
  return apiFetch<{ moniteur: Moniteur }>(
    '/api/admin/conduite/moniteurs',
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  )
}

export function updateMoniteur(
  token: string,
  id: string,
  payload: Partial<{
    firstName: string
    lastName: string
    fullName: string
    name: string
    phone: string
    specialties: string[]
    vehicleTypes: string[]
    active: boolean
    defaultPriceFcfa: number
    vehicleBrand: string
    vehiclePhotoUrl: string
    photoUrl: string
    city: string
    bio: string
    photos: string[]
    videos: string[]
    weeklyAvailability: WeeklyAvailabilitySlot[]
  }>,
) {
  return apiFetch<{ moniteur: Moniteur }>(
    `/api/admin/conduite/moniteurs/${id}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
    token,
  )
}

export function deleteMoniteur(token: string, id: string) {
  return apiFetch<{ deleted: boolean }>(
    `/api/admin/conduite/moniteurs/${id}`,
    { method: 'DELETE' },
    token,
  )
}

export function uploadVehiclePhoto(token: string, file: File) {
  const formData = new FormData()
  formData.append('image', file)
  return apiUpload<{ imageUrl: string; imagePublicId?: string; mediaBytes: number }>(
    '/api/admin/conduite/upload-vehicle-photo',
    formData,
    token,
  )
}

export function generateCreneaux(
  token: string,
  payload: {
    moniteurId: string
    fromDate: string
    toDate: string
    vehicleType?: string
    slotMinutes?: number
  },
) {
  return apiFetch<{ createdCount: number; creneaux: Creneau[] }>(
    '/api/admin/conduite/creneaux/generate',
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  )
}

export function createCreneau(
  token: string,
  payload: {
    moniteurId: string
    date: string
    startTime: string
    endTime: string
    vehicleType?: string
    priceFcfa?: number
  },
) {
  return apiFetch<{ creneau: Creneau }>(
    '/api/admin/conduite/creneaux',
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  )
}

export function fetchCreneaux(
  token: string,
  params?: {
    moniteurId?: string
    from?: string
    to?: string
    date?: string
    status?: string
  },
) {
  const query = new URLSearchParams()
  if (params?.moniteurId) query.set('moniteurId', params.moniteurId)
  if (params?.from) query.set('from', params.from)
  if (params?.to) query.set('to', params.to)
  if (params?.date) query.set('date', params.date)
  if (params?.status) query.set('status', params.status)
  const qs = query.toString()
  return apiFetch<{ creneaux: Creneau[] }>(
    `/api/admin/conduite/creneaux${qs ? `?${qs}` : ''}`,
    {},
    token,
  )
}

export function deleteCreneau(token: string, id: string) {
  return apiFetch<{ deleted: boolean; id: string }>(
    `/api/admin/conduite/creneaux/${id}`,
    { method: 'DELETE' },
    token,
  )
}

export function fetchAdminReservations(token: string) {
  return apiFetch<{ reservations: ReservationAdmin[] }>(
    '/api/admin/conduite/reservations',
    {},
    token,
  )
}

export function deleteAdminReservation(token: string, id: string) {
  return apiFetch<{ deleted: boolean; id: string }>(
    `/api/admin/conduite/reservations/${id}`,
    { method: 'DELETE' },
    token,
  )
}

export function cancelAdminReservation(
  token: string,
  id: string,
  payload?: { reason?: string },
) {
  return apiFetch<{ reservation: ReservationAdmin }>(
    `/api/admin/conduite/reservations/${id}/cancel`,
    { method: 'POST', body: JSON.stringify(payload || {}) },
    token,
  )
}
