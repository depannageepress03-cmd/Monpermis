type Props = {
  current: number
  total: number
  size?: number
}

/** Anneau de progression animé pour les quiz. */
export function QuizProgressRing({ current, total, size = 44 }: Props) {
  const safeTotal = Math.max(total, 1)
  const ratio = Math.min(Math.max(current / safeTotal, 0), 1)
  const stroke = 3.5
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - ratio)

  return (
    <span
      className="learner-quiz-ring learner-quiz-ring--svg"
      style={{ width: size, height: size, ['--ring-circ' as string]: `${c}px` }}
      aria-hidden="true"
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          className="learner-quiz-ring-track"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
        />
        <circle
          className="learner-quiz-ring-fill"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="learner-quiz-ring-label">
        {current}/{total}
      </span>
    </span>
  )
}
