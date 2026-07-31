import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  ChevronRight,
  CreditCard,
  History,
  Lock,
  LogOut,
  MessageCircle,
  Settings,
  User,
  X,
} from 'lucide-react'
import { supportWhatsAppUrl } from '../utils/support'
import { clearSession } from '../api/auth'
import { fetchUnreadCount } from '../api/notifications'
import { fetchAccessMe, type AccessMe } from '../api/accessRequests'
import { BrandName } from '../components/BrandName'
import { HomeBottomAnimation } from '../components/HomeBottomAnimation'
import { PageLoader } from '../components/PageLoader'
import { PageSkeleton } from '../components/PageSkeleton'
import { useAuth } from '../hooks/useAuth'
import { useFocusRefresh } from '../hooks/useFocusRefresh'
import { getActiveSubscriptions } from '../utils/subscriptionSummary'
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
  const [accessReady, setAccessReady] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user) return
    setAccessReady(false)
    void fetchAccessMe()
      .then(setAccessMe)
      .catch(() => setAccessMe(null))
      .finally(() => setAccessReady(true))
    void fetchUnreadCount()
      .then(({ unreadCount: count }) => setUnreadCount(count))
      .catch(() => setUnreadCount(0))
  }, [user])

  useFocusRefresh(Boolean(user), () => {
    void fetchAccessMe().then(setAccessMe).catch(() => setAccessMe(null))
  })

  const handleLogout = () => {
    clearSession()
    navigate('/intro', { replace: true })
  }

  if (loading || !user) return <PageLoader />
  if (!accessReady) {
    return (
      <div className="home-app" data-home-layout="fullbleed-v3">
        <div className="home-app-inner">
          <PageSkeleton variant="home" />
        </div>
      </div>
    )
  }

  const activeSubscriptions = getActiveSubscriptions(accessMe)
  const nearestSub = activeSubscriptions[0]

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
            <span>
              {nearestSub
                ? `${nearestSub.label} · ${nearestSub.daysLeft} j restant${nearestSub.daysLeft > 1 ? 's' : ''}`
                : 'Parcours accessibles'}
            </span>
          </div>
          <button type="button" onClick={() => navigate('/abonnement')}>
            {nearestSub && nearestSub.daysLeft <= 7 ? 'Renouveler' : 'Gérer'}
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

  const accessButton = (
    <button
      type="button"
      className="home-app-path home-app-path--panel home-app-path--access home-app-access-top"
      onClick={() => navigate('/abonnement')}
    >
      <span className="home-app-path-shade" aria-hidden="true" />
      <span className="home-app-path-text">
        <strong>Abonnement</strong>
        <small>{hasActiveAccess ? 'Gérer mes accès' : 'Débloquer les parcours'}</small>
      </span>
      <ChevronRight size={22} className="home-app-path-chevron" />
    </button>
  )

  const pathsSection = (
    <section className="home-desk-paths home-app-paths-block">
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
  )

  return (
    <div className="home-app home-app--static" data-home-layout="route-claire">
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
            className="home-app-sub-strip home-app-sub-strip--warn"
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

        {/* Mobile: abonnement au-dessus, images, puis parcours — page fixe */}
        <div className="home-mobile-stack">
          <section className="home-app-hero home-app-hero--enter">
            <p className="home-app-eyebrow">{greetingWord()}</p>
            <h2 className="home-app-name">{user.firstName}</h2>
            <p className="home-app-subtitle">Code, conduite — ta route vers le permis.</p>
          </section>
          {subStrip}
          {accessButton}
          <p className="home-app-section-label">Sur la route avec Monpermis</p>
          {marquee}
          {pathsSection}
          <div className="home-app-bottom-anim">
            <HomeBottomAnimation />
          </div>
        </div>

        {/* Desktop: intro + visuel, parcours sous le carrousel */}
        <div className="home-desk-stage">
          <div className="home-desk-intro">
            <section className="home-app-hero home-app-hero--enter">
              <p className="home-app-eyebrow">{greetingWord()}</p>
              <h2 className="home-app-name">{user.firstName}</h2>
              <p className="home-app-subtitle">Code, conduite — ta route vers le permis.</p>
            </section>
            {subStrip}
            {accessButton}
          </div>
          <div className="home-desk-visual">
            <p className="home-app-section-label">Sur la route avec Monpermis</p>
            {marquee}
          </div>
        </div>

        <div className="home-desk-only-paths">{pathsSection}</div>
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
                <dt>Téléphone</dt>
                <dd>{user.phone || '—'}</dd>
              </div>
              <div>
                <dt>Compte</dt>
                <dd>Téléphone / mot de passe</dd>
              </div>
            </dl>
            <div className="home-profile-shortcuts">
              <button
                type="button"
                className="home-profile-shortcut"
                onClick={() => {
                  setProfileOpen(false)
                  navigate('/abonnement')
                }}
              >
                <CreditCard size={16} />
                Abonnement / Mes accès
              </button>
              <button
                type="button"
                className="home-profile-shortcut"
                onClick={() => {
                  setProfileOpen(false)
                  navigate('/abonnement/historique')
                }}
              >
                <History size={16} />
                Historique des paiements
              </button>
              <a
                className="home-profile-shortcut"
                href={supportWhatsAppUrl('Bonjour Monpermis, j’ai besoin d’aide.')}
                target="_blank"
                rel="noreferrer"
                onClick={() => setProfileOpen(false)}
              >
                <MessageCircle size={16} />
                Support WhatsApp
              </a>
            </div>
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
