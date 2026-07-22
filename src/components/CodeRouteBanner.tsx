import { useEffect, useState } from 'react'

/** Diaporama : toutes les images empilées, fondu d’opacité très fluide. */
const BANNER_IMAGES = [
  '/code-route/banner-1.jpg',
  '/code-route/banner-2.jpg',
  '/code-route/banner-3.jpg',
  '/code-route/banner-4.jpg',
  '/code-route/banner-5.jpg',
  '/code-route/banner-6.jpg',
] as const

const HOLD_MS = 6000
/** Fondu croisé long = changement presque imperceptible */
const CROSSFADE_MS = 2800

/** Diaporama : toutes les images empilées, fondu d’opacité très fluide. */
export function CodeRouteBanner() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    BANNER_IMAGES.forEach((src) => {
      const img = new Image()
      img.src = src
    })
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIndex((prev) => (prev + 1) % BANNER_IMAGES.length)
    }, HOLD_MS)
    return () => window.clearTimeout(timer)
  }, [index])

  return (
    <div
      className="code-route-banner"
      style={{ ['--banner-crossfade' as string]: `${CROSSFADE_MS}ms` }}
    >
      <div className="code-route-banner-stack" aria-hidden="true">
        {BANNER_IMAGES.map((src, i) => (
          <img
            key={src}
            src={src}
            alt=""
            className={`code-route-banner-slide${i === index ? ' is-active' : ''}`}
            draggable={false}
          />
        ))}
      </div>
      <div className="code-route-banner-fade" aria-hidden="true" />
      <div className="code-route-banner-caption">
        <p className="code-route-banner-title">Code de la route</p>
        <p className="code-route-banner-text">
          Révision, examens test et examen blanc — avancez à votre rythme.
        </p>
      </div>
      <div className="code-route-banner-dots" aria-hidden="true">
        {BANNER_IMAGES.map((src, i) => (
          <span key={src} className={`code-route-banner-dot${i === index ? ' is-active' : ''}`} />
        ))}
      </div>
    </div>
  )
}
