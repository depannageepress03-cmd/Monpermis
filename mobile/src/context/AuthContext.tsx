import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AuthUser, clearSession, getStoredUser, saveSession } from '../api/auth'

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  signIn: (token: string, user: AuthUser) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    getStoredUser()
      .then((stored) => {
        if (!cancelled) setUser(stored)
      })
      .catch((error) => {
        console.warn('Session locale illisible, réinitialisation:', error)
        void clearSession()
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const signIn = useCallback(async (token: string, nextUser: AuthUser) => {
    await saveSession(token, nextUser)
    setUser(nextUser)
  }, [])

  const signOut = useCallback(async () => {
    await clearSession()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, signIn, signOut }),
    [user, loading, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
