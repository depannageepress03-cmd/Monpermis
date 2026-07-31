import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AuthUser } from '../api/auth'
import { clearSession, onSessionInvalidated } from '../api/auth'

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem('user') ?? sessionStorage.getItem('user')
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export function persistUser(user: AuthUser) {
  if (localStorage.getItem('user') !== null || localStorage.getItem('token') !== null) {
    localStorage.setItem('user', JSON.stringify(user))
    return
  }
  sessionStorage.setItem('user', JSON.stringify(user))
}

export function useAuth() {
  const navigate = useNavigate()
  // Hydratation synchrone : pas d’écran blanc après l’intro.
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser())
  const [loading] = useState(false)

  useEffect(() => {
    const stored = getStoredUser()
    if (!stored) {
      setUser(null)
      navigate('/', { replace: true })
      return
    }
    setUser(stored)
  }, [navigate])

  useEffect(() => {
    return onSessionInvalidated(() => {
      setUser(null)
      clearSession()
      navigate('/', {
        replace: true,
        state: { message: 'Session expirée. Reconnecte-toi pour continuer.' },
      })
    })
  }, [navigate])

  const updateUser = useCallback((next: AuthUser) => {
    persistUser(next)
    setUser(next)
  }, [])

  return { user, loading, updateUser }
}
