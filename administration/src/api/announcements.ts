import { apiFetch, apiUpload } from './client'

export type AnnouncementKind = 'info' | 'promo' | 'alerte'
export type AnnouncementAudience = 'all' | 'active' | 'code' | 'conduite'

export interface Announcement {
  id: string
  title: string
  body: string
  kind: AnnouncementKind
  audience: AnnouncementAudience
  active: boolean
  scheduledAt: string | null
  expiresAt: string | null
  ctaUrl: string
  imageUrl: string
  imagePublicId: string
  viewCount: number
  broadcastAt: string | null
  createdAt: string
  updatedAt: string
}

export interface AnnouncementInput {
  title: string
  body: string
  kind: AnnouncementKind
  audience?: AnnouncementAudience
  active?: boolean
  scheduledAt?: string | null
  expiresAt?: string | null
  ctaUrl?: string
  imageUrl?: string
  imagePublicId?: string
  /** Si true, diffuse en notification après save/publish. */
  notify?: boolean
}

export function fetchAnnouncements(
  token: string,
  params?: { q?: string; status?: string },
) {
  const search = new URLSearchParams()
  if (params?.q) search.set('q', params.q)
  if (params?.status) search.set('status', params.status)
  const qs = search.toString()
  return apiFetch<{ announcements: Announcement[] }>(
    `/api/admin/announcements${qs ? `?${qs}` : ''}`,
    {},
    token,
  )
}

export function fetchRecipientCount(audience: AnnouncementAudience, token: string) {
  return apiFetch<{ audience: AnnouncementAudience; count: number }>(
    `/api/admin/announcements/recipient-count?audience=${encodeURIComponent(audience)}`,
    {},
    token,
  )
}

export function createAnnouncement(input: AnnouncementInput, token: string) {
  return apiFetch<{ announcement: Announcement; broadcastCount: number }>(
    '/api/admin/announcements',
    { method: 'POST', body: JSON.stringify(input) },
    token,
  )
}

export function updateAnnouncement(id: string, input: Partial<AnnouncementInput>, token: string) {
  return apiFetch<{ announcement: Announcement; broadcastCount: number }>(
    `/api/admin/announcements/${id}`,
    { method: 'PATCH', body: JSON.stringify(input) },
    token,
  )
}

export function publishAnnouncement(id: string, notify: boolean, token: string) {
  return apiFetch<{ announcement: Announcement; broadcastCount: number }>(
    `/api/admin/announcements/${id}/publish`,
    { method: 'POST', body: JSON.stringify({ notify }) },
    token,
  )
}

export function renotifyAnnouncement(id: string, token: string) {
  return apiFetch<{ announcement: Announcement; broadcastCount: number }>(
    `/api/admin/announcements/${id}/notify`,
    { method: 'POST', body: JSON.stringify({}) },
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

export function uploadAnnouncementImage(file: File, token: string) {
  const formData = new FormData()
  formData.append('image', file)
  return apiUpload<{ imageUrl: string; imagePublicId: string; mediaBytes: number }>(
    '/api/admin/announcements/upload-image',
    formData,
    token,
  )
}
