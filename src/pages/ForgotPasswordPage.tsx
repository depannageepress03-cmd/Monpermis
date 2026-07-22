import { Link } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { forgotPassword } from '../api/auth-password'
import { BrandName } from '../components/BrandName'
import '../styles/login.css'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setError('Veuillez entrer votre email')
      return
    }
    setError('')
    setLoading(true)
    try {
      await forgotPassword(email.trim())
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la demande')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="signin-page signin-page--login">
      <div className="signin-container signin-container--login">
        <div className="signin-main">
          <header className="signin-header signin-header--compact">
            <img src="/logo.png" alt="Monpermis.bj" className="signin-logo" />
            <BrandName as="p" className="signin-brand" />
            <h1 className="signin-title">Mot de passe oublié</h1>
            <p className="signin-subtitle">
              Saisissez votre email, nous vous enverrons un lien pour réinitialiser votre mot de passe.
            </p>
          </header>

          <div className="signin-form-card">
            {sent ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p style={{ color: '#16a34a', fontWeight: 600, marginBottom: 12 }}>
                  Email envoyé !
                </p>
                <p style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.6 }}>
                  Si un compte existe avec cette adresse, vous recevrez un lien de réinitialisation sous quelques minutes.
                </p>
                <Link to="/" style={{ display: 'inline-block', marginTop: 20, color: '#0f4c4c', fontWeight: 600 }}>
                  Retour à la connexion
                </Link>
              </div>
            ) : (
              <form className="signin-form" onSubmit={handleSubmit} noValidate>
                {error && <p className="signin-form-error">{error}</p>}

                <fieldset className="signin-section">
                  <legend className="signin-section-title">Email</legend>
                  <div className="signin-fields">
                    <div className="auth-input-wrap">
                      <span className="auth-input-icon"><Mail size={18} /></span>
                      <input
                        type="email"
                        placeholder="Votre adresse email"
                        autoComplete="email"
                        inputMode="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="auth-input"
                      />
                    </div>
                  </div>
                </fieldset>

                <button type="submit" className="signin-btn-continue signin-btn-continue--compact" disabled={loading}>
                  {loading ? 'Envoi...' : 'Envoyer le lien'}
                </button>
              </form>
            )}
          </div>
        </div>

        <footer className="signin-footer">
          <p className="signin-register-link">
            <Link to="/">Retour à la connexion</Link>
          </p>
        </footer>
      </div>
    </div>
  )
}
