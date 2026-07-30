import { useCallback, useEffect, useRef } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'

/** Refetch on screen focus and when app returns to foreground. */
export function useFocusRefresh(enabled: boolean, refresh: () => void) {
  const refreshRef = useRef(refresh)
  refreshRef.current = refresh

  useFocusEffect(
    useCallback(() => {
      if (!enabled) return
      refreshRef.current()
    }, [enabled]),
  )

  useEffect(() => {
    if (!enabled) return
    const onChange = (state: AppStateStatus) => {
      if (state === 'active') refreshRef.current()
    }
    const sub = AppState.addEventListener('change', onChange)
    return () => sub.remove()
  }, [enabled])
}
