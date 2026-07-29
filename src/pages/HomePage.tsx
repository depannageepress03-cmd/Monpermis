import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, ChevronRight, Lock, LogOut, Settings, User, X } from 'lucide-react'
import { clearSession } from '../api/auth'
import { fetchAnnouncements, type Announcement } from '../api/announcements'
import { fetchUnreadCount } from '../api/notifications'
import { fetchAccessMe, type AccessMe } from '../api/accessRequests'
import { AnnouncementCard } from '../components/AnnouncementCard'
import { BrandName } from '../components/BrandName'
import { HomeBottomAnimation } from '../components/HomeBottomAnimation'
import { LegalFooter } from '../components/LegalFooter'
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
  const [accessMe, setAccessMe] = useState<AccessMe | null>(null)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user) return
    const refreshAccess = () => {
      void fetchAccessMe().then(setAccessMe).catch(() => setAccessMe(null))
    }
    refreshAccess()
    void fetchAnnouncements().then(setAnnouncements).catch(() => setAnnouncements([]))
    void fetchUnreadCount()
      .then(({ unreadCount: count }) => setUnreadCount(count))
      .catch(() => setUnreadCount(0))

    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshAccess()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', refreshAccess)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', refreshAccess)
    }
  }, [user])

  const handleLogout = () => {
    clearSession()
    navigate('/intro', { replace: true })
  }

  if (loading || !user) return null

  const fullName = `${user.firstName} ${user.lastName}`.trim()
  const needsPhone = !String(user.phone || '').trim()
  const codeLocked = accessMe ? !accessMe.access.code : false
  const conduiteLocked = accessMe
    ? !(accessMe.access.conduite_videos || accessMe.access.conduite_heures || accessMe.user.soldeHeures > 0)
    : false
  const hasActiveAccess =
    Boolean(accessMe) &&
    (Object.values(accessMe!.access).some(Boolean) || accessMe!.user.soldeHeures > 0)
  const pendingRequest = accessMe?.pendingRequest

  const subStrip = (
    <section className="home-app-sub-strip">
      {hasActiveAccess ? (
        <>
          <div>
            <strong>Accès actifs</strong>
            <span>Parcours accessibles</span>
          </div>
          <button type="button" onClick={() => navigate('/abonnement')}>
            Gérer
          </button>
        </>
      ) : (
        <>
          <div>
            <strong>{pendingRequest ? 'Paiement en validation' : 'Accès verrouillé'}</strong>
            <span>
              {pendingRequest ? 'En attente de validation' : 'Achetez un accès pour débloquer'}
            </span>
          </div>
          <button type="button" onClick={() => navigate('/abonnement')}>
            Voir les offres
          </button>
        </>
      )}
    </section>
  )

  const marquee = (
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
  )

  return (
    <div className="home-app" data-home-layout="fullbleed-v3">
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

        {needsPhone ? (
          <section
            className="home-app-sub-strip"
            style={{ marginBottom: 12, borderColor: '#f59e0b', background: '#fffbeb' }}
          >
            <div>
              <strong>Numéro manquant</strong>
              <span>Ajoute ton téléphone pour Mobile Money et les rappels.</span>
            </div>
            <button type="button" onClick={() => navigate('/profil')}>
              Compléter
            </button>
          </section>
        ) : null}

        {/* Mobile stack */}
        <div className="home-mobile-stack">
          <section className="home-app-hero">
            <p className="home-app-eyebrow">{greetingWord()}</p>
            <h2 className="home-app-name">{user.firstName}</h2>
            <p className="home-app-subtitle">
              Ton permis commence ici. Choisis ton parcours ci-dessous.
            </p>
          </section>
          {subStrip}
          <p className="home-app-section-label">Sur la route avec Monpermis</p>
          {marquee}
        </div>

        {/* Desktop: intro + visuel côte à côte */}
        <div className="home-desk-stage">
          <div className="home-desk-intro">
            <section className="home-app-hero">
              <p className="home-app-eyebrow">{greetingWord()}</p>
              <h2 className="home-app-name">{user.firstName}</h2>
              <p className="home-app-subtitle">
                Ton permis commence ici. Choisis ton parcours ci-dessous.
              </p>
            </section>
            {subStrip}
          </div>
          <div className="home-desk-visual">
            <p className="home-app-section-label">Sur la route avec Monpermis</p>
            {marquee}
          </div>
        </div>

        {announcements.length > 0 ? (
          <section className="home-app-news">
            <div className="home-app-news-head">
              <p className="home-app-section-label">Actualités</p>
              <button
                type="button"
                className="home-app-news-all"
                onClick={() => navigate('/actualites')}
              >
                Voir toutes les actualités
                <ChevronRight size={14} />
              </button>
            </div>
            <div className="home-app-news-list">
              {announcements.slice(0, 4).map((item) => (
                <AnnouncementCard
                  key={item.id}
                  item={item}
                  compact
                  onOpen={() => navigate(`/actualites/${item.id}`)}
                />
              ))}
            </div>
          </section>
        ) : null}

        <section className="home-desk-paths">
          <p className="home-app-section-label">Choisis ton parcours</p>
          <div className="home-app-paths">
            <button
              type="button"
              className={`home-app-path home-app-path--photo home-app-path--panel home-app-path--code${codeLocked ? ' is-locked' : ''}`}
              onClick={() => navigate('/code-de-la-route')}
            >
              <img
                src="/home/paths/code.jpg"
                alt=""
                className="home-app-path-image"
                draggable={false}
              />
              <span className="home-app-path-shade" aria-hidden="true" />
              <span className="home-app-path-text">
                <strong>Code de la route</strong>
                <small>
                  {codeLocked ? (
                    <>
                      <Lock size={12} /> Accès requis
                    </>
                  ) : (
                    'Cours, quiz & examens'
                  )}
                </small>
              </span>
              <ChevronRight size={22} className="home-app-path-chevron" />
            </button>

            <button
              type="button"
              className={`home-app-path home-app-path--photo home-app-path--panel home-app-path--drive${conduiteLocked ? ' is-locked' : ''}`}
              onClick={() => navigate('/conduite')}
            >
              <img
                src="/home/paths/conduite.jpg"
                alt=""
                className="home-app-path-image"
                draggable={false}
              />
              <span className="home-app-path-shade" aria-hidden="true" />
              <span className="home-app-path-text">
                <strong>Conduite</strong>
                <small>
                  {conduiteLocked ? (
                    <>
                      <Lock size={12} /> Accès requis
                    </>
                  ) : (
                    'Leçons & réservations'
                  )}
                </small>
              </span>
              <ChevronRight size={22} className="home-app-path-chevron" />
            </button>
          </div>
        </section>

        <div className="home-desk-footer">
          <HomeBottomAnimation />
          <LegalFooter />
        </div>
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
