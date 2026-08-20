import { Link, useNavigate } from 'react-router-dom'
import { type FormEvent, useState } from 'react'
import { saveSession, type AuthUser } from '../api/auth'
import { AuthInput } from '../components/AuthInput'
import { AuthStage } from '../components/AuthStage'
import { GoogleAuthButton } from '../components/GoogleAuthButton'
import { LegalFooter } from '../components/LegalFooter'
import {
  validateName,
  validatePhone,
  normalizePhone,
  PHONE_PLACEHOLDER,
} from '../utils/validation'
import '../styles/login.css'

interface FormErrors {
  firstName?: string
  lastName?: string
  phone?: string
  terms?: string
  form?: string
}

export function RegisterPage() {
  const navigate = useNavigate()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const newErrors: FormErrors = {
      firstName: validateName(firstName, 'Le prénom'),
      lastName: validateName(lastName, 'Le nom'),
      phone: validatePhone(phone),
      terms: !acceptTerms ? 'Vous devez accepter les conditions' : undefined,
    }
    if (Object.values(newErrors).some(Boolean)) {
      setErrors(newErrors)
      return
    }
    navigate('/inscription/mot-de-passe', {
      state: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: normalizePhone(phone),
      },
    })
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
    <AuthStage tagline="Code, conduite, confiance, avance à ton rythme." imageSrc="/home/i2.jpg">
      <p className="auth-stage-kicker">Inscription</p>
      <h2 className="auth-stage-heading">Crée ton compte</h2>
      <p className="auth-stage-lead">Quelques infos et tu démarres ta préparation au permis.</p>

      <form className="signin-form signin-form--stage" onSubmit={handleSubmit} noValidate>
        {errors.form ? <p className="signin-banner signin-banner--err">{errors.form}</p> : null}

        <GoogleAuthButton
          text="signup_with"
          onSuccess={handleGoogleSuccess}
          onError={(message) => setErrors({ form: message })}
        />

        <div className="signin-divider">
          <span>ou avec ton téléphone</span>
        </div>

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

        <button type="submit" className="signin-btn-continue signin-btn-continue--app">
          Continuer
        </button>

        <p className="signin-register-link">
          Déjà inscrit ? <Link to="/">Se connecter</Link>
        </p>
        <LegalFooter />
      </form>
    </AuthStage>
  )
}
