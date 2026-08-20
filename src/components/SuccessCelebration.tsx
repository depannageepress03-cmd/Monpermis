import type { ReactNode } from 'react'
import { Check } from 'lucide-react'

type Props = {
  title: string
  subtitle?: ReactNode
  passed?: boolean
  children?: ReactNode
}

/** Écran de succès avec check animé (quiz, réservation). */
export function SuccessCelebration({ title, subtitle, passed = true, children }: Props) {
  return (
    <div className={`mp-success${passed ? ' is-pass' : ' is-neutral'}`}>
      <div className="mp-success-icon-wrap" aria-hidden="true">
        <span className="mp-success-icon">
          <Check size={30} strokeWidth={2.5} />
        </span>
      </div>
      <h2 className="mp-success-title">{title}</h2>
      {subtitle ? <div className="mp-success-subtitle">{subtitle}</div> : null}
      {children ? <div className="mp-success-actions">{children}</div> : null}
    </div>
  )
}
