import { Link, useNavigate } from 'react-router-dom'
import { Mail, Phone, Shield, User } from 'lucide-react'
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
    <div className="signin-page signin-page--register">
      <div className="signin-container signin-container--register">
        <div className="signin-main">
          <header className="signin-header signin-header--compact">
            <BrandName as="p" className="signin-brand" />
            <h1 className="signin-title">Inscription</h1>
            <p className="signin-subtitle">
              Créez votre compte pour accéder à vos cours et examens.
            </p>
          </header>

          <div className="signin-form-card signin-form-card--compact">
            <form className="signin-form" onSubmit={handleSubmit} noValidate>
              {errors.form && <p className="signin-form-error">{errors.form}</p>}

              <fieldset className="signin-section">
                <legend className="signin-section-title">Identité</legend>
                <div className="signin-row">
                  <AuthInput
                    name="firstName"
                    placeholder="Prénom"
                    autoComplete="given-name"
                    icon={<User size={18} />}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    error={errors.firstName}
                  />
                  <AuthInput
                    name="lastName"
                    placeholder="Nom"
                    autoComplete="family-name"
                    icon={<User size={18} />}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    error={errors.lastName}
                  />
                </div>
              </fieldset>

              <fieldset className="signin-section">
                <legend className="signin-section-title">Contact</legend>
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
                    name="phone"
                    type="tel"
                    placeholder="Téléphone"
                    autoComplete="tel"
                    inputMode="tel"
                    icon={<Phone size={18} />}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    error={errors.phone}
                  />
                </div>
              </fieldset>

              <fieldset className="signin-section">
                <legend className="signin-section-title">Sécurité</legend>
                <div className="signin-fields">
                  <AuthInput
                    name="password"
                    type="password"
                    placeholder="Mot de passe"
                    autoComplete="new-password"
                    icon={<Shield size={18} />}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    error={errors.password}
                  />
                  <AuthInput
                    name="confirmPassword"
                    type="password"
                    placeholder="Confirmer le mot de passe"
                    autoComplete="new-password"
                    icon={<Shield size={18} />}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    error={errors.confirmPassword}
                  />
                </div>
              </fieldset>

              <div className="signin-terms-block">
                <label className="signin-checkbox">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => setAcceptTerms(e.target.checked)}
                  />
                  <span>
                    J'accepte les{' '}
                    <Link to="/conditions-utilisation" target="_blank" rel="noopener noreferrer">
                      conditions d'utilisation
                    </Link>
                  </span>
                </label>
                {errors.terms && <span className="auth-input-error-text signin-terms-error">{errors.terms}</span>}
              </div>

              <button type="submit" className="signin-btn-continue signin-btn-continue--compact" disabled={loading || googleLoading}>
                {loading ? 'Création...' : 'Créer mon compte'}
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
            Déjà inscrit ?{' '}
            <Link to="/">Se connecter</Link>
          </p>
          <p className="signin-terms">
            En vous inscrivant, vous acceptez nos{' '}
            <Link to="/conditions-utilisation">Conditions d'utilisation</Link>
            {' '}et notre{' '}
            <Link to="/politique-de-confidentialite">Politique de confidentialité</Link>.
            {' '}
            <Link to="/mentions-legales">Mentions légales</Link>.
          </p>
        </footer>
      </div>
    </div>
  )
}
