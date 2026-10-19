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
import { useIdleLogout } from '../hooks/useIdleLogout'
import { fetchMoniteurMe, loginMoniteur, logoutMoniteur, type MoniteurUser } from '../api/auth'

const TOKEN_KEY = 'monpermis_moniteur_token'

function readToken() {
  const current = sessionStorage.getItem(TOKEN_KEY)
  if (current) return current
  const legacy = localStorage.getItem(TOKEN_KEY)
  if (!legacy) return null
  sessionStorage.setItem(TOKEN_KEY, legacy)
  localStorage.removeItem(TOKEN_KEY)
  return legacy
}

function writeToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token)
  localStorage.removeItem(TOKEN_KEY)
}

function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(TOKEN_KEY)
}

interface MoniteurAuthContextValue {
  moniteur: MoniteurUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ homePath: string }>
  signOut: () => void
}

const MoniteurAuthContext = createContext<MoniteurAuthContextValue | null>(null)

export function MoniteurAuthProvider({ children }: { children: ReactNode }) {
  const [moniteur, setMoniteur] = useState<MoniteurUser | null>(null)
  const [loading, setLoading] = useState(true)

  const signOut = useCallback(() => {
    const token = readToken()
    if (token) void logoutMoniteur(token).catch(() => undefined)
    clearToken()
    setMoniteur(null)
  }, [])

  // Session moniteur : fermée après 30 min sans activité.
  useIdleLogout(Boolean(moniteur), signOut)

  useEffect(() => {
    const token = readToken()
    if (!token) {
      setLoading(false)
      return
    }
    fetchMoniteurMe(token)
      .then(({ moniteur: me }) => setMoniteur(me))
      .catch(() => {
        clearToken()
        setMoniteur(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { moniteur: loggedIn, token, homePath } = await loginMoniteur(email, password)
    writeToken(token)
    setMoniteur(loggedIn)
    return { homePath: homePath || '/' }
  }, [])

  const value = useMemo(
    () => ({ moniteur, loading, signIn, signOut }),
    [moniteur, loading, signIn, signOut],
  )

  return <MoniteurAuthContext.Provider value={value}>{children}</MoniteurAuthContext.Provider>
}

export function useMoniteurAuth() {
  const ctx = useContext(MoniteurAuthContext)
  if (!ctx) throw new Error('useMoniteurAuth doit être utilisé dans MoniteurAuthProvider')
  return ctx
}

export function getMoniteurToken() {
  return readToken()
}

export function isAuthError(error: unknown) {
  return error instanceof ApiError
}
