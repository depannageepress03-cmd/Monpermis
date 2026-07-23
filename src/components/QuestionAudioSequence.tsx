import { useEffect, useRef, useState } from 'react'
import { resolveMediaUrl } from '../utils/mediaUrl'
import {
  playCountdown5to0,
  playGongSound,
  type CountdownValue,
} from '../utils/quizSounds'

type Props = {
  questionKey: string
  promptAudioUrl?: string | null
  className?: string
  /** Après double lecture + décompte 5→0 + sonnerie (sauf si aborté). */
  onSequenceComplete?: () => void
}

const PAUSE_MS = 600

function cleanUrl(url?: string | null) {
  const value = url?.trim() || ''
  return value ? resolveMediaUrl(value) : ''
}

function wait(ms: number, isCancelled?: () => boolean) {
  return new Promise<void>((resolve) => {
    const started = Date.now()
    const tick = () => {
      if (isCancelled?.()) {
        resolve()
        return
      }
      if (Date.now() - started >= ms) {
        resolve()
        return
      }
      window.setTimeout(tick, Math.min(80, ms - (Date.now() - started)))
    }
    tick()
  })
}

/**
 * Lance l’audio automatiquement (×2), puis décompte 5→0.
 * Si le parent démonte le composant (Continuer), tout s’arrête sans décompte.
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
  const [countdown, setCountdown] = useState<CountdownValue | null>(null)

  const promptUrl = cleanUrl(promptAudioUrl)
  const isCancelled = () => cancelledRef.current

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
        const tryPlay = () => {
          void el.play().catch(() => finish())
        }
        if (el.readyState >= 2) tryPlay()
        else {
          el.addEventListener('canplay', tryPlay, { once: true })
          window.setTimeout(tryPlay, 300)
        }
      })

    const run = async () => {
      // Petit délai pour laisser le <audio> se monter / charger
      await wait(50, isCancelled)
      if (cancelledRef.current) return

      if (promptUrl && el) {
        setStatus('Écoute…')
        await playOnce('Première écoute…')
        if (cancelledRef.current) return
        await wait(PAUSE_MS, isCancelled)
        if (cancelledRef.current) return
        await playOnce('Deuxième écoute…')
        if (cancelledRef.current) return
      }

      setStatus('Décompte…')
      await playCountdown5to0((n) => {
        if (!cancelledRef.current) setCountdown(n)
      }, isCancelled)
      if (cancelledRef.current) return

      setStatus('Temps !')
      await playGongSound()
      if (cancelledRef.current) return

      setCountdown(null)
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
      setCountdown(null)
      setStatus('')
    }
  }, [questionKey, promptUrl])

  return (
    <div className={className}>
      {promptUrl ? (
        <audio ref={audioRef} src={promptUrl} preload="auto" autoPlay hidden />
      ) : null}
      {countdown !== null ? (
        <div className="learner-quiz-countdown" aria-live="polite">
          {countdown}
        </div>
      ) : null}
      {status ? <p className="learner-quiz-audio-status">{status}</p> : null}
    </div>
  )
}
