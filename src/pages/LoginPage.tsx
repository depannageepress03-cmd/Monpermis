import { Link, useLocation, useNavigate } from 'react-router-dom'
import { type FormEvent, useEffect, useState } from 'react'
import { getAuthErrorDetails, loginUser, saveSession } from '../api/auth'
import { AuthInput } from '../components/AuthInput'
import { BrandName } from '../components/BrandName'
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

  const finishAuth = (user: { phone?: string }, token: string) => {
    saveSession(token, user as Parameters<typeof saveSession>[1], true)
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
        phone: normalizePhone(phone),
        password,
      })
      finishAuth(user, token)
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
            disabled={loading}
          >
            {loading ? 'Connexion en cours…' : 'Se connecter'}
          </button>

          <p className="signin-register-link">
            Pas encore de compte ? <Link to="/inscription">Créer un compte</Link>
          </p>

          <LegalFooter />
        </form>
      </div>
    </div>
  )
}
