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
import { fetchMoniteurMe, loginMoniteur, type MoniteurUser } from '../api/auth'

const TOKEN_KEY = 'monpermis_moniteur_token'

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
    localStorage.removeItem(TOKEN_KEY)
    setMoniteur(null)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      setLoading(false)
      return
    }
    fetchMoniteurMe(token)
      .then(({ moniteur: me }) => setMoniteur(me))
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY)
        setMoniteur(null)
      })
      .finally(() => setLoading(false))
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const { moniteur: loggedIn, token, homePath } = await loginMoniteur(email, password)
    localStorage.setItem(TOKEN_KEY, token)
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
  return localStorage.getItem(TOKEN_KEY)
}

export function isAuthError(error: unknown) {
  return error instanceof ApiError
}
