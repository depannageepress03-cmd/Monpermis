import { useEffect, useState } from 'react'

const BANNER_IMAGES = [
  '/code-route/banner-1.jpg',
  '/code-route/banner-2.jpg',
  '/code-route/banner-3.jpg',
  '/code-route/banner-4.jpg',
  '/code-route/banner-5.jpg',
  '/code-route/banner-6.jpg',
] as const

const SLIDE_MS = 3500

/** Diaporama strict : une seule image visible à la fois. */
export function CodeRouteBanner() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % BANNER_IMAGES.length)
    }, SLIDE_MS)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="code-route-banner" aria-hidden="true">
      {/* Une seule <img> montée = impossible d’en voir plusieurs côte à côte */}
      <img
        key={BANNER_IMAGES[index]}
        src={BANNER_IMAGES[index]}
        alt=""
        className="code-route-banner-slide is-active"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
        draggable={false}
      />
      <div className="code-route-banner-dots">
        {BANNER_IMAGES.map((src, i) => (
          <span key={src} className={`code-route-banner-dot${i === index ? ' is-active' : ''}`} />
        ))}
      </div>
      <span className="code-route-banner-count">
        {index + 1}/{BANNER_IMAGES.length}
      </span>
    </div>
  )
}
