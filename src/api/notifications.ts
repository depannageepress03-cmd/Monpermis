import { getApiBase } from './config'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface AppNotification {
  id: string
  type: string
  title: string
  body: string
  link: string
  read: boolean
  createdAt: string
}

function getToken() {
  return localStorage.getItem('token') ?? sessionStorage.getItem('token')
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken()
  if (!token) throw new Error('Authentification requise')

  const response = await fetch(`${getApiBase()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options?.headers as Record<string, string> | undefined),
    },
  })
  const body = (await response.json().catch(() => ({}))) as ApiResponse<T>
  if (!response.ok || !body.success || body.data === undefined) {
    throw new Error(body.error ?? 'Action impossible')
  }
  return body.data
}

export function fetchNotifications() {
  return request<{ unreadCount: number; notifications: AppNotification[] }>('/notifications')
}

export function fetchUnreadCount() {
  return request<{ unreadCount: number }>('/notifications/unread-count')
}

export function markNotificationRead(id: string) {
  return request<{ notification: AppNotification }>(`/notifications/${id}/read`, {
    method: 'PATCH',
  })
}

export function markAllNotificationsRead() {
  return request<{ message: string }>('/notifications/read-all', { method: 'POST' })
}
