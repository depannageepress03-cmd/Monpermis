import { useEffect, useRef, useState } from 'react'

type Props = {
  value: number
  duration?: number
  className?: string
}

/** Compte animé style Apple (ease-out expo). */
export function AnimatedCounter({ value, duration = 520, className = '' }: Props) {
  const [display, setDisplay] = useState(0)
  const reducedRef = useRef(false)

  useEffect(() => {
    reducedRef.current =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reducedRef.current) {
      setDisplay(value)
      return
    }

    let raf = 0
    const start = performance.now()
    const from = display

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - (1 - t) ** 3
      setDisplay(Math.round(from + (value - from) * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- animate on value change only
  }, [value, duration])

  return <span className={className}>{display}</span>
}
