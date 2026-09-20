import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ExternalLink, Megaphone } from 'lucide-react'
import {
  announcementLooksLikeHtml,
  fetchAnnouncement,
  type Announcement,
} from '../api/announcements'
import { EmptyState } from '../components/EmptyState'
import { PageNavbar } from '../components/PageNavbar'
import { PageLoader } from '../components/PageLoader'
import { PageSkeleton } from '../components/PageSkeleton'
import { useAuth } from '../hooks/useAuth'
import { resolveMediaUrl } from '../utils/mediaUrl'
import { AppShell, userInitialsOf, type AppTab } from '../components/layout/AppShell'
import { Badge, Card, IconBadge } from '../components/ui'
import '../styles/auth.css'
import '../styles/learner.css'

const TAB_ROUTES: Record<AppTab, string> = {
  accueil: '/accueil',
  code: '/code-de-la-route',
  conduite: '/conduite',
  progres: '/code-de-la-route/mes-notes',
  profil: '/profil',
}

export function ActualiteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [item, setItem] = useState<Announcement | null>(null)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (!user || !id) return
    setFetching(true)
    void fetchAnnouncement(id)
      .then(setItem)
      .finally(() => setFetching(false))
  }, [user, id])

  if (loading || !user) return <PageLoader />

  const isHtml = item ? announcementLooksLikeHtml(item.body) : false
  const image = item ? resolveMediaUrl(item.imageUrl) : ''

  return (
    <AppShell
      activeTab="profil"
      userInitials={userInitialsOf(user?.firstName, user?.lastName)}
      onNavigate={(tab) => navigate(TAB_ROUTES[tab])}
      onOpenNotifications={() => navigate('/notifications')}
      onOpenProfile={() => navigate('/profil')}
    >
      <div className="auth-page">
        <div className="auth-container learner-container">
          <PageNavbar
            title="Actualité"
            icon={<Megaphone size={20} />}
            onBack={() => navigate('/actualites')}
          />

          {fetching ? (
            <PageSkeleton variant="detail" />
          ) : !item ? (
            <EmptyState
              icon={<Megaphone size={28} />}
              title="Annonce introuvable"
              message="Elle a peut-être été retirée ou n’est plus disponible pour ton compte."
            />
          ) : (
            <Card>
              <article className={`home-news-detail home-news-card--${item.kind}`}>
                <span className="home-news-kind-row">
                  <IconBadge
                    icon={<Megaphone size={18} />}
                    tone={item.kind === 'alerte' ? 'orange' : 'green'}
                  />
                  <Badge tone={item.kind === 'info' ? 'green' : 'orange'}>
                    {item.kind === 'promo' ? 'Promo' : item.kind === 'alerte' ? 'Alerte' : 'Info'}
                  </Badge>
                </span>
                <h2>{item.title}</h2>
                <p className="home-news-date">
                  {new Date(item.createdAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
                {image ? <img src={image} alt="" className="home-news-detail-image" /> : null}
                {item.body ? (
                  isHtml ? (
                    <div
                      className="home-news-rich"
                      dangerouslySetInnerHTML={{ __html: item.body }}
                    />
                  ) : (
                    <p className="home-news-detail-body">{item.body}</p>
                  )
                ) : null}
                {item.ctaUrl ? (
                  <a
                    className="btn-primary home-news-cta-btn"
                    href={item.ctaUrl}
                    target={item.ctaUrl.startsWith('/') ? undefined : '_blank'}
                    rel={item.ctaUrl.startsWith('/') ? undefined : 'noopener noreferrer'}
                    onClick={(e) => {
                      if (item.ctaUrl?.startsWith('/')) {
                        e.preventDefault()
                        navigate(item.ctaUrl)
                      }
                    }}
                  >
                    En savoir plus
                    <ExternalLink size={16} />
                  </a>
                ) : null}
              </article>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  )
}
