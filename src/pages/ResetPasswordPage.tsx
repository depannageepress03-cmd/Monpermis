import { Link, useSearchParams } from 'react-router-dom'
import { Shield } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { resetPassword } from '../api/auth-password'
import { BrandName } from '../components/BrandName'
import '../styles/login.css'

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Minimum 8 caractères')
      return
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
      setError('Doit contenir majuscule, minuscule et chiffre')
      return
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    if (!token) {
      setError('Token invalide')
      return
    }

    setLoading(true)
    try {
      await resetPassword(token, password)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la réinitialisation')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="signin-page signin-page--login">
        <div className="signin-container signin-container--login">
          <div className="signin-main" style={{ textAlign: 'center', padding: '40px 0' }}>
            <p style={{ color: '#dc2626', fontWeight: 600 }}>Lien invalide ou expiré.</p>
            <Link to="/mot-de-passe-oublie" style={{ color: '#0f4c4c', fontWeight: 600, display: 'inline-block', marginTop: 12 }}>
              Demander un nouveau lien
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="signin-page signin-page--login">
      <div className="signin-container signin-container--login">
        <div className="signin-main">
          <header className="signin-header signin-header--compact">
            <BrandName as="p" className="signin-brand" />
            <h1 className="signin-title">Nouveau mot de passe</h1>
            <p className="signin-subtitle">
              Choisissez un mot de passe sécurisé.
            </p>
          </header>

          <div className="signin-form-card">
            {done ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p style={{ color: '#16a34a', fontWeight: 600, marginBottom: 12 }}>
                  Mot de passe réinitialisé !
                </p>
                <Link to="/" style={{ display: 'inline-block', marginTop: 12, color: '#0f4c4c', fontWeight: 600 }}>
                  Se connecter
                </Link>
              </div>
            ) : (
              <form className="signin-form" onSubmit={handleSubmit} noValidate>
                {error && <p className="signin-form-error">{error}</p>}

                <fieldset className="signin-section">
                  <legend className="signin-section-title">Mot de passe</legend>
                  <div className="signin-fields">
                    <div className="auth-input-wrap">
                      <span className="auth-input-icon"><Shield size={18} /></span>
                      <input
                        type="password"
                        placeholder="Nouveau mot de passe"
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="auth-input"
                      />
                    </div>
                    <div className="auth-input-wrap">
                      <span className="auth-input-icon"><Shield size={18} /></span>
                      <input
                        type="password"
                        placeholder="Confirmer le mot de passe"
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="auth-input"
                      />
                    </div>
                  </div>
                </fieldset>

                <button type="submit" className="signin-btn-continue signin-btn-continue--compact" disabled={loading}>
                  {loading ? 'Réinitialisation...' : 'Réinitialiser'}
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
