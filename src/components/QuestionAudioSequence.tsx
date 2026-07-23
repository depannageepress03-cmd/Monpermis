import { useEffect, useRef, useState } from 'react'
import { resolveMediaUrl } from '../utils/mediaUrl'
import { playCountdown123, playGongSound } from '../utils/quizSounds'

type Props = {
  questionKey: string
  promptAudioUrl?: string | null
  className?: string
  /** Appelé après double lecture + décompte 1→3 + sonnerie. */
  onSequenceComplete?: () => void
}

const PAUSE_MS = 600

function cleanUrl(url?: string | null) {
  const value = url?.trim() || ''
  return value ? resolveMediaUrl(value) : ''
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

/**
 * Double lecture de l’audio unique, puis décompte 1→3 et sonnerie.
 */
export function QuestionAudioSequence({
  questionKey,
  promptAudioUrl,
  className,
  onSequenceComplete,
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const cancelledRef = useRef(false)
  const completeRef = useRef(onSequenceComplete)
  completeRef.current = onSequenceComplete
  const [status, setStatus] = useState('')
  const [countdown, setCountdown] = useState<1 | 2 | 3 | null>(null)

  const promptUrl = cleanUrl(promptAudioUrl)

  useEffect(() => {
    cancelledRef.current = false
    setCountdown(null)
    setStatus('')

    const el = audioRef.current

    const playOnce = (label: string) =>
      new Promise<void>((resolve) => {
        if (!el || cancelledRef.current) {
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

    const run = async () => {
      if (promptUrl && el) {
        if (el.readyState < 2) {
          await new Promise<void>((resolve) => {
            el.addEventListener('canplay', () => resolve(), { once: true })
            window.setTimeout(() => resolve(), 4000)
          })
        }
        if (cancelledRef.current) return
        await playOnce('Première écoute…')
        if (cancelledRef.current) return
        await wait(PAUSE_MS)
        if (cancelledRef.current) return
        await playOnce('Deuxième écoute…')
        if (cancelledRef.current) return
      }

      setStatus('Décompte…')
      await playCountdown123((n) => {
        if (!cancelledRef.current) setCountdown(n)
      })
      if (cancelledRef.current) return

      setCountdown(null)
      setStatus('Temps !')
      await playGongSound()
      if (cancelledRef.current) return

      setStatus('')
      completeRef.current?.()
    }

    void run()

    return () => {
      cancelledRef.current = true
      if (el) {
        el.pause()
        el.currentTime = 0
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [questionKey, promptUrl])

  return (
    <div className={className}>
      {promptUrl ? <audio ref={audioRef} src={promptUrl} preload="auto" hidden /> : null}
      {countdown ? (
        <div className="learner-quiz-countdown" aria-live="polite">
          {countdown}
        </div>
      ) : null}
      {status ? <p className="learner-quiz-audio-status">{status}</p> : null}
    </div>
  )
}
