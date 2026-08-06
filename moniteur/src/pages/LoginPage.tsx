import { FormEvent, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import logoUrl from '../assets/logo.png'
import { isAuthError, useMoniteurAuth } from '../context/MoniteurAuthContext'
import { SITE_NAME } from '../theme/brand'

export function LoginPage() {
  const { moniteur, loading, signIn } = useMoniteurAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && moniteur) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const result = await signIn(email.trim().toLowerCase(), password)
      navigate(result.homePath || '/', { replace: true })
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Connexion impossible. Vérifiez le réseau.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-shell">
        <aside className="login-aside" aria-label="Présentation">
          <img src={logoUrl} alt="" className="login-aside-logo" />
          <p className="login-aside-brand">{SITE_NAME}</p>
          <p className="login-aside-text">
            Publiez vos créneaux, confirmez les demandes des apprenants et suivez votre historique.
          </p>
        </aside>

        <div className="login-card">
          <div className="login-card-top">
            <img src={logoUrl} alt={SITE_NAME} className="login-logo" />
            <p className="login-badge-text">
              <ShieldCheck size={16} aria-hidden="true" />
              <span>
                Espace sécurisé · <strong>Moniteur</strong>
              </span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="login-form" autoComplete="on">
            <label htmlFor="email">Email</label>
            <div className="login-phone-field">
              <span className="login-phone-prefix" aria-hidden="true">
                <Mail size={16} />
              </span>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                required
                autoComplete="username"
              />
            </div>

            <label htmlFor="password">Mot de passe</label>
            <div className="login-phone-field">
              <span className="login-phone-prefix" aria-hidden="true">
                <LockKeyhole size={16} />
              </span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="btn-icon"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Masquer' : 'Afficher'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {error ? <p className="form-error">{error}</p> : null}

            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
