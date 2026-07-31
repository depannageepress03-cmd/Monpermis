import { FormEvent, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LockKeyhole, Shield, Users } from 'lucide-react'
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
      <div className="login-shell">
        <aside className="login-aside" aria-hidden={false}>
          <img src={logoUrl} alt="" className="login-aside-logo" />
          <BrandName as="p" className="login-aside-brand" onDark />
          <p className="login-aside-text">
            Espace admin Monpermis — pilotage des apprenants, du contenu et des opérations.
          </p>
          <ul className="login-aside-points">
            <li>Suivi des abonnements et paiements</li>
            <li>Gestion du code et de la conduite</li>
            <li>Accès réservé au personnel autorisé</li>
          </ul>
        </aside>

        <div className="login-card">
          <div className="login-card-top">
            <img src={logoUrl} alt={SITE_NAME} className="login-logo" />
            <BrandName as="p" className="login-brand-name" />
            <p className="login-badge-text">
              {portal === 'direction'
                ? 'Portail Direction · Accès superadmin'
                : 'Espace sécurisé · Administration'}
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
              <Users size={14} />
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
              <Shield size={14} />
              Direction
            </button>
          </div>

          <form onSubmit={handleSubmit} className="login-form" autoComplete="on">
            <label htmlFor="phone">Téléphone</label>
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

            <label htmlFor="password">Mot de passe</label>
            <div className="login-input-wrap">
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
                  Clé secrète Direction — connue uniquement de la direction, jamais des admins
                  ops ni du public.
                </p>
              </>
            ) : (
              <p className="login-hint">
                Compte ops : téléphone + mot de passe. Les fonctions Direction (compta, admins,
                journal) restent inaccessibles.
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
        </div>
      </div>
    </div>
  )
}
