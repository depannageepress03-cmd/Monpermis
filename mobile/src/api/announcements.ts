import { getStoredToken, invalidateSessionIfUnauthorized } from './auth'
import { getApiBase } from './config'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface Announcement {
  id: string
  title: string
  body: string
  kind: 'info' | 'promo' | 'alerte'
  audience?: 'all' | 'active' | 'code' | 'conduite'
  ctaUrl?: string
  imageUrl?: string
  createdAt: string
  expiresAt?: string | null
}

export async function fetchAnnouncements(limit = 20): Promise<Announcement[]> {
  const token = await getStoredToken()
  if (!token) return []
  try {
    const response = await fetch(
      `${getApiBase()}/content/announcements?limit=${Math.min(limit, 50)}`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    )
    const body = (await response.json().catch(() => ({}))) as ApiResponse<{
      announcements: Announcement[]
    }>
    if (!response.ok || !body.success || !body.data) {
      await invalidateSessionIfUnauthorized(response.status)
      return []
    }
    return body.data.announcements
  } catch {
    return []
  }
}

export async function fetchAnnouncement(id: string): Promise<Announcement | null> {
  const token = await getStoredToken()
  if (!token || !id) return null
  try {
    const response = await fetch(`${getApiBase()}/content/announcements/${encodeURIComponent(id)}`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    const body = (await response.json().catch(() => ({}))) as ApiResponse<{
      announcement: Announcement
    }>
    if (!response.ok || !body.success || !body.data) {
      await invalidateSessionIfUnauthorized(response.status)
      return null
    }
    return body.data.announcement
  } catch {
    return null
  }
}

export function announcementLooksLikeHtml(value?: string | null): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(String(value ?? ''))
}

export function stripAnnouncementHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
