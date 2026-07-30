import { useCallback, useState } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { fetchAccessMe, type AccessMe } from '../api/accessRequests'
import { cacheGetThenFetch, cacheSet } from '../utils/contentCache'
import { useAuth } from '../context/AuthContext'

/** Accès abonnement partagé (cache immédiat + revalidation au focus). */
export function useAccessMe(options?: { revalidateOnFocus?: boolean }) {
  const { user } = useAuth()
  const revalidateOnFocus = options?.revalidateOnFocus !== false
  const [accessMe, setAccessMe] = useState<AccessMe | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(
    async (silent = false) => {
      if (!user) {
        setAccessMe(null)
        setLoading(false)
        return null
      }
      if (!silent) setLoading(true)
      setError(null)
      try {
        const data = await cacheGetThenFetch(`access:me:${user.id}`, () => fetchAccessMe(), {
          maxAgeMs: 0,
          onData: (next) => {
            setAccessMe(next)
            setLoading(false)
          },
        })
        return data
      } catch (err) {
        setAccessMe(null)
        setError(err instanceof Error ? err.message : 'Chargement impossible')
        return null
      } finally {
        setLoading(false)
      }
    },
    [user],
  )

  useFocusEffect(
    useCallback(() => {
      if (!user || !revalidateOnFocus) return
      void fetchAccessMe()
        .then(async (data) => {
          setAccessMe(data)
          await cacheSet(`access:me:${user.id}`, data)
        })
        .catch(() => undefined)
    }, [user, revalidateOnFocus]),
  )

  return { accessMe, loading, error, reload, setAccessMe }
}
