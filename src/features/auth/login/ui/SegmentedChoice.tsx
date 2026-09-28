import { useRef } from 'react'
import { Mail, Phone } from 'lucide-react'
import type { LoginMethod } from '../useLoginPhase'

interface SegmentedChoiceProps {
  value: LoginMethod
  onChange: (method: LoginMethod) => void
}

export function SegmentedChoice({ value, onChange }: SegmentedChoiceProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([])
  const options: Array<{ value: LoginMethod; label: string; Icon: typeof Mail }> = [
    { value: 'email', label: 'E-mail', Icon: Mail },
    { value: 'phone', label: 'Téléphone', Icon: Phone },
  ]

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return
    event.preventDefault()
    const next = value === 'email' ? 'phone' : 'email'
    onChange(next)
    refs.current[next === 'email' ? 0 : 1]?.focus()
  }

  return (
    <div className="login-segmented" role="radiogroup" aria-label="Type d’identifiant" onKeyDown={handleKeyDown}>
      {options.map(({ value: option, label, Icon }, index) => (
        <button
          key={option}
          ref={(element) => { refs.current[index] = element }}
          className={`login-segmented__option ${option === value ? 'is-active' : ''}`}
          type="button"
          role="radio"
          aria-checked={option === value}
          tabIndex={option === value ? 0 : -1}
          onClick={() => onChange(option)}
        >
          <Icon size={16} strokeWidth={2} aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  )
}
