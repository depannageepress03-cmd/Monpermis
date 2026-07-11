import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Car, Lock, LogOut, User, X } from 'lucide-react'
import { clearSession } from '../api/auth'
import { fetchSubscriptionMe, type SubscriptionAccess } from '../api/subscriptions'
import { BrandName } from '../components/BrandName'
import { HomeBottomAnimation } from '../components/HomeBottomAnimation'
import { CodeModuleIcon, DriveModuleIcon } from '../components/ModuleIcons'
import { useAuth } from '../hooks/useAuth'
import '../styles/auth.css'

export function HomePage() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [profileOpen, setProfileOpen] = useState(false)
  const [subscription, setSubscription] = useState<SubscriptionAccess | null>(null)

  useEffect(() => {
    if (!user) return
    void fetchSubscriptionMe().then(setSubscription).catch(() => setSubscription(null))
  }, [user])

  const handleLogout = () => {
    clearSession()
    navigate('/', { replace: true })
  }

  if (loading || !user) return null

  const fullName = `${user.firstName} ${user.lastName}`.trim()

  return (
    <div className="auth-page home-page">
      <div className="auth-container home-container">
        <header className="auth-header home-brand-header">
          <div className="home-brand-bar">
            <div className="home-brand-left">
              <div className="auth-logo home-brand-logo">
                <Car size={22} strokeWidth={2} />
              </div>
              <BrandName as="h1" onDark className="home-brand-name" />
            </div>
            <button
              type="button"
              className="home-profile-btn"
              onClick={() => setProfileOpen(true)}
              aria-label="Voir mon profil"
            >
              <User size={20} />
            </button>
          </div>
        </header>

        <div className="home-image-marquee" aria-hidden="true">
          <div className="home-image-marquee-track">
            {[1, 2, 3, 4, 5, 1].map((n, i) => (
              <img
                key={`${n}-${i}`}
                src={`/home/i${n}.jpg`}
                alt=""
                className="home-image-marquee-item"
              />
            ))}
          </div>
        </div>

        <div className="home-guide">
          <p className="home-guide-line">
            <span className="home-guide-name">{user.firstName}</span>
            , ton permis t’attend.
          </p>
        </div>

        <section className="home-subscription-card">
          {subscription?.hasActiveSubscription ? (
            <>
              <div>
                <strong>{subscription.subscription?.planName || 'Abonnement actif'}</strong>
                <span>Parcours accessibles</span>
              </div>
              <button type="button" className="btn-outline" onClick={() => navigate('/abonnement')}>
                Renouveler
              </button>
            </>
          ) : (
            <>
              <div>
                <strong>
                  {subscription?.pendingSubscription ? 'Paiement en validation' : 'Accès verrouillé'}
                </strong>
                <span>
                  {subscription?.pendingSubscription
                    ? 'En attente de validation admin'
                    : 'Souscrivez pour débloquer'}
                </span>
              </div>
              <button type="button" className="btn-primary" onClick={() => navigate('/abonnement')}>
                Voir les offres
              </button>
            </>
          )}
        </section>

        <div className="home-modules-center">
          <p className="home-modules-bridge">
            Commencez par le code pour maîtriser les règles de circulation, les panneaux et les
            priorités. Une fois vos bases solides, passez à la conduite pour vous entraîner sur la
            route avec un moniteur.
          </p>

          <div className="auth-card home-modules-card">
            <div className="menu-buttons">
              <button
                type="button"
                className={`menu-btn menu-btn-code${subscription && !subscription.accessCode ? ' is-locked' : ''}`}
                disabled={Boolean(subscription && !subscription.accessCode)}
                title={subscription && !subscription.accessCode ? 'Un abonnement Code est requis.' : undefined}
                onClick={() => navigate('/code-de-la-route')}
              >
                <span className="menu-btn-icon menu-btn-icon-illus">
                  <CodeModuleIcon size={36} />
                </span>
                <span className="menu-btn-content">
                  <strong>Code</strong>
                  <small>{subscription && !subscription.accessCode ? <><Lock size={12} /> Abonnement requis</> : 'Cours & QCM'}</small>
                </span>
              </button>

              <button
                type="button"
                className={`menu-btn menu-btn-drive${subscription && !subscription.accessConduite ? ' is-locked' : ''}`}
                disabled={Boolean(subscription && !subscription.accessConduite)}
                title={subscription && !subscription.accessConduite ? 'Un abonnement Conduite est requis.' : undefined}
                onClick={() => navigate('/conduite')}
              >
                <span className="menu-btn-icon menu-btn-icon-illus">
                  <DriveModuleIcon size={36} />
                </span>
                <span className="menu-btn-content">
                  <strong>Conduite</strong>
                  <small>{subscription && !subscription.accessConduite ? <><Lock size={12} /> Abonnement requis</> : 'Leçons'}</small>
                </span>
              </button>
            </div>
          </div>
        </div>

        <HomeBottomAnimation />
      </div>

      {profileOpen ? (
        <div
          className="home-profile-backdrop"
          role="presentation"
          onClick={() => setProfileOpen(false)}
        >
          <div
            className="home-profile-card"
            role="dialog"
            aria-label="Mon identité"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="home-profile-card-head">
              <div className="home-profile-avatar">
                <User size={28} />
              </div>
              <button
                type="button"
                className="home-profile-close"
                onClick={() => setProfileOpen(false)}
                aria-label="Fermer"
              >
                <X size={18} />
              </button>
            </div>
            <p className="home-profile-kicker">Mon identité</p>
            <h2 className="home-profile-name">{fullName}</h2>
            <dl className="home-profile-rows">
              <div>
                <dt>E-mail</dt>
                <dd>{user.email || '—'}</dd>
              </div>
              <div>
                <dt>Téléphone</dt>
                <dd>{user.phone || '—'}</dd>
              </div>
              <div>
                <dt>Compte</dt>
                <dd>{user.authProvider === 'google' ? 'Google' : 'E-mail / mot de passe'}</dd>
              </div>
            </dl>
            <button type="button" className="btn-primary" onClick={handleLogout}>
              <LogOut size={16} />
              Se déconnecter
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
