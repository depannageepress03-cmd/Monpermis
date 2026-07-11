import { Eye, EyeOff } from 'lucide-react'
import type { InputHTMLAttributes, ReactNode } from 'react'
import { useState } from 'react'

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon: ReactNode
  error?: string
}

export function AuthInput({ icon, error, type = 'text', id, ...props }: AuthInputProps) {
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = type === 'password'
  const inputId = id ?? props.name

  return (
    <div className="auth-input-group">
      <div className={`auth-input-wrap ${error ? 'auth-input-error' : ''}`}>
        <span className="auth-input-icon" aria-hidden="true">{icon}</span>
        <input
          id={inputId}
          type={isPassword && showPassword ? 'text' : type}
          className="auth-input"
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            className="auth-input-toggle"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && <span className="auth-input-error-text">{error}</span>}
    </div>
  )
}

function AppLogo() {
  return (
    <div className="signin-logo" aria-hidden="true">
      <svg viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="6" fill="white" />
        <line x1="24" y1="6" x2="24" y2="14" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="24" y1="34" x2="24" y2="42" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="6" y1="24" x2="14" y2="24" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="34" y1="24" x2="42" y2="24" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="11.3" y1="11.3" x2="16.9" y2="16.9" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="31.1" y1="31.1" x2="36.7" y2="36.7" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="11.3" y1="36.7" x2="16.9" y2="31.1" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="31.1" y1="16.9" x2="36.7" y2="11.3" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  )
}

export { AppLogo }
