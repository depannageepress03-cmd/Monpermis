import { apiFetch } from './client'

export interface AdminAccount {
  id: string
  fullName: string
  phone: string
  role: string
  isActive: boolean
  lastLoginAt?: string | null
  createdAt: string
  updatedAt?: string
}

export interface AuditLogEntry {
  id: string
  adminId: string | null
  adminName: string
  action: string
  resource: string
  resourceId: string | null
  metadata: Record<string, unknown> | null
  ip: string | null
  userAgent: string | null
  createdAt: string
}

export interface AuditLogsResult {
  logs: AuditLogEntry[]
  pagination: { page: number; limit: number; total: number; pages: number }
  filters: { actions: string[]; resources: string[] }
}

export interface AuditLogsQuery {
  page?: number
  limit?: number
  adminId?: string
  action?: string
  resource?: string
  from?: string
  to?: string
  q?: string
}

function toQuery(params: AuditLogsQuery) {
  const search = new URLSearchParams()
  if (params.page) search.set('page', String(params.page))
  if (params.limit) search.set('limit', String(params.limit))
  if (params.adminId) search.set('adminId', params.adminId)
  if (params.action) search.set('action', params.action)
  if (params.resource) search.set('resource', params.resource)
  if (params.from) search.set('from', params.from)
  if (params.to) search.set('to', params.to)
  if (params.q) search.set('q', params.q)
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export function fetchAdmins(token: string) {
  return apiFetch<{ admins: AdminAccount[] }>('/api/admin/admins', {}, token)
}

export function fetchAdminDetail(token: string, adminId: string, limit = 40) {
  return apiFetch<{ admin: AdminAccount; recentActions: AuditLogEntry[] }>(
    `/api/admin/admins/${adminId}?limit=${limit}`,
    {},
    token,
  )
}

export function fetchAuditLogs(token: string, query: AuditLogsQuery = {}) {
  return apiFetch<AuditLogsResult>(`/api/admin/audit-logs${toQuery(query)}`, {}, token)
}

export interface UpdateAdminPayload {
  isActive?: boolean
  role?: 'admin' | 'superadmin'
  password?: string
}

export function updateAdmin(token: string, adminId: string, payload: UpdateAdminPayload) {
  return apiFetch<{ admin: AdminAccount }>(
    `/api/admin/admins/${adminId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    },
    token,
  )
}
