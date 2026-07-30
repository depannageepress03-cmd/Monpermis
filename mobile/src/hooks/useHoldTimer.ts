import { useEffect, useRef, useState } from 'react'

function formatRemaining(ms: number): string {
  if (ms <= 0) return '0:00'
  const totalSec = Math.ceil(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${String(sec).padStart(2, '0')}`
}

export function useHoldTimer(expiresAt: string | null | undefined, onExpired?: () => void) {
  const [remainingMs, setRemainingMs] = useState<number | null>(null)
  const onExpiredRef = useRef(onExpired)
  onExpiredRef.current = onExpired
  const firedRef = useRef(false)

  useEffect(() => {
    firedRef.current = false
    if (!expiresAt) {
      setRemainingMs(null)
      return
    }
    const end = new Date(expiresAt).getTime()
    if (!Number.isFinite(end)) {
      setRemainingMs(null)
      return
    }

    const tick = () => {
      const left = end - Date.now()
      if (left <= 0) {
        setRemainingMs(0)
        if (!firedRef.current) {
          firedRef.current = true
          onExpiredRef.current?.()
        }
        return false
      }
      setRemainingMs(left)
      return true
    }

    if (!tick()) return
    const id = setInterval(() => {
      if (!tick()) clearInterval(id)
    }, 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  return {
    remainingMs,
    label: remainingMs != null ? formatRemaining(remainingMs) : null,
    expired: remainingMs === 0,
    active: remainingMs != null && remainingMs > 0,
  }
}
