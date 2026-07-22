import { Link } from 'react-router-dom'
import { type FormEvent, useState } from 'react'
import { forgotPassword } from '../api/auth-password'
import { AuthInput } from '../components/AuthInput'
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
    <div className="signin-page signin-page--app">
      <div className="signin-container signin-container--app">
        <header className="signin-header signin-header--app">
          <img src="/logo.png" alt="" className="signin-logo-img" width={110} height={74} />
          <BrandName as="p" className="signin-brand" />
          <h1 className="signin-title">Mot de passe oublié</h1>
          <p className="signin-subtitle">
            Saisis ton email, on t&apos;envoie un lien pour réinitialiser ton mot de passe.
          </p>
        </header>

        {sent ? (
          <div className="signin-form signin-form--app">
            <p className="signin-banner signin-banner--ok">Email envoyé !</p>
            <p className="signin-subtitle" style={{ margin: '0 auto 1.25rem', textAlign: 'center' }}>
              Si un compte existe avec cette adresse, tu recevras un lien sous quelques minutes.
            </p>
            <p className="signin-register-link">
              <Link to="/">Retour à la connexion</Link>
            </p>
          </div>
        ) : (
          <form className="signin-form signin-form--app" onSubmit={handleSubmit} noValidate>
            {error ? <p className="signin-banner signin-banner--err">{error}</p> : null}

            <div className="signin-fields">
              <AuthInput
                label="Adresse email"
                name="email"
                type="email"
                placeholder="Adresse email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="signin-btn-continue signin-btn-continue--app"
              disabled={loading}
            >
              {loading ? 'Envoi…' : 'Envoyer le lien'}
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
