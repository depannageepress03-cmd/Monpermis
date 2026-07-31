import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ApiError } from '../api/client'
import {
  fetchAdminMe,
  loginAdmin,
  type AdminCapabilities,
  type AdminUser,
  type LoginOptions,
} from '../api/auth'
import { isSuperAdminRole } from '../utils/roles'

const TOKEN_KEY = 'monpermis_admin_token'

export type SignInResult = {
  homePath: string
  admin: AdminUser
}

interface AdminAuthContextValue {
  admin: AdminUser | null
  capabilities: AdminCapabilities
  loading: boolean
  /** Accès gestion admins / audit / finances (superadmin, ou migration). */
  canManageAdmins: boolean
  signIn: (phone: string, password: string, options?: LoginOptions) => Promise<SignInResult>
  signOut: () => void
}

const defaultCapabilities: AdminCapabilities = { manageAdmins: false }

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null)

function resolveCapabilities(
  admin: AdminUser | null,
  capabilities?: AdminCapabilities,
): AdminCapabilities {
  if (capabilities) return capabilities
  const manageAdmins = isSuperAdminRole(admin?.role)
  return {
    manageAdmins,
    viewFinances: manageAdmins,
    viewActivity: manageAdmins,
    manageRefunds: manageAdmins,
  }
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [capabilities, setCapabilities] = useState<AdminCapabilities>(defaultCapabilities)
  const [loading, setLoading] = useState(true)

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setAdmin(null)
    setCapabilities(defaultCapabilities)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      setLoading(false)
      return
    }

    fetchAdminMe(token)
      .then(({ admin: me, capabilities: caps }) => {
        setAdmin(me)
        setCapabilities(resolveCapabilities(me, caps))
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY)
        setAdmin(null)
        setCapabilities(defaultCapabilities)
      })
      .finally(() => setLoading(false))
  }, [])

  const signIn = useCallback(async (phone: string, password: string, options: LoginOptions = {}) => {
    const { admin: loggedIn, token, homePath } = await loginAdmin(phone, password, options)
    localStorage.setItem(TOKEN_KEY, token)
    setAdmin(loggedIn)

    let resolved = resolveCapabilities(loggedIn)
    try {
      const me = await fetchAdminMe(token)
      setAdmin(me.admin)
      resolved = resolveCapabilities(me.admin, me.capabilities)
      setCapabilities(resolved)
    } catch {
      setCapabilities(resolved)
    }

    const path =
      homePath ||
      (resolved.manageAdmins || isSuperAdminRole(loggedIn.role) ? '/cockpit' : '/')

    return { homePath: path, admin: loggedIn }
  }, [])

  const canManageAdmins = Boolean(capabilities.manageAdmins)

  const value = useMemo(
    () => ({ admin, capabilities, loading, canManageAdmins, signIn, signOut }),
    [admin, capabilities, loading, canManageAdmins, signIn, signOut],
  )

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) throw new Error('useAdminAuth doit être utilisé dans AdminAuthProvider')
  return ctx
}

export function getAdminToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function isAuthError(error: unknown) {
  return error instanceof ApiError
}
