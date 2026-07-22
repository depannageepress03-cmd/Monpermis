import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, ChevronRight, Lock, LogOut, Settings, User, X } from 'lucide-react'
import { clearSession } from '../api/auth'
import { fetchAnnouncements, type Announcement } from '../api/announcements'
import { fetchUnreadCount } from '../api/notifications'
import { fetchSubscriptionMe, type SubscriptionAccess } from '../api/subscriptions'
import { BrandName } from '../components/BrandName'
import { HomeBottomAnimation } from '../components/HomeBottomAnimation'
import { CodeModuleIcon, DriveModuleIcon } from '../components/ModuleIcons'
import { useAuth } from '../hooks/useAuth'
import '../styles/auth.css'

function greetingWord() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bonjour'
  if (hour < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

export function HomePage() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [profileOpen, setProfileOpen] = useState(false)
  const [subscription, setSubscription] = useState<SubscriptionAccess | null>(null)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user) return
    void fetchSubscriptionMe().then(setSubscription).catch(() => setSubscription(null))
    void fetchAnnouncements().then(setAnnouncements).catch(() => setAnnouncements([]))
    void fetchUnreadCount()
      .then(({ unreadCount: count }) => setUnreadCount(count))
      .catch(() => setUnreadCount(0))
  }, [user])

  const handleLogout = () => {
    clearSession()
    navigate('/intro', { replace: true })
  }

  if (loading || !user) return null

  const fullName = `${user.firstName} ${user.lastName}`.trim()
  const codeLocked = subscription?.accessCode === false
  const conduiteLocked = subscription?.accessConduite === false

  return (
    <div className="home-app">
      <div className="home-app-inner">
        <header className="home-app-top">
          <div className="home-app-brand">
            <div className="home-app-logo-badge">
              <img src="/logo.png" alt="" width={32} height={32} />
            </div>
            <BrandName as="h1" className="home-app-brand-name" />
          </div>
          <div className="home-app-actions">
            <button
              type="button"
              className="home-app-icon-btn"
              onClick={() => navigate('/notifications')}
              aria-label="Mes notifications"
            >
              <Bell size={19} />
              {unreadCount > 0 ? (
                <span className="home-app-bell-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
              ) : null}
            </button>
            <button
              type="button"
              className="home-app-icon-btn"
              onClick={() => setProfileOpen(true)}
              aria-label="Voir mon profil"
            >
              <User size={19} />
            </button>
          </div>
        </header>

        <section className="home-app-hero">
          <p className="home-app-eyebrow">{greetingWord()}</p>
          <h2 className="home-app-name">{user.firstName}</h2>
          <p className="home-app-subtitle">Ton permis commence ici. Choisis ton parcours ci-dessous.</p>
        </section>

        <section className="home-app-sub-strip">
          {subscription?.hasActiveSubscription ? (
            <>
              <div>
                <strong>{subscription.subscription?.planName || 'Abonnement actif'}</strong>
                <span>Parcours accessibles</span>
              </div>
              <button type="button" onClick={() => navigate('/abonnement')}>
                Gérer
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
                    ? 'En attente de validation'
                    : 'Souscris pour débloquer'}
                </span>
              </div>
              <button type="button" onClick={() => navigate('/abonnement')}>
                Voir les offres
              </button>
            </>
          )}
        </section>

        <p className="home-app-section-label">Sur la route avec Monpermis</p>
        <div className="home-image-marquee home-app-marquee" aria-hidden="true">
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

        {announcements.length > 0 ? (
          <section className="home-app-news">
            <p className="home-app-section-label">Actualités</p>
            <div className="home-app-news-list">
              {announcements.slice(0, 3).map((item) => (
                <article key={item.id} className={`home-app-news-card home-news-card--${item.kind}`}>
                  <strong>{item.title}</strong>
                  {item.body ? <p>{item.body}</p> : null}
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <p className="home-app-section-label">Choisis ton parcours</p>
        <div className="home-app-paths">
          <button
            type="button"
            className={`home-app-path home-app-path--code${codeLocked ? ' is-locked' : ''}`}
            disabled={codeLocked}
            onClick={() => navigate('/code-de-la-route')}
          >
            <span className="home-app-path-icon">
              <CodeModuleIcon size={36} />
            </span>
            <span className="home-app-path-text">
              <strong>Code de la route</strong>
              <small>
                {codeLocked ? (
                  <>
                    <Lock size={12} /> Abonnement requis
                  </>
                ) : (
                  'Cours, quiz & examens'
                )}
              </small>
            </span>
            <ChevronRight size={20} className="home-app-path-chevron" />
          </button>

          <button
            type="button"
            className={`home-app-path home-app-path--drive${conduiteLocked ? ' is-locked' : ''}`}
            disabled={conduiteLocked}
            onClick={() => navigate('/conduite')}
          >
            <span className="home-app-path-icon">
              <DriveModuleIcon size={36} />
            </span>
            <span className="home-app-path-text">
              <strong>Conduite</strong>
              <small>
                {conduiteLocked ? (
                  <>
                    <Lock size={12} /> Abonnement requis
                  </>
                ) : (
                  'Leçons & réservations'
                )}
              </small>
            </span>
            <ChevronRight size={20} className="home-app-path-chevron" />
          </button>
        </div>

        <HomeBottomAnimation />
      </div>

      {profileOpen ? (
        <div className="home-profile-backdrop" role="presentation" onClick={() => setProfileOpen(false)}>
          <div
            className="home-profile-card home-profile-card--light"
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
            <button
              type="button"
              className="btn-outline"
              style={{ width: '100%', marginBottom: 10 }}
              onClick={() => {
                setProfileOpen(false)
                navigate('/profil')
              }}
            >
              <Settings size={16} />
              Modifier mon profil
            </button>
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
