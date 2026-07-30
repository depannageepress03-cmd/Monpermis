import { apiAuthed } from './client'

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
  try {
    const data = await apiAuthed<{ announcements: Announcement[] }>(
      `/content/announcements?limit=${Math.min(limit, 50)}`,
    )
    return data.announcements
  } catch {
    return []
  }
}

export async function fetchAnnouncement(id: string): Promise<Announcement | null> {
  if (!id) return null
  try {
    const data = await apiAuthed<{ announcement: Announcement }>(
      `/content/announcements/${encodeURIComponent(id)}`,
    )
    return data.announcement
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
