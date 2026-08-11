import { Link, useLocation, useNavigate } from 'react-router-dom'
import { type FormEvent, useEffect, useState } from 'react'
import { getAuthErrorDetails, loginUser, saveSession, type AuthUser } from '../api/auth'
import { AuthInput } from '../components/AuthInput'
import { AuthStage } from '../components/AuthStage'
import { GoogleAuthButton } from '../components/GoogleAuthButton'
import { LegalFooter } from '../components/LegalFooter'
import {
  normalizePhone,
  PHONE_PLACEHOLDER,
  validatePassword,
  validatePhone,
} from '../utils/validation'
import '../styles/login.css'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const flashMessage = (location.state as { message?: string } | null)?.message
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{
    phone?: string
    password?: string
    form?: string
    info?: string
  }>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (flashMessage) {
      setErrors((prev) => ({ ...prev, info: flashMessage }))
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [flashMessage, location.pathname, navigate])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    const phoneError = validatePhone(phone)
    const passwordError = validatePassword(password)

    if (phoneError || passwordError) {
      setErrors({ phone: phoneError, password: passwordError })
      return
    }

    setErrors({})
    setLoading(true)

    try {
      const { user, token } = await loginUser({
        identifier: normalizePhone(phone),
        password,
      })
      saveSession(token, user, true)
      if (!String(user.phone || '').trim()) {
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
    } catch (error) {
      const { message } = getAuthErrorDetails(error)
      setErrors({ form: message })
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSuccess = (user: AuthUser, token: string) => {
    saveSession(token, user, true)
    if (!String(user.phone || '').trim()) {
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

  return (
    <AuthStage tagline="Code, conduite, confiance — avance à ton rythme." imageSrc="/home/i2.jpg">
      <p className="auth-stage-kicker">Connexion</p>
      <h2 className="auth-stage-heading">Content de te revoir</h2>
      <p className="auth-stage-lead">Connecte-toi pour reprendre ta préparation au permis.</p>

      <form className="signin-form signin-form--stage" onSubmit={handleSubmit} noValidate>
        {errors.info ? <p className="signin-banner signin-banner--ok">{errors.info}</p> : null}
        {errors.form ? <p className="signin-banner signin-banner--err">{errors.form}</p> : null}

        <GoogleAuthButton
          text="continue_with"
          onSuccess={handleGoogleSuccess}
          onError={(message) => setErrors({ form: message })}
        />

        <div className="signin-divider">
          <span>ou avec ton téléphone</span>
        </div>

        <div className="signin-fields">
          <AuthInput
            label="Téléphone"
            name="phone"
            type="tel"
            placeholder={PHONE_PLACEHOLDER}
            autoComplete="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(normalizePhone(e.target.value))}
            error={errors.phone}
          />
          <AuthInput
            label="Mot de passe"
            name="password"
            type="password"
            placeholder="Ton mot de passe"
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
          disabled={loading}
        >
          {loading ? 'Connexion en cours…' : 'Se connecter'}
        </button>

        <p className="signin-register-link">
          Pas encore de compte ? <Link to="/inscription">Créer un compte</Link>
        </p>

        <LegalFooter />
      </form>
    </AuthStage>
  )
}
