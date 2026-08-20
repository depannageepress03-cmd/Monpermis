import { useEffect, useRef, useState } from 'react'
import { resolveCodeAudioUrl } from '../utils/codeAudioUrl'
import {
  playCountdown5to0,
  playGongSound,
  stopAllQuizAudio,
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
 * Lecture ×2 + décompte, démarrée par un clic utilisateur
 * (évite autoplay bloqué + bugs StrictMode sur <audio> auto-monté).
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
  const cancelledRef = useRef(false)
  const runningRef = useRef(false)
  const completeRef = useRef(onSequenceComplete)
  completeRef.current = onSequenceComplete
  const listenPassRef = useRef(onListenPass)
  listenPassRef.current = onListenPass

  const [status, setStatus] = useState('Appuie sur Écouter pour démarrer')
  const [countdown, setCountdown] = useState<CountdownValue | null>(null)
  const [busy, setBusy] = useState(false)

  const promptUrl = resolveCodeAudioUrl(promptAudioUrl, { questionKey, offlineOnly })
  const isCancelled = () => cancelledRef.current

  useEffect(() => {
    cancelledRef.current = false
    runningRef.current = false
    setBusy(false)
    setCountdown(null)
    setStatus(promptUrl ? 'Appuie sur Écouter pour démarrer' : 'Aucun audio')
    stopAllQuizAudio()

    return () => {
      cancelledRef.current = true
      runningRef.current = false
      const el = audioRef.current
      if (el) {
        el.pause()
        el.currentTime = 0
      }
      stopAllQuizAudio()
    }
  }, [questionKey, promptUrl])

  const playOnce = (el: HTMLAudioElement, label: string, pass: 1 | 2) =>
    new Promise<'ok' | 'error'>((resolve) => {
      if (isCancelled()) {
        resolve('error')
        return
      }
      listenPassRef.current?.(pass)
      setStatus(label)

      const finish = (result: 'ok' | 'error') => {
        el.removeEventListener('ended', onEnded)
        el.removeEventListener('error', onError)
        window.clearTimeout(safety)
        resolve(result)
      }
      const onEnded = () => finish('ok')
      const onError = () => finish('error')
      el.addEventListener('ended', onEnded, { once: true })
      el.addEventListener('error', onError, { once: true })
      const safety = window.setTimeout(() => finish(el.currentTime > 0 ? 'ok' : 'error'), 180000)

      try {
        el.currentTime = 0
      } catch {
        // ignore
      }

      const tryPlay = () => {
        if (isCancelled()) {
          finish('error')
          return
        }
        void el.play().then(
          () => undefined,
          () => finish('error'),
        )
      }

      if (el.readyState >= 2) tryPlay()
      else {
        el.addEventListener('canplay', tryPlay, { once: true })
        el.load()
        window.setTimeout(tryPlay, 400)
      }
    })

  const handleStart = () => {
    if (!promptUrl || runningRef.current || isCancelled()) return
    const el = audioRef.current
    if (!el) {
      setStatus('Lecteur audio indisponible')
      return
    }

    runningRef.current = true
    setBusy(true)
    cancelledRef.current = false

    void (async () => {
      try {
        // Unlock / play within the click gesture
        await playOnce(el, 'Première écoute…', 1)
        if (isCancelled()) return
        await wait(PAUSE_MS, isCancelled)
        if (isCancelled()) return
        await playOnce(el, 'Deuxième écoute…', 2)
        if (isCancelled()) return

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
      } finally {
        runningRef.current = false
        setBusy(false)
      }
    })()
  }

  return (
    <div className={className}>
      {!promptUrl ? (
        <p className="learner-quiz-audio-status">Aucun audio pour cette question</p>
      ) : (
        <>
          <audio
            ref={audioRef}
            key={`${questionKey}:${promptUrl}`}
            src={promptUrl}
            controls
            preload="auto"
            playsInline
            className="learner-quiz-audio-el"
          />
          <button
            type="button"
            className="learner-quiz-audio-play"
            onClick={handleStart}
            disabled={busy}
          >
            {busy ? 'Lecture en cours…' : 'Écouter l’énoncé (2 fois)'}
          </button>
        </>
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
