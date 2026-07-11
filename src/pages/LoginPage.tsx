import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Mail, Shield } from 'lucide-react'
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
    <div className="signin-page signin-page--login">
      <div className="signin-container signin-container--login">
        <div className="signin-main">
          <header className="signin-header signin-header--compact">
            <BrandName as="p" className="signin-brand" />
            <h1 className="signin-title">Connexion</h1>
            <p className="signin-subtitle">
              Connectez-vous pour accéder à vos cours et examens.
            </p>
          </header>

          <div className="signin-form-card">
            <form className="signin-form" onSubmit={handleSubmit} noValidate>
              {errors.info && <p className="signin-form-error" style={{ color: '#16a34a' }}>{errors.info}</p>}
              {errors.form && <p className="signin-form-error">{errors.form}</p>}

              <fieldset className="signin-section">
                <legend className="signin-section-title">Compte</legend>
                <div className="signin-fields">
                  <AuthInput
                    name="email"
                    type="email"
                    placeholder="E-mail"
                    autoComplete="email"
                    inputMode="email"
                    icon={<Mail size={18} />}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={errors.email}
                  />

                  <AuthInput
                    name="password"
                    type="password"
                    placeholder="Mot de passe"
                    autoComplete="current-password"
                    icon={<Shield size={18} />}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    error={errors.password}
                  />
              </div>
            </fieldset>

            <button type="submit" className="signin-btn-continue signin-btn-continue--compact" disabled={loading || googleLoading}>
                {loading ? 'Connexion...' : 'Continuer'}
              </button>
            </form>

            <p className="signin-divider">ou</p>

            <GoogleSignInButton
              onSuccess={handleGoogleSuccess}
              onError={() => setErrors({ form: 'Connexion Google échouée' })}
              disabled={loading || googleLoading || !import.meta.env.VITE_GOOGLE_CLIENT_ID}
            />
          </div>
        </div>

        <footer className="signin-footer">
          <p className="signin-register-link">
            Pas encore de compte ?{' '}
            <Link to="/inscription">Créer un compte</Link>
          </p>
          <p className="signin-terms">
            En cliquant sur « Continuer », j'accepte les{' '}
            <a href="#" onClick={(e) => e.preventDefault()}>Conditions d'utilisation</a>
            {' '}et la{' '}
            <a href="#" onClick={(e) => e.preventDefault()}>Politique de confidentialité</a>.
          </p>
        </footer>
      </div>
    </div>
  )
}
