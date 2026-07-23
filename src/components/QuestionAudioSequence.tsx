import { useCallback, useEffect, useRef, useState } from 'react'
import { resolveMediaUrl } from '../utils/mediaUrl'

type Props = {
  questionKey: string
  promptAudioUrl?: string | null
  className?: string
}

const PAUSE_MS = 600

function cleanUrl(url?: string | null) {
  const value = url?.trim() || ''
  return value ? resolveMediaUrl(value) : ''
}

/**
 * Joue l’audio unique (question + choix) deux fois d’affilée.
 * Bouton « Réécouter » relance la double lecture.
 */
export function QuestionAudioSequence({ questionKey, promptAudioUrl, className }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const cancelledRef = useRef(false)
  const [status, setStatus] = useState('')
  const [playing, setPlaying] = useState(false)

  const promptUrl = cleanUrl(promptAudioUrl)

  const playTwice = useCallback(async () => {
    const el = audioRef.current
    if (!el || !promptUrl) return

    cancelledRef.current = false
    setPlaying(true)

    const playOnce = (label: string) =>
      new Promise<void>((resolve) => {
        if (cancelledRef.current) {
          resolve()
          return
        }
        setStatus(label)
        const finish = () => {
          el.removeEventListener('ended', finish)
          el.removeEventListener('error', finish)
          resolve()
        }
        el.addEventListener('ended', finish, { once: true })
        el.addEventListener('error', finish, { once: true })
        el.currentTime = 0
        void el.play().catch(() => finish())
      })

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, ms)
      })

    try {
      if (el.readyState < 2) {
        await new Promise<void>((resolve) => {
          el.addEventListener('canplay', () => resolve(), { once: true })
        })
      }
      if (cancelledRef.current) return

      await playOnce('Première écoute…')
      if (cancelledRef.current) return

      await wait(PAUSE_MS)
      if (cancelledRef.current) return

      await playOnce('Deuxième écoute…')
    } finally {
      if (!cancelledRef.current) {
        setStatus('')
        setPlaying(false)
      }
    }
  }, [promptUrl])

  useEffect(() => {
    cancelledRef.current = false
    void playTwice()

    return () => {
      cancelledRef.current = true
      const el = audioRef.current
      if (el) {
        el.pause()
        el.currentTime = 0
      }
    }
  }, [questionKey, promptUrl, playTwice])

  if (!promptUrl) return null

  return (
    <div className={className}>
      <audio ref={audioRef} src={promptUrl} preload="auto" hidden />
      <button
        type="button"
        className="learner-quiz-replay"
        disabled={playing}
        onClick={() => void playTwice()}
      >
        Réécouter
      </button>
      {status ? <p className="learner-quiz-audio-status">{status}</p> : null}
    </div>
  )
}
