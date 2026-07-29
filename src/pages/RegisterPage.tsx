import { Link, useNavigate } from 'react-router-dom'
import { type FormEvent, useState } from 'react'
import { registerUser } from '../api/auth'
import { AuthInput } from '../components/AuthInput'
import { BrandName } from '../components/BrandName'
import { LegalFooter } from '../components/LegalFooter'
import {
  validateName,
  validatePassword,
  validatePhone,
  normalizePhone,
  PHONE_PLACEHOLDER,
} from '../utils/validation'
import '../styles/login.css'

interface FormErrors {
  firstName?: string
  lastName?: string
  phone?: string
  password?: string
  terms?: string
  form?: string
}

export function RegisterPage() {
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    const newErrors: FormErrors = {
      firstName: validateName(firstName, 'Le prénom'),
      lastName: validateName(lastName, 'Le nom'),
      phone: validatePhone(phone),
      password: validatePassword(password),
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
      const { message } = await registerUser({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: normalizePhone(phone),
        password,
      })
      navigate('/', {
        replace: true,
        state: {
          message: message || 'Compte créé. Connecte-toi avec ton téléphone et ton mot de passe.',
        },
      })
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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
            />
            <p className="signin-field-hint">
              Mot de passe · min. 8 caractères, majuscule, minuscule et chiffre.
            </p>
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
            disabled={loading}
          >
            {loading ? 'Création…' : 'Créer mon compte'}
          </button>

          <p className="signin-register-link">
            Déjà inscrit ? <Link to="/">Se connecter</Link>
          </p>

          <LegalFooter />
        </form>
      </div>
    </div>
  )
}
