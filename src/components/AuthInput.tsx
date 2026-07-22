import { Eye, EyeOff } from 'lucide-react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { useState } from 'react'

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Optionnel — mobile n’affiche pas d’icône. */
  icon?: ReactNode
  label?: string
  error?: string
}

export function AuthInput({ icon, label, error, type = 'text', id, ...props }: AuthInputProps) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const inputId = id ?? props.name

  return (
    <div className="auth-input-group">
      {label ? (
        <label className="auth-input-label" htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      <div className={`auth-input-wrap ${icon ? '' : 'auth-input-wrap--no-icon'} ${error ? 'auth-input-error' : ''}`}>
        {icon ? (
          <span className="auth-input-icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        <input
          id={inputId}
          type={isPassword && showPassword ? 'text' : type}
          className="auth-input"
          {...props}
        />
        {isPassword ? (
          <button
            type="button"
            className="auth-input-toggle"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        ) : null}
      </div>
      {error ? <span className="auth-input-error-text">{error}</span> : null}
    </div>
  )
}
