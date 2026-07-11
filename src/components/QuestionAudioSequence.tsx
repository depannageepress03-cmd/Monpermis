import { useEffect, useMemo, useRef, useState } from 'react'
import { resolveMediaUrl } from '../utils/mediaUrl'

type Props = {
  questionKey: string
  promptAudioUrl?: string | null
  answerAudioUrls?: (string | null | undefined)[]
  className?: string
}

function cleanUrl(url?: string | null) {
  const value = url?.trim() || ''
  return value ? resolveMediaUrl(value) : ''
}

/**
 * Enchaîne : audio question → audios des réponses (cachés).
 * L’apprenant ne voit que le lecteur de l’énoncé (pour réécouter).
 */
export function QuestionAudioSequence({
  questionKey,
  promptAudioUrl,
  answerAudioUrls = [],
  className,
}: Props) {
  const promptRef = useRef<HTMLAudioElement | null>(null)
  const answerRefs = useRef<(HTMLAudioElement | null)[]>([])
  const [status, setStatus] = useState('')

  const promptUrl = cleanUrl(promptAudioUrl)
  const answerUrls = useMemo(
    () => answerAudioUrls.map(cleanUrl).filter(Boolean),
    [answerAudioUrls],
  )

  useEffect(() => {
    let cancelled = false
    const promptEl = promptRef.current
    const answerEls = answerRefs.current.filter(Boolean) as HTMLAudioElement[]

    const stopAll = () => {
      if (promptEl) {
        promptEl.pause()
        promptEl.currentTime = 0
      }
      answerEls.forEach((el) => {
        el.pause()
        el.currentTime = 0
      })
    }

    const playElement = (el: HTMLAudioElement) =>
      new Promise<void>((resolve) => {
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
      stopAll()
      if (cancelled) return

      if (promptUrl && promptEl) {
        setStatus('Écoute de la question…')
        if (promptEl.readyState < 2) {
          await new Promise<void>((resolve) => {
            promptEl.addEventListener('canplay', () => resolve(), { once: true })
          })
        }
        if (cancelled) return
        await playElement(promptEl)
      }

      for (let i = 0; i < answerEls.length; i += 1) {
        if (cancelled) return
        setStatus(`Écoute du choix ${String.fromCharCode(97 + i).toUpperCase()}…`)
        const el = answerEls[i]
        if (el.readyState < 2) {
          await new Promise<void>((resolve) => {
            el.addEventListener('canplay', () => resolve(), { once: true })
          })
        }
        if (cancelled) return
        await playElement(el)
      }

      if (!cancelled) setStatus('')
    }

    void run()

    return () => {
      cancelled = true
      stopAll()
    }
  }, [questionKey, promptUrl, answerUrls])

  if (!promptUrl && answerUrls.length === 0) return null

  return (
    <div className={className}>
      {promptUrl ? (
        <audio ref={promptRef} controls src={promptUrl} preload="auto" />
      ) : (
        <audio ref={promptRef} preload="auto" hidden />
      )}
      {answerUrls.map((url, index) => (
        <audio
          key={`${questionKey}-ans-${index}-${url}`}
          ref={(el) => {
            answerRefs.current[index] = el
          }}
          src={url}
          preload="auto"
          hidden
        />
      ))}
      {status ? <p className="learner-quiz-audio-status">{status}</p> : null}
    </div>
  )
}
