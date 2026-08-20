import { useEffect, useRef, useState } from 'react'
import { resolveCodeAudioUrl } from '../utils/codeAudioUrl'
import {
  playCountdown5to0,
  playGongSound,
  registerActiveAudioElement,
  stopAllQuizAudio,
  unregisterActiveAudioElement,
  type CountdownValue,
} from '../utils/quizSounds'

type Props = {
  questionKey: string
  promptAudioUrl?: string | null
  className?: string
  /** Examens / hors-ligne : uniquement MP3 générés embarqués. */
  offlineOnly?: boolean
  /** Après double lecture + décompte 5→0 + sonnerie (sauf si aborté). */
  onSequenceComplete?: () => void
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
 * Lance l’audio automatiquement (×2), puis décompte 5→0.
 * Si l’autoplay est bloqué, affiche « Écouter l’énoncé ».
 */
export function QuestionAudioSequence({
  questionKey,
  promptAudioUrl,
  className,
  offlineOnly = false,
  onSequenceComplete,
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const cancelledRef = useRef(false)
  const completeRef = useRef(onSequenceComplete)
  completeRef.current = onSequenceComplete
  const gestureResolverRef = useRef<(() => void) | null>(null)
  const [status, setStatus] = useState('')
  const [countdown, setCountdown] = useState<CountdownValue | null>(null)
  const [needsGesture, setNeedsGesture] = useState(false)

  const promptUrl = resolveCodeAudioUrl(promptAudioUrl, { questionKey, offlineOnly })
  const isCancelled = () => cancelledRef.current

  useEffect(() => {
    cancelledRef.current = false
    setCountdown(null)
    setStatus('')
    setNeedsGesture(false)
    gestureResolverRef.current = null

    const el = audioRef.current
    registerActiveAudioElement(el)

    const ensurePlaying = async (label: string) => {
      if (!el || cancelledRef.current) return
      setStatus(label)

      const waitEnded = () =>
        new Promise<void>((resolve) => {
          const finish = () => {
            el.removeEventListener('ended', finish)
            el.removeEventListener('error', finish)
            window.clearTimeout(safety)
            resolve()
          }
          el.addEventListener('ended', finish, { once: true })
          el.addEventListener('error', finish, { once: true })
          const safety = window.setTimeout(finish, 180000)
        })

      el.currentTime = 0

      const tryPlay = () =>
        new Promise<'ok' | 'blocked'>((resolve) => {
          const start = () => {
            void el.play().then(
              () => resolve('ok'),
              () => resolve('blocked'),
            )
          }
          if (el.readyState >= 2) start()
          else {
            el.addEventListener('canplay', start, { once: true })
            window.setTimeout(start, 400)
          }
        })

      const result = await tryPlay()
      if (cancelledRef.current) return

      if (result === 'blocked') {
        setNeedsGesture(true)
        setStatus('Appuie sur Écouter pour lancer l’audio')
        await new Promise<void>((resolve) => {
          gestureResolverRef.current = () => {
            setNeedsGesture(false)
            setStatus(label)
            void el.play().finally(() => resolve())
          }
        })
        gestureResolverRef.current = null
        if (cancelledRef.current) return
      }

      await waitEnded()
    }

    const run = async () => {
      await wait(50, isCancelled)
      if (cancelledRef.current) return

      if (promptUrl && el) {
        await ensurePlaying('Première écoute…')
        if (cancelledRef.current) return
        await wait(PAUSE_MS, isCancelled)
        if (cancelledRef.current) return
        await ensurePlaying('Deuxième écoute…')
        if (cancelledRef.current) return
      }

      setNeedsGesture(false)
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
      gestureResolverRef.current = null
      if (el) {
        el.pause()
        el.currentTime = 0
        el.removeAttribute('src')
        el.load()
      }
      unregisterActiveAudioElement(el)
      stopAllQuizAudio()
      setCountdown(null)
      setStatus('')
      setNeedsGesture(false)
    }
  }, [questionKey, promptUrl])

  return (
    <div className={className}>
      {promptUrl ? (
        <audio
          ref={audioRef}
          src={promptUrl}
          preload="auto"
          playsInline
          controls
          className="learner-quiz-audio-el"
        />
      ) : (
        <p className="learner-quiz-audio-status">Aucun audio pour cette question</p>
      )}
      {needsGesture ? (
        <button
          type="button"
          className="learner-quiz-audio-play"
          onClick={() => gestureResolverRef.current?.()}
        >
          Écouter l’énoncé
        </button>
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
