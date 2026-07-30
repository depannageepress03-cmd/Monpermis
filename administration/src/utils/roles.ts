export type AdminRole = 'admin' | 'superadmin'

export function isSuperAdminRole(role?: string | null): boolean {
  return role === 'superadmin'
}

export function roleLabel(role?: string | null): string {
  return role === 'superadmin' ? 'Superadmin' : 'Admin'
}
