import { FormEvent, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  Code2,
  CreditCard,
  Eye,
  EyeOff,
  History,
  LockKeyhole,
  Phone,
  Shield,
  ShieldCheck,
  UserRound,
  Users,
} from 'lucide-react'
import logoUrl from '../assets/logo.png'
import { BrandName } from '../components/BrandName'
import { isAuthError, useAdminAuth } from '../context/AdminAuthContext'
import { SITE_NAME } from '../theme/brand'
import { normalizePhone, PHONE_PLACEHOLDER } from '../utils/validation'

type Portal = 'ops' | 'direction'

export function LoginPage() {
  const { admin, loading, signIn, canManageAdmins } = useAdminAuth()
  const navigate = useNavigate()
  const [portal, setPortal] = useState<Portal>('ops')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [accessKey, setAccessKey] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showKey, setShowKey] = useState(false)
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
      const result = await signIn(normalizePhone(phone), password, {
        portal,
        accessKey: portal === 'direction' ? accessKey : undefined,
      })
      navigate(result.homePath || (portal === 'direction' ? '/cockpit' : '/'), { replace: true })
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
    <div className={`login-page${portal === 'direction' ? ' is-direction' : ''}`}>
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
                <CreditCard size={16} />
              </span>
              <span>Suivi des abonnements et paiements</span>
            </li>
            <li>
              <span className="login-aside-point-icon" aria-hidden="true">
                <Code2 size={16} />
              </span>
              <span>Gestion du code et de la conduite</span>
            </li>
            <li>
              <span className="login-aside-point-icon" aria-hidden="true">
                <Shield size={16} />
              </span>
              <span>Accès réservé au personnel autorisé</span>
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
                {portal === 'direction' ? (
                  <>
                    Portail Direction · <strong>Accès superadmin</strong>
                  </>
                ) : (
                  <>
                    Espace sécurisé · <strong>Administration</strong>
                  </>
                )}
              </span>
            </p>
          </div>

          <div className="login-portal-tabs" role="tablist" aria-label="Type d’accès">
            <button
              type="button"
              role="tab"
              aria-selected={portal === 'ops'}
              className={portal === 'ops' ? 'is-active' : undefined}
              onClick={() => {
                setPortal('ops')
                setAccessKey('')
                setError(null)
              }}
            >
              <Users size={16} />
              Équipe
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={portal === 'direction'}
              className={portal === 'direction' ? 'is-active' : undefined}
              onClick={() => {
                setPortal('direction')
                setError(null)
              }}
            >
              <Shield size={16} />
              Direction
            </button>
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

            {portal === 'direction' ? (
              <>
                <label htmlFor="accessKey">Clé Direction</label>
                <div className="login-input-wrap">
                  <Shield className="login-input-leading" size={16} aria-hidden="true" />
                  <input
                    id="accessKey"
                    type={showKey ? 'text' : 'password'}
                    autoComplete="off"
                    required
                    minLength={12}
                    value={accessKey}
                    onChange={(e) => setAccessKey(e.target.value)}
                    placeholder="Clé secrète (serveur)"
                  />
                  <button
                    type="button"
                    className="login-input-toggle"
                    onClick={() => setShowKey((v) => !v)}
                    aria-label={showKey ? 'Masquer la clé' : 'Afficher la clé'}
                  >
                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="login-hint">
                  <LockKeyhole size={13} aria-hidden="true" />
                  <span>
                    Clé secrète Direction — connue uniquement de la direction, jamais des admins
                    ops ni du public.
                  </span>
                </p>
              </>
            ) : (
              <p className="login-hint">
                <LockKeyhole size={13} aria-hidden="true" />
                <span>
                  Compte ops : téléphone + mot de passe. Les fonctions Direction (compta, admins,
                  journal) restent inaccessibles.
                </span>
              </p>
            )}

            {error ? (
              <p className="form-error" role="alert">
                {error}
              </p>
            ) : null}

            <button type="submit" className="btn-primary login-submit" disabled={submitting}>
              <LockKeyhole size={18} />
              {submitting
                ? 'Connexion…'
                : portal === 'direction'
                  ? 'Entrer dans le cockpit'
                  : 'Se connecter'}
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
