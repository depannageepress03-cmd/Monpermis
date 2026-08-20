import { useEffect, useState } from 'react'

/** Active le verre dépoli sur la navbar après un léger scroll. */
export function useStickyGlassNav(enabled = true) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    if (!enabled) return

    const onScroll = () => {
      setScrolled(window.scrollY > 10)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [enabled])

  return scrolled
}
