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

/** Diaporama : une seule image visible, puis la suivante. */
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
      {BANNER_IMAGES.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          className={`code-route-banner-slide${i === index ? ' is-active' : ''}`}
          loading={i === 0 ? 'eager' : 'lazy'}
          draggable={false}
        />
      ))}
      <div className="code-route-banner-dots">
        {BANNER_IMAGES.map((src, i) => (
          <span key={src} className={`code-route-banner-dot${i === index ? ' is-active' : ''}`} />
        ))}
      </div>
    </div>
  )
}
