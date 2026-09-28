import { Check, Eye, EyeOff, type LucideIcon } from 'lucide-react'
import type { ChangeEvent, FocusEvent, InputHTMLAttributes, ReactNode, Ref } from 'react'

interface AuthFieldProps {
  id: string
  label: string
  value: string
  type: InputHTMLAttributes<HTMLInputElement>['type']
  placeholder: string
  autoComplete: string
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode']
  icon: LucideIcon
  error?: string
  valid?: boolean
  passwordToggle?: boolean
  passwordVisible?: boolean
  prefix?: ReactNode
  inputRef?: Ref<HTMLInputElement>
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
  onBlur: (event: FocusEvent<HTMLInputElement>) => void
  onFocus?: (event: FocusEvent<HTMLInputElement>) => void
  onPasswordToggle?: () => void
  onAnimationStart?: InputHTMLAttributes<HTMLInputElement>['onAnimationStart']
}

export function AuthField({
  id,
  label,
  value,
  type,
  placeholder,
  autoComplete,
  inputMode,
  icon: Icon,
  error,
  valid,
  passwordToggle = false,
  passwordVisible = false,
  prefix,
  inputRef,
  onChange,
  onBlur,
  onFocus,
  onPasswordToggle,
  onAnimationStart,
}: AuthFieldProps) {
  const describedBy = error ? `${id}-error` : undefined

  return (
    <div className={`login-field ${error ? 'has-error' : ''} ${valid ? 'is-valid' : ''}`}>
      <label className="login-field__label" htmlFor={id}>{label}</label>
      <div className="login-field__control">
        <Icon className="login-field__icon" size={19} strokeWidth={2} aria-hidden="true" />
        {prefix}
        <input
          ref={inputRef}
          id={id}
          name={id}
          type={type}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          onChange={onChange}
          onBlur={onBlur}
          onFocus={onFocus}
          onAnimationStart={onAnimationStart}
        />
        {valid ? <Check className="login-field__valid-icon" size={16} aria-hidden="true" /> : null}
        {passwordToggle ? (
          <button
            className="login-field__eye"
            type="button"
            aria-label={passwordVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            aria-pressed={passwordVisible}
            onClick={onPasswordToggle}
          >
            {passwordVisible ? <EyeOff size={19} /> : <Eye size={19} />}
          </button>
        ) : null}
      </div>
      {error ? <span className="login-field__error" id={describedBy}>{error}</span> : null}
    </div>
  )
}
