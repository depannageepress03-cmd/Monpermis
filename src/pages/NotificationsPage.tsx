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
import { PageNavbar } from '../components/PageNavbar'
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

  const load = useCallback(async () => {
    try {
      const { notifications } = await fetchNotifications()
      setItems(notifications)
    } catch {
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
    const path = linkToPath[notification.link]
    if (path && path !== '/notifications') navigate(path)
  }

  const handleMarkAll = () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })))
    void markAllNotificationsRead().catch(() => undefined)
  }

  if (loading || !user) return null

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
          <p className="home-news-empty">Chargement…</p>
        ) : items.length === 0 ? (
          <div className="auth-card learner-card home-news-empty-card">
            <Bell size={28} />
            <strong>Aucune notification</strong>
            <p>
              Tu seras prévenu ici dès qu’un paiement est validé, une leçon confirmée ou une annonce
              publiée.
            </p>
          </div>
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
