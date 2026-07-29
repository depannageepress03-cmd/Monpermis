import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Megaphone } from 'lucide-react'
import { fetchAnnouncements, type Announcement } from '../api/announcements'
import { AnnouncementCard } from '../components/AnnouncementCard'
import { PageNavbar } from '../components/PageNavbar'
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

  if (loading || !user) return null

  return (
    <div className="auth-page">
      <div className="auth-container learner-container">
        <PageNavbar
          title="Actualités"
          icon={<Megaphone size={20} />}
          onBack={() => navigate('/accueil')}
        />

        {fetching ? (
          <p className="home-news-empty">Chargement…</p>
        ) : items.length === 0 ? (
          <div className="auth-card learner-card home-news-empty-card">
            <Megaphone size={28} />
            <strong>Aucune actualité</strong>
            <p>Les annonces de Monpermis apparaîtront ici dès qu’elles seront publiées.</p>
          </div>
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
