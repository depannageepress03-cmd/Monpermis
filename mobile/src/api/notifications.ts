import { apiAuthed, ApiError } from './client'

export interface AppNotification {
  id: string
  type: string
  title: string
  body: string
  link: string
  read: boolean
  createdAt: string
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  try {
    return await apiAuthed<T>(path, options)
  } catch (error) {
    if (error instanceof ApiError) throw new Error(error.message)
    throw error
  }
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
