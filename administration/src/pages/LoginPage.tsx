import { FormEvent, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { LockKeyhole } from 'lucide-react'
import logoUrl from '../assets/logo.png'
import { BrandName } from '../components/BrandName'
import { isAuthError, useAdminAuth } from '../context/AdminAuthContext'
import { SITE_NAME } from '../theme/brand'
import { normalizePhone, PHONE_PLACEHOLDER } from '../utils/validation'

export function LoginPage() {
  const { admin, loading, signIn } = useAdminAuth()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && admin) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      await signIn(normalizePhone(phone), password)
    } catch (err) {
      if (isAuthError(err)) {
        setError(err.message)
      } else {
        setError('Connexion impossible. Vérifiez votre connexion réseau.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <img src={logoUrl} alt={SITE_NAME} className="login-logo" />
        <BrandName as="p" className="login-brand-name" />
        <p className="login-badge-text">Espace sécurisé · Administration</p>

        <div className="accent-row">
          <span className="accent accent-green" />
          <span className="accent accent-gold" />
          <span className="accent accent-navy" />
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <label htmlFor="phone">Téléphone</label>
          <input
            id="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            required
            value={phone}
            onChange={(e) => setPhone(normalizePhone(e.target.value))}
            placeholder={PHONE_PLACEHOLDER}
          />

          <label htmlFor="password">Mot de passe</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          {error ? <p className="form-error">{error}</p> : null}

          <button type="submit" className="btn-primary" disabled={submitting}>
            <LockKeyhole size={18} />
            {submitting ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}
