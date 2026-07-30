import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  CalendarCheck,
  CheckCheck,
  CreditCard,
  Megaphone,
  TriangleAlert,
} from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from '../api/notifications'
import { EmptyState } from '../components/EmptyState'
import { PageLoader } from '../components/PageLoader'
import { PageNavbar } from '../components/PageNavbar'
import { PageSkeleton } from '../components/PageSkeleton'
import { useAuth } from '../hooks/useAuth'
import '../styles/auth.css'
import '../styles/learner.css'

type IconComp = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>

const iconFor: Record<string, IconComp> = {
  subscription_activated: CreditCard,
  subscription_pending: CreditCard,
  subscription_expiring: TriangleAlert,
  payment_validated: CreditCard,
  reservation_confirmed: CalendarCheck,
  reservation_cancelled: TriangleAlert,
  announcement: Megaphone,
  general: Bell,
}

const linkToPath: Record<string, string> = {
  abonnement: '/abonnement',
  conduite: '/conduite',
  profil: '/profil',
  notifications: '/notifications',
  actualites: '/actualites',
}

function resolveNotificationPath(link: string): string | null {
  if (!link) return null
  if (linkToPath[link]) return linkToPath[link]
  if (link.startsWith('actualites/')) {
    const id = link.slice('actualites/'.length)
    return id ? `/actualites/${id}` : '/actualites'
  }
  if (link.startsWith('/')) return link
  return null
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "à l'instant"
  if (mins < 60) return `il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `il y a ${days} j`
  return new Date(iso).toLocaleDateString('fr-FR')
}

export function NotificationsPage() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [items, setItems] = useState<AppNotification[]>([])
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setFetching(true)
    setError(null)
    try {
      const { notifications } = await fetchNotifications()
      setItems(notifications)
    } catch {
      setError('Impossible de charger les notifications.')
      setItems([])
    } finally {
      setFetching(false)
    }
  }, [])

  useEffect(() => {
    if (!user) return
    void load()
  }, [user, load])

  const handleTap = async (notification: AppNotification) => {
    if (!notification.read) {
      setItems((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
      )
      void markNotificationRead(notification.id).catch(() => undefined)
    }
    const path = resolveNotificationPath(notification.link)
    if (path && path !== '/notifications') navigate(path)
  }

  const handleMarkAll = () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })))
    void markAllNotificationsRead().catch(() => undefined)
  }

  if (loading || !user) return <PageLoader />

  const hasUnread = items.some((n) => !n.read)

  return (
    <div className="auth-page">
      <div className="auth-container learner-container">
        <PageNavbar
          title="Notifications"
          icon={<Bell size={20} />}
          onBack={() => navigate('/accueil')}
        />

        {hasUnread ? (
          <button type="button" className="btn-outline home-mark-all" onClick={handleMarkAll}>
            <CheckCheck size={16} />
            Tout marquer comme lu
          </button>
        ) : null}

        {fetching ? (
          <PageSkeleton variant="list" />
        ) : error ? (
          <EmptyState
            tone="error"
            icon={<TriangleAlert size={28} />}
            title="Chargement impossible"
            message={error}
            action={
              <button type="button" className="btn-primary" onClick={() => void load()}>
                Réessayer
              </button>
            }
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Bell size={28} />}
            title="Aucune notification"
            message="Tu seras prévenu ici dès qu’un paiement est validé, une leçon confirmée ou une annonce publiée."
          />
        ) : (
          <div className="home-notif-list">
            {items.map((n) => {
              const Icon = iconFor[n.type] ?? Bell
              return (
                <button
                  key={n.id}
                  type="button"
                  className={`home-notif-card${n.read ? '' : ' is-unread'}`}
                  onClick={() => void handleTap(n)}
                >
                  <span className="home-notif-icon">
                    <Icon size={18} />
                  </span>
                  <span className="home-notif-body">
                    <strong>{n.title}</strong>
                    {n.body ? <small>{n.body}</small> : null}
                    <em>{timeAgo(n.createdAt)}</em>
                  </span>
                  {!n.read ? <span className="home-notif-dot" /> : null}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
