import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { type FormEvent, useState } from 'react'
import { registerUser } from '../api/auth'
import { AuthInput } from '../components/AuthInput'
import { AuthStage } from '../components/AuthStage'
import { LegalFooter } from '../components/LegalFooter'
import { validatePassword } from '../utils/validation'
import '../styles/login.css'

type RegisterDraft = {
  firstName: string
  lastName: string
  phone: string
}

export function RegisterPasswordPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const draft = (location.state as RegisterDraft | null) || null
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string; form?: string }>({})
  const [loading, setLoading] = useState(false)

  if (!draft?.firstName || !draft?.lastName || !draft?.phone) {
    return <Navigate to="/inscription" replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const passwordError = validatePassword(password)
    const confirmPasswordError = !confirmPassword
      ? 'Confirme ton mot de passe'
      : confirmPassword !== password
        ? 'Les mots de passe ne correspondent pas'
        : undefined

    if (passwordError || confirmPasswordError) {
      setErrors({ password: passwordError, confirmPassword: confirmPasswordError })
      return
    }

    setErrors({})
    setLoading(true)
    try {
      const { message } = await registerUser({
        firstName: draft.firstName,
        lastName: draft.lastName,
        phone: draft.phone,
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
    <AuthStage tagline="Code, conduite, confiance, avance à ton rythme." imageSrc="/home/i2.jpg">
      <p className="auth-stage-kicker">Inscription</p>
      <h2 className="auth-stage-heading">Mot de passe</h2>
      <p className="auth-stage-lead">Choisis un mot de passe pour sécuriser ton compte.</p>

      <form className="signin-form signin-form--stage" onSubmit={handleSubmit} noValidate>
        {errors.form ? <p className="signin-banner signin-banner--err">{errors.form}</p> : null}

        <div className="signin-fields">
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
          <AuthInput
            label="Confirmer"
            name="confirmPassword"
            type="password"
            placeholder="Confirme ton mot de passe"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={errors.confirmPassword}
          />
          <p className="signin-field-hint">Min. 8 caractères, avec majuscule, minuscule et chiffre.</p>
        </div>

        <button type="submit" className="signin-btn-continue signin-btn-continue--app" disabled={loading}>
          {loading ? 'Inscription en cours…' : "S'inscrire"}
        </button>

        <p className="signin-register-link">
          <Link to="/inscription">Retour</Link>
        </p>
        <LegalFooter />
      </form>
    </AuthStage>
  )
}
