import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  AuthUser,
  clearSession,
  getStoredToken,
  getStoredUser,
  onSessionInvalidated,
  probeSession,
  saveSession,
} from '../api/auth'
import { showAppToast } from '../components/AppToast'

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  signIn: (token: string, user: AuthUser) => Promise<void>
  signOut: () => Promise<void>
  updateUser: (user: AuthUser) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const stored = await getStoredUser()
        if (!stored) {
          if (!cancelled) setUser(null)
          return
        }
        const stillValid = await probeSession()
        if (cancelled) return
        if (!stillValid) {
          setUser(null)
          return
        }
        setUser(stored)
      } catch (error) {
        console.warn('Session locale illisible, réinitialisation:', error)
        await clearSession()
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return onSessionInvalidated(() => {
      setUser(null)
      showAppToast('Session expirée. Reconnecte-toi pour continuer.', 'error')
    })
  }, [])

  const signIn = useCallback(async (token: string, nextUser: AuthUser) => {
    await saveSession(token, nextUser)
    setUser(nextUser)
  }, [])

  const signOut = useCallback(async () => {
    await clearSession()
    setUser(null)
  }, [])

  const updateUser = useCallback(async (nextUser: AuthUser) => {
    const token = await getStoredToken()
    if (token) await saveSession(token, nextUser)
    setUser(nextUser)
  }, [])

  const value = useMemo(
    () => ({ user, loading, signIn, signOut, updateUser }),
    [user, loading, signIn, signOut, updateUser],
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
