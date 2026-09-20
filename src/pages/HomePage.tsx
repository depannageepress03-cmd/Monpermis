import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell, Flame, Play, Lock, ChevronRight,
  CalendarClock, BookOpen, Car, Target, Calendar,
  Home, BarChart3, User,
} from 'lucide-react'
import { supportWhatsAppUrl } from '../utils/support'
import { clearSession } from '../api/auth'
import { tracker } from '../utils/tracker'
import { fetchUnreadCount } from '../api/notifications'
import { fetchAccessMe, type AccessMe } from '../api/accessRequests'
import { AccountSheet } from '../components/AccountSheet'
import { PageSkeleton } from '../components/PageSkeleton'
import { useAuth } from '../hooks/useAuth'
import { ContentReveal } from '../components/ContentReveal'
import { useFocusRefresh } from '../hooks/useFocusRefresh'
import '../styles/accueil.css'

interface AccueilProps {
  firstName?: string
  streakDays?: number
  progressPercent?: number
  currentLesson?: { title: string; category: string; progress: number; total: number }
  codeStats?: { totalLessons: number; unlocked: boolean }
  conduiteStats?: { nextSession?: string; reservedCount: number }
  stats?: { lessonsDone: number; lessonsTotal: number; avgScore: number; examDate: string }
}

