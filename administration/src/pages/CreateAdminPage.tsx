import { FormEvent, useEffect, useState } from 'react'
import { ArrowLeft, Check, KeyRound, Phone, ShieldAlert, UserPlus, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DirectionSection } from '../components/model/DirectionSection'
import { createAdmin, fetchRegistrationStatus } from '../api/auth'
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
  const [role, setRole] = useState<'admin' | 'superadmin'>('admin')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [registrationAllowed, setRegistrationAllowed] = useState<boolean | null>(null)

  useEffect(() => {
    const token = getAdminToken()
    if (!token) return
    fetchRegistrationStatus(token)
      .then(({ allowed }) => setRegistrationAllowed(allowed))
      .catch(() => setRegistrationAllowed(null))
  }, [])

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
        role,
      )
      setSuccess(
        `Administrateur « ${admin.fullName} » créé (${role === 'superadmin' ? 'superadmin' : 'admin'}).`,
      )
      setFullName('')
      setPhone('')
      setPassword('')
      setConfirmPassword('')
      setRole('admin')
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
    <DirectionSection
      kicker="Gestion"
      title="Nouvel administrateur"
      subtitle="Ajoutez un compte admin (opérations) ou superadmin (gestion des comptes, audit, trésorerie)."
      actions={
        <Link to="/administrateurs" className="cx-refresh">
          <ArrowLeft aria-hidden />
          Tous les administrateurs
        </Link>
      }
    >
      {registrationAllowed === false ? (
        <p className="cx-note cx-note-err" role="alert">
          La création d’administrateurs est désactivée sur ce serveur (variable ALLOW_ADMIN_REGISTRATION). Activez-la
          dans la configuration du serveur pour créer un nouveau compte.
        </p>
      ) : null}

      <div className="cx-split" style={{ gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)' }}>
        <section className="cx-panel">
          <div className="cx-panel-head cx-ph cx-ph-plain">
            <span className="cx-phi cx-phi-tile">
              <UserPlus aria-hidden />
            </span>
            <div className="cx-ph-txt">
              <h2 className="cx-panel-title">Informations du compte</h2>
              <p className="cx-muted">Tous les champs sont obligatoires</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="cx-form" aria-disabled={registrationAllowed === false}>
            <div className="cx-form-grid">
              <div className="cx-fld">
                <label htmlFor="fullName">
                  <UserRound aria-hidden />
                  Nom complet
                </label>
                <input
                  id="fullName"
                  className="cx-input"
                  type="text"
                  autoComplete="name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nom de l’administrateur"
                />
              </div>

              <div className="cx-fld">
                <label htmlFor="phone">
                  <Phone aria-hidden />
                  Téléphone
                </label>
                <input
                  id="phone"
                  className="cx-input"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(normalizePhone(e.target.value))}
                  placeholder={PHONE_PLACEHOLDER}
                />
              </div>

              <div className="cx-fld" style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="role">
                  <ShieldAlert aria-hidden />
                  Rôle
                </label>
                <select
                  id="role"
                  className="cx-select"
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'admin' | 'superadmin')}
                >
                  <option value="admin">Admin — opérations courantes</option>
                  <option value="superadmin">Superadmin — admins, audit &amp; finances</option>
                </select>
              </div>

              <div className="cx-fld">
                <label htmlFor="password">
                  <KeyRound aria-hidden />
                  Mot de passe
                </label>
                <input
                  id="password"
                  className="cx-input"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <div className="cx-fld">
                <label htmlFor="confirmPassword">
                  <KeyRound aria-hidden />
                  Confirmer le mot de passe
                </label>
                <input
                  id="confirmPassword"
                  className="cx-input"
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

            {error ? <p className="cx-note cx-note-err" role="alert">{error}</p> : null}
            {success ? <p className="cx-note cx-note-ok" role="status">{success}</p> : null}

            <div className="cx-form-actions">
              <button
                type="submit"
                disabled={submitting || registrationAllowed === false}
                className="cx-btn cx-btn-fill"
              >
                <UserPlus aria-hidden />
                {submitting ? 'Création…' : 'Créer l’administrateur'}
              </button>
            </div>
          </form>
        </section>

        <aside className="cx-panel">
          <div className="cx-panel-head cx-ph cx-ph-plain">
            <span className="cx-phi cx-phi-tile">
              <Check aria-hidden />
            </span>
            <div className="cx-ph-txt">
              <h2 className="cx-panel-title">Bonnes pratiques</h2>
              <p className="cx-muted">À respecter à la création d’un compte</p>
            </div>
          </div>
          <div className="cx-todo">
            {[
              'Utilisez un numéro de téléphone valide et unique.',
              'Choisissez un mot de passe d’au moins 8 caractères.',
              'Ne partagez jamais les identifiants admin.',
              'Réservez le rôle superadmin aux personnes qui gèrent l’équipe.',
              'Seul un superadmin peut créer un admin ou un autre superadmin.',
              'Créez uniquement les comptes nécessaires à l’équipe.',
            ].map((tip) => (
              <div key={tip} style={{ display: 'flex', alignItems: 'flex-start', gap: '.7rem', padding: '.6rem .2rem' }}>
                <span className="cx-todo-ico cx-ok" style={{ width: '1.8rem', height: '1.8rem' }}>
                  <Check aria-hidden />
                </span>
                <span style={{ fontSize: '.9rem', color: 'var(--ink)' }}>{tip}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </DirectionSection>
  )
}
