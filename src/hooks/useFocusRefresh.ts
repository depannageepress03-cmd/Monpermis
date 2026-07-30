import { useEffect } from 'react'

/** Refetch on tab focus / visibility — replaces aggressive interval polling. */
export function useFocusRefresh(enabled: boolean, refresh: () => void) {
  useEffect(() => {
    if (!enabled) return
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', refresh)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', refresh)
    }
  }, [enabled, refresh])
}