function greetingWord() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Bonjour'
  if (hour < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

export function HomePage({
  firstName = 'Jean-Eudes',
  streakDays = 5,
  progressPercent = 35,
  currentLesson = { title: 'Leçon 3 · Priorités et intersections', category: 'Code de la route', progress: 3, total: 5 },
  codeStats = { totalLessons: 40, unlocked: false },
  conduiteStats = { nextSession: 'Sam 21 sept · 14h00', reservedCount: 3 },
  stats = { lessonsDone: 12, lessonsTotal: 40, avgScore: 68, examDate: '15 nov' },
}: AccueilProps) {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [profileOpen, setProfileOpen] = useState(false)
  const [accessMe, setAccessMe] = useState<AccessMe | null>(null)
  const [accessReady, setAccessReady] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

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

  const handleLogout = () => {
    clearSession()
    tracker.reset()
    navigate('/intro', { replace: true })
  }

  if (loading || !user) {
    return (
      <div className="accueil">
        <PageSkeleton variant="home" />
      </div>
    )
  }

  const greeting = greetingWord()
  // Données réelles branchées sur les props de la maquette (fallback = valeurs maquette).
  const displayName = user.firstName?.trim() || firstName
  const initials = `${user.firstName?.trim()?.[0] ?? ''}${user.lastName?.trim()?.[0] ?? ''}`.toUpperCase() || 'JE'
  const hasUnread = unreadCount > 0
  const codeUnlocked = accessMe ? accessMe.access.code : codeStats.unlocked
  const effectiveCodeStats = { ...codeStats, unlocked: codeUnlocked }
  const codeLocked = !codeUnlocked
  const conduiteLocked = accessMe
    ? !(accessMe.access.conduite_videos || accessMe.access.conduite_heures || accessMe.user.soldeHeures > 0)
    : false
  void codeLocked
  void conduiteLocked

  const circumference = 2 * Math.PI * 22
  const dashOffset = circumference - (progressPercent / 100) * circumference
  const lessonPct = Math.round((currentLesson.progress / currentLesson.total) * 100)

  return (
    <div className="accueil">
      <ContentReveal
        loading={!accessReady}
        skeleton={<PageSkeleton variant="home" />}
      >
      <header className="accueil-header">
        <div className="accueil-logo">
          <span className="accueil-logo-mark">M</span>
          <span className="accueil-logo-word">Monpermis<span className="accueil-logo-accent">.bj</span></span>
        </div>
        <div className="accueil-header-actions">
          <button
            type="button"
            className="accueil-icon-btn"
            aria-label="Notifications"
            onClick={() => navigate('/notifications')}
          >
            <Bell size={17} />
            {hasUnread ? <span className="accueil-dot" /> : null}
          </button>
          <button
            type="button"
            className="accueil-avatar"
            aria-label="Voir mon profil"
            onClick={() => setProfileOpen(true)}
            style={{ border: 'none', cursor: 'pointer' }}
          >
            {initials}
          </button>
        </div>
      </header>

      <section className="accueil-greeting">
        <p className="accueil-greeting-label">{greeting},</p>
        <div className="accueil-greeting-row">
          <div>
            <h1 className="accueil-greeting-name">{displayName}</h1>
            <div className="accueil-streak">
              <Flame size={13} />
              <span>{streakDays} jours de suite</span>
            </div>
          </div>
          <div className="accueil-progress-ring">
            <svg width="54" height="54" viewBox="0 0 54 54">
              <circle cx="27" cy="27" r="22" className="accueil-ring-track" />
              <circle
                cx="27" cy="27" r="22"
                className="accueil-ring-value"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 27 27)"
              />
            </svg>
            <span className="accueil-ring-label">{progressPercent}%</span>
          </div>
        </div>
      </section>

      <section className="accueil-hero">
        <Car className="accueil-hero-bg-icon" size={100} aria-hidden="true" />
        <p className="accueil-hero-eyebrow">Reprendre où tu t'es arrêté</p>
        <p className="accueil-hero-title">{currentLesson.title}</p>
        <p className="accueil-hero-subtitle">{currentLesson.category}</p>
        <div className="accueil-hero-progress">
          <div className="accueil-hero-bar">
            <div className="accueil-hero-bar-fill" style={{ width: `${lessonPct}%` }} />
          </div>
          <span>{currentLesson.progress}/{currentLesson.total}</span>
        </div>
        <button type="button" className="accueil-cta" onClick={() => navigate('/code-de-la-route')}>
          <Play size={14} />
          Continuer
        </button>
      </section>

      <p className="accueil-section-title">Choisis ton parcours</p>

      <div className="accueil-card">
        <div className="accueil-card-row">
          <div className="accueil-card-icon accueil-card-icon--green">
            <BookOpen size={20} />
          </div>
          <div className="accueil-card-text">
            <p className="accueil-card-title">Code de la route</p>
            <p className="accueil-card-subtitle">{effectiveCodeStats.totalLessons} leçons · quiz inclus</p>
          </div>
        </div>
        {!effectiveCodeStats.unlocked && (
          <button type="button" className="accueil-unlock-btn" onClick={() => navigate('/abonnement')}>
            <Lock size={13} />
            Débloquer l'accès
          </button>
        )}
      </div>

      <div className="accueil-card">
        <div className="accueil-card-row">
          <div className="accueil-card-icon accueil-card-icon--orange">
            <Car size={20} />
          </div>
          <div className="accueil-card-text">
            <p className="accueil-card-title">Conduite</p>
            <p className="accueil-card-subtitle">Leçons vidéo et réservations</p>
          </div>
          <button
            type="button"
            className="accueil-chevron-btn accueil-chevron-btn--orange"
            aria-label="Voir Conduite"
            onClick={() => navigate('/conduite')}
          >
            <ChevronRight size={16} />
          </button>
        </div>
        {conduiteStats.nextSession && (
          <div className="accueil-card-footer">
            <span className="accueil-card-footer-date">
              <CalendarClock size={13} />
              {conduiteStats.nextSession}
            </span>
            <span className="accueil-badge">{conduiteStats.reservedCount} réservées</span>
          </div>
        )}
      </div>

      <div className="accueil-stats">
        <div className="accueil-stat">
          <BookOpen size={14} />
          <p className="accueil-stat-label">Leçons</p>
          <p className="accueil-stat-value">{stats.lessonsDone}/{stats.lessonsTotal}</p>
        </div>
        <div className="accueil-stat">
          <Target size={14} />
          <p className="accueil-stat-label">Score moyen</p>
          <p className="accueil-stat-value">{stats.avgScore}%</p>
        </div>
        <div className="accueil-stat">
          <Calendar size={14} />
          <p className="accueil-stat-label">Examen</p>
          <p className="accueil-stat-value">{stats.examDate}</p>
        </div>
      </div>

      <nav className="accueil-nav">
        <button type="button" className="accueil-nav-item accueil-nav-item--active" aria-current="page">
          <Home size={18} />
          <span>Accueil</span>
        </button>
        <button type="button" className="accueil-nav-item" onClick={() => navigate('/code-de-la-route')}>
          <BookOpen size={18} />
          <span>Code</span>
        </button>
        <button type="button" className="accueil-nav-item" onClick={() => navigate('/conduite')}>
          <Car size={18} />
          <span>Conduite</span>
        </button>
        <button type="button" className="accueil-nav-item" onClick={() => navigate('/code-de-la-route/mes-notes')}>
          <BarChart3 size={18} />
          <span>Progrès</span>
        </button>
        <button type="button" className="accueil-nav-item" onClick={() => navigate('/profil')}>
          <User size={18} />
          <span>Profil</span>
        </button>
      </nav>

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

export default HomePage
