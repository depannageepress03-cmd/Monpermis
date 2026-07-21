import { useFocusEffect } from '@react-navigation/native'
import { useCallback, useState } from 'react'
import { fetchUnreadCount } from '../api/notifications'

/** Compteur de notifications non lues, rafraîchi à chaque focus d’écran. */
export function useUnreadNotifications(enabled = true) {
  const [unreadCount, setUnreadCount] = useState(0)

  useFocusEffect(
    useCallback(() => {
      if (!enabled) return
      let cancelled = false
      fetchUnreadCount()
        .then(({ unreadCount }) => {
          if (!cancelled) setUnreadCount(unreadCount)
        })
        .catch(() => {
          if (!cancelled) setUnreadCount(0)
        })
      return () => {
        cancelled = true
      }
    }, [enabled]),
  )

  return unreadCount
}
