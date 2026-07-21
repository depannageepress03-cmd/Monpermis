import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AuthUser } from '../api/auth'

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
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = getStoredUser()
    if (!stored) {
      navigate('/', { replace: true })
      return
    }
    setUser(stored)
    setLoading(false)
  }, [navigate])

  const updateUser = useCallback((next: AuthUser) => {
    persistUser(next)
    setUser(next)
  }, [])

  return { user, loading, updateUser }
}
