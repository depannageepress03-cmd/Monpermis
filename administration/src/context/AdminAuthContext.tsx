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
import { fetchAdminMe, loginAdmin, type AdminUser } from '../api/auth'

const TOKEN_KEY = 'monpermis_admin_token'

interface AdminAuthContextValue {
  admin: AdminUser | null
  loading: boolean
  signIn: (phone: string, password: string) => Promise<void>
  signOut: () => void
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null)

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)

  const signOut = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY)
    setAdmin(null)
  }, [])

  useEffect(() => {
    const token = sessionStorage.getItem(TOKEN_KEY)
    if (!token) {
      setLoading(false)
      return
    }

    fetchAdminMe(token)
      .then(({ admin: me }) => setAdmin(me))
      .catch(() => sessionStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false))
  }, [])

  const signIn = useCallback(async (phone: string, password: string) => {
    const { admin: loggedIn, token } = await loginAdmin(phone, password)
    sessionStorage.setItem(TOKEN_KEY, token)
    setAdmin(loggedIn)
  }, [])

  const value = useMemo(
    () => ({ admin, loading, signIn, signOut }),
    [admin, loading, signIn, signOut],
  )

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) throw new Error('useAdminAuth doit être utilisé dans AdminAuthProvider')
  return ctx
}

export function getAdminToken() {
  return sessionStorage.getItem(TOKEN_KEY)
}

export function isAuthError(error: unknown) {
  return error instanceof ApiError
}
