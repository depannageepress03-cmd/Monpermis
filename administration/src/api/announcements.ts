import { apiFetch } from './client'

export type AnnouncementKind = 'info' | 'promo' | 'alerte'

export interface Announcement {
  id: string
  title: string
  body: string
  kind: AnnouncementKind
  active: boolean
  broadcastAt: string | null
  createdAt: string
  updatedAt: string
}

export interface AnnouncementInput {
  title: string
  body: string
  kind: AnnouncementKind
  active: boolean
}

export function fetchAnnouncements(token: string) {
  return apiFetch<{ announcements: Announcement[] }>('/api/admin/announcements', {}, token)
}

export function createAnnouncement(input: AnnouncementInput, token: string) {
  return apiFetch<{ announcement: Announcement; broadcastCount: number }>(
    '/api/admin/announcements',
    { method: 'POST', body: JSON.stringify(input) },
    token,
  )
}

export function updateAnnouncement(id: string, input: Partial<AnnouncementInput>, token: string) {
  return apiFetch<{ announcement: Announcement }>(
    `/api/admin/announcements/${id}`,
    { method: 'PATCH', body: JSON.stringify(input) },
    token,
  )
}

export function deleteAnnouncement(id: string, token: string) {
  return apiFetch<{ message: string }>(
    `/api/admin/announcements/${id}`,
    { method: 'DELETE' },
    token,
  )
}
