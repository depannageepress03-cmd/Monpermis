import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, BookOpen, ChevronRight, Lock, User, Video } from 'lucide-react'
import { supportWhatsAppUrl } from '../utils/support'
import { clearSession } from '../api/auth'
import { fetchUnreadCount } from '../api/notifications'
import { fetchAccessMe, type AccessMe } from '../api/accessRequests'
import { AccountSheet } from '../components/AccountSheet'
import { BrandName } from '../components/BrandName'
import { HomeBottomAnimation } from '../components/HomeBottomAnimation'
import { PageSkeleton } from '../components/PageSkeleton'
import { useAuth } from '../hooks/useAuth'
import { ContentReveal } from '../components/ContentReveal'
import { useFocusRefresh } from '../hooks/useFocusRefresh'
import { useHeroParallax } from '../hooks/useHeroParallax'
import '../styles/auth.css'
import '../styles/learner.css'

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
  const [marqueeIndex, setMarqueeIndex] = useState(0)
  const heroDecorRef = useRef<HTMLImageElement>(null)
  useHeroParallax(heroDecorRef)

  const loadUnread = () => {
    void fetchUnreadCount()
      .then(({ unreadCount: count }) => setUnreadCount(count))
      .catch(() => setUnreadCount(0))
  }

  useEffect(() => {
    if (!user) return
    setAccessReady(false)
    void fetchAccessMe()
      .then(setAccessMe)
      .catch(() => setAccessMe(null))
      .finally(() => setAccessReady(true))
    loadUnread()
  }, [user])

  useFocusRefresh(Boolean(user), () => {
    void fetchAccessMe().then(setAccessMe).catch(() => setAccessMe(null))
    loadUnread()
  })

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMarqueeIndex((value) => (value % 5) + 1)
    }, 4200)
    return () => window.clearInterval(timer)
  }, [])

  const handleLogout = () => {
    clearSession()
    navigate('/intro', { replace: true })
  }

  if (loading || !user) {
    return (
      <div className="home-app" data-home-layout="fullbleed-v3">
        <div className="home-app-inner">
          <PageSkeleton variant="home" />
        </div>
      </div>
    )
  }

  const greeting = greetingWord()
  const codeLocked = accessMe ? !accessMe.access.code : false
  const conduiteLocked = accessMe
    ? !(accessMe.access.conduite_videos || accessMe.access.conduite_heures || accessMe.user.soldeHeures > 0)
    : false
  const needsPhone = !String(user.phone || '').trim()
  const activeSlide = marqueeIndex === 0 ? 1 : marqueeIndex

  return (
    <div className="home-app home-app--scroll" data-home-layout="route-claire">
      <ContentReveal
        loading={!accessReady}
        skeleton={
          <div className="home-app-inner">
            <PageSkeleton variant="home" />
          </div>
        }
      >
      <div className="home-app-inner">
        <header className="home-app-top">
          <div className="home-app-brand">
            <div className="home-app-logo-badge">
              <img src="/logo.png" alt="" width={22} height={22} />
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

        <section className="home-app-hero home-app-hero-row home-app-hero--enter">
          <div className="home-app-hero-copy">
            <p className="home-app-eyebrow">{greeting},</p>
            <h2 className="home-app-name">{user.firstName}</h2>
            <p className="home-app-subtitle">Code, conduite, ta route vers le permis.</p>
          </div>
          <div className="home-app-hero-decor mp-hero-parallax" aria-hidden="true">
            <img ref={heroDecorRef} src="/home/hero-permis.png" alt="" className="mp-hero-parallax-media" />
          </div>
        </section>

        {needsPhone ? (
          <button type="button" className="home-app-phone-strip" onClick={() => navigate('/profil')}>
            <span>Numéro manquant — ajoute ton téléphone</span>
            <strong>Compléter</strong>
            <ChevronRight size={16} />
          </button>
        ) : null}

        <p className="home-app-section-label">Sur la route avec Monpermis</p>
        <div className="home-image-marquee home-app-marquee home-app-marquee--fade" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((n) => (
            <img
              key={n}
              src={`/home/i${n}.jpg`}
              alt=""
              className={`home-image-marquee-fade${n === activeSlide ? ' is-active' : ''}`}
            />
          ))}
          <div className="home-app-marquee-caption">
            <p>Apprends, révise et réussis ton permis</p>
            <span className="home-app-marquee-bar" />
            <div className="home-app-marquee-dots">
              {[1, 2, 3, 4, 5].map((n) => (
                <i key={n} className={n === activeSlide ? 'is-active' : ''} />
              ))}
            </div>
          </div>
        </div>

        <p className="home-app-section-label">Choisis ton parcours</p>
        <div className="home-app-paths home-app-paths--rows">
          <button
            type="button"
            className={`home-app-path-row${codeLocked ? ' is-locked' : ''} is-code`}
            onClick={() => navigate('/code-de-la-route')}
          >
            <span className="home-app-path-thumb">
              <img src="/home/paths/code.jpg" alt="" />
              <span className="home-app-path-badge is-green">
                <BookOpen size={12} />
              </span>
            </span>
            <span className="home-app-path-copy">
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
            <span className="home-app-path-arrow is-green">
              <ChevronRight size={18} />
            </span>
          </button>

          <button
            type="button"
            className={`home-app-path-row${conduiteLocked ? ' is-locked' : ''} is-drive`}
            onClick={() => navigate('/conduite')}
          >
            <span className="home-app-path-thumb">
              <img src="/home/paths/conduite.jpg" alt="" />
              <span className="home-app-path-badge is-coral">
                <Video size={12} />
              </span>
            </span>
            <span className="home-app-path-copy">
              <strong>Conduite</strong>
              <small>
                {conduiteLocked ? (
                  <>
                    <Lock size={12} /> Accès requis
                  </>
                ) : (
                  'Leçons vidéo & réservations'
                )}
              </small>
            </span>
            <span className="home-app-path-arrow is-coral">
              <ChevronRight size={18} />
            </span>
          </button>
        </div>

        <div className="home-app-bottom-anim">
          <HomeBottomAnimation />
        </div>
      </div>

      <AccountSheet
        visible={profileOpen}
        user={user}
        greeting={greeting}
        onClose={() => setProfileOpen(false)}
        onLogout={handleLogout}
        onOpenAbonnement={() => {
          setProfileOpen(false)
          navigate('/abonnement')
        }}
        onOpenPayments={() => {
          setProfileOpen(false)
          navigate('/abonnement/historique')
        }}
        onOpenSupport={() => {
          setProfileOpen(false)
          window.open(
            supportWhatsAppUrl('Bonjour Monpermis, j’ai besoin d’aide.'),
            '_blank',
            'noopener,noreferrer',
          )
        }}
        onOpenProfile={() => {
          setProfileOpen(false)
          navigate('/profil')
        }}
      />
      </ContentReveal>
    </div>
  )
}
