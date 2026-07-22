import { Link, useNavigate } from 'react-router-dom'
import { type FormEvent, useState } from 'react'
import { registerUser, loginWithGoogle, saveSession, getAuthErrorDetails } from '../api/auth'
import { AuthInput } from '../components/AuthInput'
import { BrandName } from '../components/BrandName'
import { GoogleSignInButton } from '../components/GoogleSignInButton'
import {
  validateEmail,
  validateName,
  validatePassword,
  validatePhone,
} from '../utils/validation'
import '../styles/login.css'

interface FormErrors {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  password?: string
  confirmPassword?: string
  terms?: string
  form?: string
}

export function RegisterPage() {
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    const newErrors: FormErrors = {
      firstName: validateName(firstName, 'Le prénom'),
      lastName: validateName(lastName, 'Le nom'),
      email: validateEmail(email),
      phone: validatePhone(phone),
      password: validatePassword(password),
      confirmPassword: !confirmPassword
        ? 'Confirmez votre mot de passe'
        : confirmPassword !== password
          ? 'Les mots de passe ne correspondent pas'
          : undefined,
      terms: !acceptTerms ? 'Vous devez accepter les conditions' : undefined,
    }

    const hasErrors = Object.values(newErrors).some(Boolean)
    if (hasErrors) {
      setErrors(newErrors)
      return
    }

    setErrors({})
    setLoading(true)

    try {
      const { user, token } = await registerUser({
        firstName,
        lastName,
        email,
        phone,
        password,
      })
      saveSession(token, user, true)
      navigate('/accueil', { replace: true })
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : 'Inscription impossible' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="signin-page signin-page--app signin-page--register">
      <div className="signin-container signin-container--app signin-container--register">
        <header className="signin-header signin-header--app">
          <img src="/logo.png" alt="" className="signin-logo-img" width={110} height={74} />
          <BrandName as="p" className="signin-brand" />
          <h1 className="signin-title">Crée ton compte</h1>
          <p className="signin-subtitle">
            Quelques infos et tu démarres ta préparation au permis.
          </p>
        </header>

        <form className="signin-form signin-form--app" onSubmit={handleSubmit} noValidate>
          {errors.form ? <p className="signin-banner signin-banner--err">{errors.form}</p> : null}

          <div className="signin-row signin-row--app">
            <AuthInput
              label="Prénom"
              name="firstName"
              placeholder="Prénom"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              error={errors.firstName}
            />
            <AuthInput
              label="Nom"
              name="lastName"
              placeholder="Nom"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              error={errors.lastName}
            />
          </div>

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
              label="Téléphone"
              name="phone"
              type="tel"
              placeholder="Téléphone"
              autoComplete="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              error={errors.phone}
            />
            <AuthInput
              label="Mot de passe"
              name="password"
              type="password"
              placeholder="Mot de passe"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
            />
            <AuthInput
              label="Confirmer le mot de passe"
              name="confirmPassword"
              type="password"
              placeholder="Confirmer le mot de passe"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={errors.confirmPassword}
            />
          </div>

          <div className="signin-terms-block signin-terms-block--app">
            <label className="signin-checkbox">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
              />
              <span>
                J&apos;accepte les{' '}
                <Link to="/conditions-utilisation" target="_blank" rel="noopener noreferrer">
                  conditions d&apos;utilisation
                </Link>
              </span>
            </label>
            {errors.terms ? (
              <span className="auth-input-error-text signin-terms-error">{errors.terms}</span>
            ) : null}
          </div>

          <button
            type="submit"
            className="signin-btn-continue signin-btn-continue--app"
            disabled={loading || googleLoading}
          >
            {loading ? 'Création…' : 'Créer mon compte'}
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
            Déjà inscrit ? <Link to="/">Se connecter</Link>
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
