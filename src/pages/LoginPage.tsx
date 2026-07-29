import { Link, useLocation, useNavigate } from 'react-router-dom'
import { type FormEvent, useEffect, useState } from 'react'
import {
  getAuthErrorDetails,
  loginUser,
  loginWithGoogle,
  saveSession,
} from '../api/auth'
import { resendVerificationEmail } from '../api/auth-password'
import { AuthInput } from '../components/AuthInput'
import { GoogleSignInButton } from '../components/GoogleSignInButton'
import { BrandName } from '../components/BrandName'
import { LegalFooter } from '../components/LegalFooter'
import {
  normalizePhone,
  PHONE_PLACEHOLDER,
  validateEmail,
  validateLoginIdentifier,
  validatePassword,
} from '../utils/validation'
import '../styles/login.css'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const flashMessage = (location.state as { message?: string } | null)?.message
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{
    email?: string
    password?: string
    form?: string
    info?: string
  }>({})
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [resendEmail, setResendEmail] = useState('')
  const [resending, setResending] = useState(false)
  const [resendMsg, setResendMsg] = useState('')

  const finishAuth = (user: { phone?: string }, token: string, needsPhone?: boolean) => {
    saveSession(token, user as Parameters<typeof saveSession>[1], true)
    if (needsPhone || !String(user.phone || '').trim()) {
      navigate('/profil', {
        replace: true,
        state: {
          phoneRequired:
            'Ajoute ton numéro de téléphone pour payer en Mobile Money et recevoir les rappels.',
        },
      })
      return
    }
    navigate('/accueil', { replace: true })
  }

  const handleGoogleSuccess = async (idToken: string) => {
    setGoogleLoading(true)
    setErrors({})
    setResendMsg('')

    try {
      const { user, token, needsPhone } = await loginWithGoogle(idToken)
      finishAuth(user, token, needsPhone)
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

  const handleResend = async () => {
    const target = (resendEmail || identifier).trim()
    const emailError = validateEmail(target)
    if (emailError) {
      setErrors((prev) => ({ ...prev, form: emailError }))
      return
    }
    setResending(true)
    setResendMsg('')
    try {
      await resendVerificationEmail(target)
      setResendMsg('Si un compte non vérifié existe, un nouveau lien a été envoyé.')
    } catch (error) {
      setErrors({
        form: error instanceof Error ? error.message : 'Envoi impossible',
      })
    } finally {
      setResending(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    const identifierError = validateLoginIdentifier(identifier)
    const passwordError = validatePassword(password)

    if (identifierError || passwordError) {
      setErrors({ email: identifierError, password: passwordError })
      return
    }

    setErrors({})
    setResendMsg('')
    setLoading(true)

    const trimmed = identifier.trim()
    const loginValue = trimmed.includes('@') ? trimmed : normalizePhone(trimmed)

    try {
      const { user, token } = await loginUser({ identifier: loginValue, password })
      finishAuth(user, token)
    } catch (error) {
      const { message, code, email: errEmail } = getAuthErrorDetails(error)
      setErrors({ form: message })
      if (code === 'EMAIL_NOT_VERIFIED') {
        setResendEmail(errEmail || (trimmed.includes('@') ? trimmed : ''))
      }
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
          {resendMsg ? <p className="signin-banner signin-banner--ok">{resendMsg}</p> : null}

          {resendEmail ? (
            <div style={{ marginBottom: 12 }}>
              <button
                type="button"
                className="signin-btn-continue signin-btn-continue--app"
                style={{ background: 'transparent', border: '1px solid #0f4c4c', color: '#0f4c4c' }}
                disabled={resending || loading || googleLoading}
                onClick={() => void handleResend()}
              >
                {resending ? 'Envoi…' : 'Renvoyer l’email de vérification'}
              </button>
            </div>
          ) : null}

          <div className="signin-fields">
            <AuthInput
              label="Téléphone ou email"
              name="identifier"
              type="text"
              placeholder={`${PHONE_PLACEHOLDER} ou email`}
              autoComplete="username"
              inputMode="text"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={identifier}
              onChange={(e) => {
                const next = e.target.value
                if (next.includes('@') || /[a-zA-Z]/.test(next)) {
                  setIdentifier(next)
                } else {
                  setIdentifier(normalizePhone(next))
                }
              }}
              error={errors.email}
            />
            <AuthInput
              label="Code"
              name="password"
              type="password"
              placeholder="Ton code"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
            />
          </div>

          <p className="signin-forgot">
            <Link to="/mot-de-passe-oublie">Code oublié ?</Link>
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

          <LegalFooter />
        </form>
      </div>
    </div>
  )
}
