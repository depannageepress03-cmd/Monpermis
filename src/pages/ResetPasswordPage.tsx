import { Link, useSearchParams } from 'react-router-dom'
import { type FormEvent, useState } from 'react'
import { resetPassword } from '../api/auth-password'
import { AuthInput } from '../components/AuthInput'
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
      <div className="signin-page signin-page--app">
        <div className="signin-container signin-container--app">
          <header className="signin-header signin-header--app">
            <img src="/logo.png" alt="" className="signin-logo-img" width={110} height={74} />
            <BrandName as="p" className="signin-brand" />
            <h1 className="signin-title">Lien invalide</h1>
            <p className="signin-subtitle">Ce lien est invalide ou a expiré.</p>
          </header>
          <p className="signin-register-link" style={{ textAlign: 'center' }}>
            <Link to="/mot-de-passe-oublie">Demander un nouveau lien</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="signin-page signin-page--app">
      <div className="signin-container signin-container--app">
        <header className="signin-header signin-header--app">
          <img src="/logo.png" alt="" className="signin-logo-img" width={110} height={74} />
          <BrandName as="p" className="signin-brand" />
          <h1 className="signin-title">Nouveau mot de passe</h1>
          <p className="signin-subtitle">Choisis un mot de passe sécurisé pour ton compte.</p>
        </header>

        {done ? (
          <div className="signin-form signin-form--app">
            <p className="signin-banner signin-banner--ok">Mot de passe réinitialisé !</p>
            <p className="signin-register-link">
              <Link to="/">Se connecter</Link>
            </p>
          </div>
        ) : (
          <form className="signin-form signin-form--app" onSubmit={handleSubmit} noValidate>
            {error ? <p className="signin-banner signin-banner--err">{error}</p> : null}

            <div className="signin-fields">
              <AuthInput
                label="Nouveau mot de passe"
                name="password"
                type="password"
                placeholder="Nouveau mot de passe"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <AuthInput
                label="Confirmer le mot de passe"
                name="confirmPassword"
                type="password"
                placeholder="Confirmer le mot de passe"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="signin-btn-continue signin-btn-continue--app"
              disabled={loading}
            >
              {loading ? 'Réinitialisation…' : 'Réinitialiser'}
            </button>

            <p className="signin-register-link">
              <Link to="/">Retour à la connexion</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
