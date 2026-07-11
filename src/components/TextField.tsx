import { Eye, EyeOff } from 'lucide-react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { useState } from 'react'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  icon?: ReactNode
  error?: string
}

export function TextField({
  label,
  icon,
  error,
  type = 'text',
  id,
  ...props
}: TextFieldProps) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const inputId = id ?? props.name

  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      <div className="field-input-wrap">
        {icon && <span className="field-icon" aria-hidden="true">{icon}</span>}
        <input
          id={inputId}
          type={isPassword && showPassword ? 'text' : type}
          className={error ? 'field-error' : undefined}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            className="toggle-password"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && <span className="field-error-text">{error}</span>}
    </div>
  )
}
