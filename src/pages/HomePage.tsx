import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Flame, Play, Lock, ChevronRight,
  CalendarClock, BookOpen, Car, Target, Calendar,
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
import { AppShell, type AppTab } from '../components/layout/AppShell'
import {
  Badge,
  Button,
  Card,
  IconBadge,
  ProgressBar,
  ProgressRing,
  SectionTitle,
  StatCard,
} from '../components/ui'
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

const TAB_ROUTES: Record<AppTab, string> = {
  accueil: '/accueil',
  code: '/code-de-la-route',
  conduite: '/conduite',
  progres: '/code-de-la-route/mes-notes',
  profil: '/profil',
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
      <div className="mp-shell">
        <main className="mp-content">
          <PageSkeleton variant="home" />
        </main>
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

  const lessonPct = Math.round((currentLesson.progress / currentLesson.total) * 100)

  return (
    <AppShell
      activeTab="accueil"
      userInitials={initials}
      hasUnread={hasUnread}
      onNavigate={(tab) => navigate(TAB_ROUTES[tab])}
      onOpenNotifications={() => navigate('/notifications')}
      onOpenProfile={() => setProfileOpen(true)}
    >
      <ContentReveal
        loading={!accessReady}
        skeleton={<PageSkeleton variant="home" />}
      >
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
          <ProgressRing percent={progressPercent} />
        </div>
      </section>

      <section className="accueil-hero">
        <Car className="accueil-hero-bg-icon" size={100} aria-hidden="true" />
        <p className="accueil-hero-eyebrow">Reprendre où tu t'es arrêté</p>
        <p className="accueil-hero-title">{currentLesson.title}</p>
        <p className="accueil-hero-subtitle">{currentLesson.category}</p>
        <div className="accueil-hero-progress">
          <div style={{ flex: 1 }}>
            <ProgressBar percent={lessonPct} dark />
          </div>
          <span>{currentLesson.progress}/{currentLesson.total}</span>
        </div>
        <Button variant="cta" tone="green" icon={<Play size={14} />} onClick={() => navigate('/code-de-la-route')} style={{ marginTop: 16 }}>
          Continuer
        </Button>
      </section>

      <SectionTitle>Choisis ton parcours</SectionTitle>

      <Card>
        <div className="accueil-card-row">
          <IconBadge icon={<BookOpen size={20} />} tone="green" />
          <div className="accueil-card-text">
            <p className="accueil-card-title">Code de la route</p>
            <p className="accueil-card-subtitle">{effectiveCodeStats.totalLessons} leçons · quiz inclus</p>
          </div>
        </div>
        {!effectiveCodeStats.unlocked && (
          <Button variant="outline" icon={<Lock size={13} />} onClick={() => navigate('/abonnement')}>
            Débloquer l'accès
          </Button>
        )}
      </Card>

      <Card>
        <div className="accueil-card-row">
          <IconBadge icon={<Car size={20} />} tone="orange" />
          <div className="accueil-card-text">
            <p className="accueil-card-title">Conduite</p>
            <p className="accueil-card-subtitle">Leçons vidéo et réservations</p>
          </div>
          <Button variant="icon" tone="orange" aria-label="Voir Conduite" onClick={() => navigate('/conduite')}>
            <ChevronRight size={16} />
          </Button>
        </div>
        {conduiteStats.nextSession && (
          <div className="accueil-card-footer">
            <span className="accueil-card-footer-date">
              <CalendarClock size={13} />
              {conduiteStats.nextSession}
            </span>
            <Badge tone="orange">{conduiteStats.reservedCount} réservées</Badge>
          </div>
        )}
      </Card>

      <div className="accueil-stats">
        <StatCard icon={<BookOpen size={14} />} label="Leçons" value={`${stats.lessonsDone}/${stats.lessonsTotal}`} />
        <StatCard icon={<Target size={14} />} label="Score moyen" value={`${stats.avgScore}%`} />
        <StatCard icon={<Calendar size={14} />} label="Examen" value={stats.examDate} />
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
    </AppShell>
  )
}

export default HomePage
