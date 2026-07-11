import { apiFetch, apiUpload } from './client'
import type {
  Creneau,
  Moniteur,
  ReservationAdmin,
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
  return apiUpload<{ imageUrl: string; mediaBytes: number }>(
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

export function fetchAdminReservations(token: string) {
  return apiFetch<{ reservations: ReservationAdmin[] }>(
    '/api/admin/conduite/reservations',
    {},
    token,
  )
}

export function validateReservationPayment(
  token: string,
  id: string,
  payload: { paymentStatus: string; paymentRef?: string },
) {
  return apiFetch<{ reservation: ReservationAdmin }>(
    `/api/admin/conduite/reservations/${id}/payment`,
    { method: 'PATCH', body: JSON.stringify(payload) },
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
