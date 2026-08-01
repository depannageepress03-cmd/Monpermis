import { FormEvent, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  Eye,
  EyeOff,
  History,
  LockKeyhole,
  Phone,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import logoUrl from '../assets/logo.png'
import { BrandName } from '../components/BrandName'
import { isAuthError, useAdminAuth } from '../context/AdminAuthContext'
import { SITE_NAME } from '../theme/brand'
import { normalizePhone, PHONE_PLACEHOLDER } from '../utils/validation'

export function LoginPage() {
  const { admin, loading, signIn, canManageAdmins } = useAdminAuth()
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const homePath = useMemo(
    () => (canManageAdmins || admin?.role === 'superadmin' ? '/cockpit' : '/'),
    [admin?.role, canManageAdmins],
  )

  if (!loading && admin) {
    return <Navigate to={homePath} replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const result = await signIn(normalizePhone(phone), password)
      navigate(result.homePath || '/', { replace: true })
    } catch (err) {
      if (isAuthError(err)) {
        setError(err.message)
      } else {
        setError('Connexion impossible. Vérifiez votre connexion réseau.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-bg" aria-hidden="true">
        <span className="login-bg-halo login-bg-halo--green" />
        <span className="login-bg-halo login-bg-halo--blue" />
        <span className="login-bg-dots login-bg-dots--tr" />
        <span className="login-bg-dots login-bg-dots--bl" />
      </div>

      <div className="login-shell">
        <aside className="login-aside" aria-label="Présentation Monpermis">
          <div className="login-aside-glow" aria-hidden="true" />
          <img src={logoUrl} alt="" className="login-aside-logo" />
          <BrandName as="p" className="login-aside-brand" onDark />
          <p className="login-aside-text">
            Espace admin Monpermis — pilotage des apprenants, du contenu et des opérations.
          </p>
          <ul className="login-aside-points">
            <li>
              <span className="login-aside-point-icon" aria-hidden="true">
                <UserRound size={16} />
              </span>
              <span>Admin : opérations quotidiennes (contenu, abonnements, conduite)</span>
            </li>
            <li>
              <span className="login-aside-point-icon" aria-hidden="true">
                <ShieldCheck size={16} />
              </span>
              <span>Superadmin : crée les comptes admin et gère finances / audit</span>
            </li>
            <li>
              <span className="login-aside-point-icon" aria-hidden="true">
                <LockKeyhole size={16} />
              </span>
              <span>Un seul formulaire — les droits dépendent du rôle du compte</span>
            </li>
          </ul>
          <div className="login-aside-skyline" aria-hidden="true">
            <svg viewBox="0 0 360 72" preserveAspectRatio="none">
              <path
                d="M0 72V48h18V28h10v20h14V18h8v10h12V8h16v20h10V32h22V14h12v18h18V24h14v24h20V36h10v12h16V20h12v28h18V40h14v32H0z"
                fill="currentColor"
              />
            </svg>
          </div>
        </aside>

        <div className="login-card">
          <div className="login-card-top">
            <img src={logoUrl} alt={SITE_NAME} className="login-logo" />
            <BrandName as="p" className="login-brand-name" />
            <p className="login-badge-text">
              <ShieldCheck size={16} aria-hidden="true" />
              <span>
                Espace sécurisé · <strong>Administration</strong>
              </span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="login-form" autoComplete="on">
            <label htmlFor="phone">Téléphone</label>
            <div className="login-phone-field">
              <span className="login-phone-prefix" aria-hidden="true">
                <span className="login-flag" title="Bénin">
                  🇧🇯
                </span>
                <span className="login-phone-cc">+229</span>
              </span>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="username"
                required
                value={phone}
                onChange={(e) => setPhone(normalizePhone(e.target.value))}
                placeholder={PHONE_PLACEHOLDER}
              />
              <Phone className="login-phone-icon" size={16} aria-hidden="true" />
            </div>

            <label htmlFor="password">Mot de passe</label>
            <div className="login-input-wrap">
              <LockKeyhole className="login-input-leading" size={16} aria-hidden="true" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                className="login-input-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <p className="login-hint">
              <LockKeyhole size={13} aria-hidden="true" />
              <span>
                Connectez-vous avec votre téléphone et mot de passe. Vos droits (admin ou
                superadmin) sont appliqués automatiquement.
              </span>
            </p>

            {error ? (
              <p className="form-error" role="alert">
                {error}
              </p>
            ) : null}

            <button type="submit" className="btn-primary login-submit" disabled={submitting}>
              <LockKeyhole size={18} />
              {submitting ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>

          <div className="login-card-footer">
            <p className="login-footer-label">Sécurité et confidentialité</p>
            <ul className="login-trust">
              <li>
                <span className="login-trust-icon" aria-hidden="true">
                  <ShieldCheck size={14} />
                </span>
                Connexion sécurisée
              </li>
              <li>
                <span className="login-trust-icon" aria-hidden="true">
                  <UserRound size={14} />
                </span>
                Accès réservé et contrôlé
              </li>
              <li>
                <span className="login-trust-icon" aria-hidden="true">
                  <History size={14} />
                </span>
                Activité tracée
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
