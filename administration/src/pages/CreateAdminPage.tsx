import { FormEvent, useState } from 'react'
import { KeyRound, Phone, UserPlus, UserRound } from 'lucide-react'
import { createAdmin } from '../api/auth'
import { getAdminToken, isAuthError } from '../context/AdminAuthContext'
import {
  normalizePhone,
  PHONE_PLACEHOLDER,
  validateName,
  validatePassword,
  validatePhone,
} from '../utils/validation'

export function CreateAdminPage() {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const nameError = validateName(fullName)
    const phoneError = validatePhone(phone)
    const passwordError = validatePassword(password)
    const confirmError = !confirmPassword
      ? 'Confirmez le mot de passe'
      : confirmPassword !== password
        ? 'Les mots de passe ne correspondent pas'
        : undefined

    if (nameError || phoneError || passwordError || confirmError) {
      setError(nameError ?? phoneError ?? passwordError ?? confirmError ?? null)
      return
    }

    const token = getAdminToken()
    if (!token) {
      setError('Session expirée. Reconnectez-vous.')
      return
    }

    setSubmitting(true)

    try {
      const { admin } = await createAdmin(
        token,
        fullName.trim(),
        normalizePhone(phone),
        password,
        confirmPassword,
      )
      setSuccess(`Administrateur « ${admin.fullName} » créé avec succès.`)
      setFullName('')
      setPhone('')
      setPassword('')
      setConfirmPassword('')
    } catch (err) {
      if (isAuthError(err)) {
        setError(err.message)
      } else {
        setError('Création impossible. Vérifiez votre connexion réseau.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-intro">
        <p className="admin-page-intro-label">Gestion</p>
        <h2 className="admin-page-intro-title">Nouvel administrateur</h2>
        <p className="admin-page-intro-text">
          Ajoutez un compte avec accès sécurisé à l’espace d’administration.
        </p>
      </div>

      <section className="admin-section">
        <div className="admin-section-head">
          <h3 className="admin-section-label">Informations du compte</h3>
        </div>
        <div className="admin-section-body">
          <form onSubmit={handleSubmit} className="create-admin-form">
            <div className="create-admin-grid">
              <div className="create-admin-field">
                <label htmlFor="fullName">
                  <UserRound size={14} />
                  Nom complet
                </label>
                <input
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nom de l'administrateur"
                />
              </div>

              <div className="create-admin-field">
                <label htmlFor="phone">
                  <Phone size={14} />
                  Téléphone
                </label>
                <input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(normalizePhone(e.target.value))}
                  placeholder={PHONE_PLACEHOLDER}
                />
              </div>

              <div className="create-admin-field">
                <label htmlFor="password">
                  <KeyRound size={14} />
                  Mot de passe
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <div className="create-admin-field">
                <label htmlFor="confirmPassword">
                  <KeyRound size={14} />
                  Confirmer le mot de passe
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error ? <p className="form-error" role="alert">{error}</p> : null}
            {success ? <p className="form-success" role="status">{success}</p> : null}

            <button type="submit" disabled={submitting} className="btn-primary btn-primary-inline">
              <UserPlus size={18} />
              {submitting ? 'Création…' : "Créer l'administrateur"}
            </button>
          </form>
        </div>
      </section>

      <aside className="admin-section">
        <div className="admin-section-head">
          <h3 className="admin-section-label">Bonnes pratiques</h3>
        </div>
        <div className="admin-section-body">
          <ul className="admin-tips">
            <li>Utilisez un numéro de téléphone valide et unique.</li>
            <li>Choisissez un mot de passe d’au moins 8 caractères.</li>
            <li>Ne partagez jamais les identifiants admin.</li>
            <li>Créez uniquement les comptes nécessaires à l’équipe.</li>
          </ul>
        </div>
      </aside>
    </div>
  )
}
