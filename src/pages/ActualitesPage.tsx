import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Megaphone } from 'lucide-react'
import { fetchAnnouncements, type Announcement } from '../api/announcements'
import { AnnouncementCard } from '../components/AnnouncementCard'
import { EmptyState } from '../components/EmptyState'
import { PageNavbar } from '../components/PageNavbar'
import { PageLoader } from '../components/PageLoader'
import { PageSkeleton } from '../components/PageSkeleton'
import { useAuth } from '../hooks/useAuth'
import '../styles/auth.css'
import '../styles/learner.css'

export function ActualitesPage() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [items, setItems] = useState<Announcement[]>([])
  const [fetching, setFetching] = useState(true)

  const load = useCallback(async () => {
    try {
      const list = await fetchAnnouncements(50)
      setItems(list)
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

  if (loading || !user) return <PageLoader />

  return (
    <div className="auth-page">
      <div className="auth-container learner-container">
        <PageNavbar
          title="Actualités"
          icon={<Megaphone size={20} />}
          onBack={() => navigate('/accueil')}
        />

        {fetching ? (
          <PageSkeleton variant="list" />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Megaphone size={28} />}
            title="Aucune actualité"
            message="Les annonces de Monpermis apparaîtront ici dès qu’elles seront publiées."
          />
        ) : (
          <div className="home-app-news-list home-news-feed">
            {items.map((item) => (
              <AnnouncementCard
                key={item.id}
                item={item}
                compact
                onOpen={() => navigate(`/actualites/${item.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
