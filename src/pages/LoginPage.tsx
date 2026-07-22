import { Link, useLocation, useNavigate } from 'react-router-dom'
import { type FormEvent, useEffect, useState } from 'react'
import { getAuthErrorDetails, loginUser, loginWithGoogle, saveSession } from '../api/auth'
import { AuthInput } from '../components/AuthInput'
import { GoogleSignInButton } from '../components/GoogleSignInButton'
import { BrandName } from '../components/BrandName'
import { validateEmail, validatePassword } from '../utils/validation'
import '../styles/login.css'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const flashMessage = (location.state as { message?: string } | null)?.message
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string; info?: string }>({})
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleGoogleSuccess = async (idToken: string) => {
    setGoogleLoading(true)
    setErrors({})

    try {
      const { user, token } = await loginWithGoogle(idToken)
      saveSession(token, user, true)
      navigate('/accueil', { replace: true })
    } catch (error) {
      const { message } = getAuthErrorDetails(error)
      setErrors({ form: message })
    } finally {
      setGoogleLoading(false)
    }
  }

  useEffect(() => {
    if (flashMessage) {
      setErrors((prev) => ({ ...prev, info: flashMessage }))
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [flashMessage, location.pathname, navigate])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    const emailError = validateEmail(email)
    const passwordError = validatePassword(password)

    if (emailError || passwordError) {
      setErrors({ email: emailError, password: passwordError })
      return
    }

    setErrors({})
    setLoading(true)

    try {
      const { user, token } = await loginUser({ email, password })
      saveSession(token, user, true)
      navigate('/accueil', { replace: true })
    } catch (error) {
      const { message } = getAuthErrorDetails(error)
      setErrors({ form: message })
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
          <h1 className="signin-title">Content de te revoir</h1>
          <p className="signin-subtitle">Connecte-toi pour reprendre ta préparation au permis.</p>
        </header>

        <form className="signin-form signin-form--app" onSubmit={handleSubmit} noValidate>
          {errors.info ? <p className="signin-banner signin-banner--ok">{errors.info}</p> : null}
          {errors.form ? <p className="signin-banner signin-banner--err">{errors.form}</p> : null}

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
              error={errors.email}
            />
            <AuthInput
              label="Mot de passe"
              name="password"
              type="password"
              placeholder="Mot de passe"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
            />
          </div>

          <p className="signin-forgot">
            <Link to="/mot-de-passe-oublie">Mot de passe oublié ?</Link>
          </p>

          <button
            type="submit"
            className="signin-btn-continue signin-btn-continue--app"
            disabled={loading || googleLoading}
          >
            {loading ? 'Connexion en cours…' : 'Se connecter'}
          </button>

          <div className="signin-divider-row" aria-hidden="true">
            <span className="signin-divider-line" />
            <span className="signin-divider-text">ou</span>
            <span className="signin-divider-line" />
          </div>

          <GoogleSignInButton
            onSuccess={handleGoogleSuccess}
            onError={() => setErrors({ form: 'Connexion Google échouée' })}
            disabled={loading || googleLoading || !import.meta.env.VITE_GOOGLE_CLIENT_ID}
          />

          <p className="signin-register-link">
            Pas encore de compte ? <Link to="/inscription">Créer un compte</Link>
          </p>

          <p className="signin-terms">
            <Link to="/conditions-utilisation">Conditions d&apos;utilisation</Link>
            {' · '}
            <Link to="/politique-de-confidentialite">Confidentialité</Link>
            {' · '}
            <Link to="/mentions-legales">Mentions légales</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
