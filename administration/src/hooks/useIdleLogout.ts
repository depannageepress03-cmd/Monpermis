import { useEffect, useRef } from 'react'

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const

/**
 * Déconnecte après `minutes` d'inactivité (poste partagé, onglet oublié).
 * Le délai est mesuré sur l'horloge réelle : un ordinateur mis en veille est déconnecté au réveil.
 */
export function useIdleLogout(enabled: boolean, onIdle: () => void, minutes = 30) {
  const lastActivity = useRef(Date.now())
  const onIdleRef = useRef(onIdle)
  onIdleRef.current = onIdle

  useEffect(() => {
    if (!enabled) return
    lastActivity.current = Date.now()
    const touch = () => {
      lastActivity.current = Date.now()
    }
    ACTIVITY_EVENTS.forEach((name) => window.addEventListener(name, touch, { passive: true }))
    const check = () => {
      if (Date.now() - lastActivity.current >= minutes * 60_000) onIdleRef.current()
    }
    const timer = window.setInterval(check, 30_000)
    document.addEventListener('visibilitychange', check)
    return () => {
      ACTIVITY_EVENTS.forEach((name) => window.removeEventListener(name, touch))
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', check)
    }
  }, [enabled, minutes])
}
