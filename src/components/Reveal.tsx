import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'

type RevealProps = {
  children: ReactNode
  className?: string
  /** Délai d’entrée (ms) une fois visible */
  delay?: number
  /** Variante d’animation */
  variant?: 'up' | 'fade' | 'scale' | 'blur'
  as?: 'div' | 'section' | 'li'
  /** Si true, révèle dès le mount (contenu above-the-fold) */
  eager?: boolean
}

/**
 * Révélation au scroll — style Apple (fade + rise, once).
 * Respecte prefers-reduced-motion.
 */
export function Reveal({
  children,
  className = '',
  delay = 0,
  variant = 'up',
  as: Tag = 'div',
  eager = false,
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const reveal = () => el.classList.add('is-revealed')

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduced || eager) {
      reveal()
      return
    }

    // Déjà visible au premier paint → pas d’opacity bloquée à 0
    const rect = el.getBoundingClientRect()
    const vh = window.innerHeight || document.documentElement.clientHeight
    if (rect.top < vh * 0.95 && rect.bottom > 0) {
      reveal()
      return
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        reveal()
        io.disconnect()
      },
      { threshold: 0.05, rootMargin: '0px 0px 40px 0px' },
    )

    io.observe(el)
    return () => io.disconnect()
  }, [eager])

  const style = { '--reveal-delay': `${delay}ms` } as CSSProperties

  return (
    <Tag
      ref={ref as never}
      className={`mp-reveal mp-reveal--${variant}${className ? ` ${className}` : ''}`}
      style={style}
    >
      {children}
    </Tag>
  )
}
