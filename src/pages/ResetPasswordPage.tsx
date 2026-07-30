import { Link, useSearchParams } from 'react-router-dom'
import { type FormEvent, useState } from 'react'
import { resetPassword } from '../api/auth-password'
import { AuthInput } from '../components/AuthInput'
import { AuthStage } from '../components/AuthStage'
import { LegalFooter } from '../components/LegalFooter'
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
      <AuthStage tagline="On t’aide à retrouver l’accès rapidement." imageSrc="/home/i4.jpg">
        <p className="auth-stage-kicker">Assistance</p>
        <h2 className="auth-stage-heading">Lien invalide</h2>
        <p className="auth-stage-lead">Ce lien est invalide ou a expiré.</p>
        <div className="signin-form signin-form--stage">
          <p className="signin-register-link">
            <Link to="/mot-de-passe-oublie">Contacter le support</Link>
          </p>
          <LegalFooter />
        </div>
      </AuthStage>
    )
  }

  return (
    <AuthStage tagline="Choisis un nouveau code et reprends ta route." imageSrc="/home/i1.jpg">
      <p className="auth-stage-kicker">Sécurité</p>
      <h2 className="auth-stage-heading">Nouveau mot de passe</h2>
      <p className="auth-stage-lead">Choisis un mot de passe sécurisé pour ton compte.</p>

      {done ? (
        <div className="signin-form signin-form--stage">
          <p className="signin-banner signin-banner--ok">Mot de passe réinitialisé !</p>
          <p className="signin-register-link">
            <Link to="/">Se connecter</Link>
          </p>
          <LegalFooter />
        </div>
      ) : (
        <form className="signin-form signin-form--stage" onSubmit={handleSubmit} noValidate>
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

          <LegalFooter />
        </form>
      )}
    </AuthStage>
  )
}
