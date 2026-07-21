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
  createdAt: string
}

function getToken() {
  return localStorage.getItem('token') ?? sessionStorage.getItem('token')
}

export async function fetchAnnouncements(): Promise<Announcement[]> {
  const token = getToken()
  if (!token) return []
  try {
    const response = await fetch(`${getApiBase()}/content/announcements`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    })
    const body = (await response.json().catch(() => ({}))) as ApiResponse<{
      announcements: Announcement[]
    }>
    if (!response.ok || !body.success || !body.data) return []
    return body.data.announcements
  } catch {
    return []
  }
}
