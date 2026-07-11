import { useEffect, useRef } from 'react'
import { resolveMediaUrl } from '../utils/mediaUrl'

type Props = {
  src?: string | null
  className?: string
}

/**
 * Lecture automatique de l’audio d’énoncé à l’arrivée sur une question.
 * Garde aussi les contrôles pour réécouter.
 */
export function AutoPlayAudio({ src, className }: Props) {
  const ref = useRef<HTMLAudioElement | null>(null)
  const url = resolveMediaUrl(src)

  useEffect(() => {
    const el = ref.current
    if (!el || !url) return

    el.pause()
    el.currentTime = 0

    const tryPlay = () => {
      void el.play().catch(() => {
        // Certains navigateurs bloquent l’autoplay sans geste utilisateur.
      })
    }

    if (el.readyState >= 2) {
      tryPlay()
    } else {
      el.addEventListener('canplay', tryPlay, { once: true })
    }

    return () => {
      el.pause()
      el.removeEventListener('canplay', tryPlay)
    }
  }, [url])

  if (!url) return null

  return <audio ref={ref} className={className} controls src={url} preload="auto" />
}
