import { useEffect, useRef, useState } from 'react'
import { resolveCodeAudioUrl } from '../utils/codeAudioUrl'
import {
  playCountdown5to0,
  playGongSound,
  unlockQuizAudio,
  type CountdownValue,
} from '../utils/quizSounds'

type Props = {
  questionKey: string
  promptAudioUrl?: string | null
  className?: string
  offlineOnly?: boolean
  onSequenceComplete?: () => void
  onListenPass?: (pass: 1 | 2) => void
}

const PAUSE_MS = 600

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
 * Dès l’ouverture de la question : audio ×2 + sous-titres (via onListenPass), puis décompte.
 * Pas de bouton « Écouter » — le clic sur la question (liste) débloque l’audio.
 */
export function QuestionAudioSequence({
  questionKey,
  promptAudioUrl,
  className,
  offlineOnly = false,
  onSequenceComplete,
  onListenPass,
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const runIdRef = useRef(0)
  const completeRef = useRef(onSequenceComplete)
  completeRef.current = onSequenceComplete
  const listenPassRef = useRef(onListenPass)
  listenPassRef.current = onListenPass

  const [status, setStatus] = useState('')
  const [countdown, setCountdown] = useState<CountdownValue | null>(null)

  const promptUrl = resolveCodeAudioUrl(promptAudioUrl, { questionKey, offlineOnly })

  useEffect(() => {
    const runId = ++runIdRef.current
    const isCancelled = () => runIdRef.current !== runId

    setCountdown(null)
    setStatus('')
    unlockQuizAudio()

    // Sous-titres dès le début (en même temps que l’audio)
    listenPassRef.current?.(1)

    const el = audioRef.current

    const playOnce = (label: string, pass: 1 | 2) =>
      new Promise<void>((resolve) => {
        if (!el || isCancelled() || !promptUrl) {
          resolve()
          return
        }
        listenPassRef.current?.(pass)
        setStatus(label)

        const finish = () => {
          el.removeEventListener('ended', finish)
          el.removeEventListener('error', finish)
          window.clearTimeout(safety)
          resolve()
        }
        el.addEventListener('ended', finish, { once: true })
        el.addEventListener('error', finish, { once: true })
        const safety = window.setTimeout(finish, 180000)

        try {
          el.currentTime = 0
        } catch {
          // ignore
        }

        const tryPlay = () => {
          if (isCancelled()) {
            finish()
            return
          }
          void el.play().then(
            () => undefined,
            () => finish(),
          )
        }

        if (el.readyState >= 2) tryPlay()
        else {
          el.addEventListener('canplay', tryPlay, { once: true })
          window.setTimeout(tryPlay, 250)
        }
      })

    const run = async () => {
      // Laisse le <audio> se monter avec le src
      await wait(30, isCancelled)
      if (isCancelled()) return

      if (promptUrl && el) {
        setStatus('Première écoute…')
        await playOnce('Première écoute…', 1)
        if (isCancelled()) return
        await wait(PAUSE_MS, isCancelled)
        if (isCancelled()) return
        await playOnce('Deuxième écoute…', 2)
        if (isCancelled()) return
      }

      setStatus('Décompte…')
      await playCountdown5to0((n) => {
        if (!isCancelled()) setCountdown(n)
      }, isCancelled)
      if (isCancelled()) return

      setStatus('Temps !')
      await playGongSound()
      if (isCancelled()) return

      setCountdown(null)
      setStatus('')
      completeRef.current?.()
    }

    void run()

    return () => {
      runIdRef.current += 1
      if (el) {
        el.pause()
        try {
          el.currentTime = 0
        } catch {
          // ignore
        }
      }
      setCountdown(null)
      setStatus('')
    }
  }, [questionKey, promptUrl])

  return (
    <div className={className}>
      {promptUrl ? (
        <audio
          ref={audioRef}
          key={`${questionKey}:${promptUrl}`}
          src={promptUrl}
          preload="auto"
          playsInline
          hidden
        />
      ) : (
        <p className="learner-quiz-audio-status">Aucun audio pour cette question</p>
      )}
      {countdown !== null ? (
        <div className="learner-quiz-countdown" aria-live="polite">
          {countdown}
        </div>
      ) : null}
      {status ? <p className="learner-quiz-audio-status">{status}</p> : null}
    </div>
  )
}
