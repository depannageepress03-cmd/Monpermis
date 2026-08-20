import { useEffect, useMemo, useState } from 'react'

type Props = {
  text: string
  /** Relance l’animation (id question, n° d’écoute…). */
  resetKey: string
  /** Si false, affiche le texte complet sans animation. */
  progressive?: boolean
  className?: string
}

/**
 * Sous-titres d’énoncé : le texte apparaît mot à mot, comme un sous-titrage.
 * Réservé à la révision (entraînement chapitre).
 */
export function ProgressiveSubtitles({
  text,
  resetKey,
  progressive = true,
  className = '',
}: Props) {
  const full = String(text || '').trim()
  const tokens = useMemo(() => {
    if (!full) return [] as string[]
    return full.split(/(\s+)/).filter((t) => t.length > 0)
  }, [full])

  const wordCount = useMemo(
    () => tokens.filter((t) => !/^\s+$/.test(t)).length,
    [tokens],
  )

  const [visibleWords, setVisibleWords] = useState(progressive ? 0 : wordCount)

  useEffect(() => {
    if (!progressive || wordCount === 0) {
      setVisibleWords(wordCount)
      return
    }
    setVisibleWords(0)
    // ~2,8 mots/s — rythme proche d’une lecture TTS.
    const msPerWord = 320
    let shown = 0
    const id = window.setInterval(() => {
      shown += 1
      setVisibleWords(shown)
      if (shown >= wordCount) window.clearInterval(id)
    }, msPerWord)
    return () => window.clearInterval(id)
  }, [resetKey, progressive, wordCount])

  if (!full) return null

  let wordsSeen = 0
  const visible = tokens
    .map((token) => {
      if (/^\s+$/.test(token)) return token
      wordsSeen += 1
      return wordsSeen <= visibleWords ? token : ''
    })
    .join('')
    .replace(/\s+$/g, '')

  return (
    <div
      className={`learner-quiz-subtitles${className ? ` ${className}` : ''}`}
      aria-live="polite"
    >
      <p className="learner-quiz-subtitles-kicker">Sous-titres</p>
      <p className="learner-quiz-subtitles-text">
        {visible || '\u00a0'}
        {progressive && visibleWords < wordCount ? (
          <span className="learner-quiz-subtitles-caret" aria-hidden="true">
            |
          </span>
        ) : null}
      </p>
    </div>
  )
}
