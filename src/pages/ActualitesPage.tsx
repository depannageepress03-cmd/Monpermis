import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Megaphone } from 'lucide-react'
import { fetchAnnouncements, type Announcement } from '../api/announcements'
import { AnnouncementCard } from '../components/AnnouncementCard'
import { ContentReveal } from '../components/ContentReveal'
import { Reveal } from '../components/Reveal'
import { EmptyState } from '../components/EmptyState'
import { PageNavbar } from '../components/PageNavbar'
import { PageLoader } from '../components/PageLoader'
import { PageSkeleton } from '../components/PageSkeleton'
import { useAuth } from '../hooks/useAuth'
import { AppShell, userInitialsOf, type AppTab } from '../components/layout/AppShell'
import { SectionTitle } from '../components/ui'
import '../styles/auth.css'
import '../styles/learner.css'

const TAB_ROUTES: Record<AppTab, string> = {
  accueil: '/accueil',
  code: '/code-de-la-route',
  conduite: '/conduite',
  progres: '/code-de-la-route/mes-notes',
  profil: '/profil',
}

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
            title="Actualités"
            icon={<Megaphone size={20} />}
            onBack={() => navigate('/accueil')}
          />

          <ContentReveal loading={fetching} skeleton={<PageSkeleton variant="list" />}>
          {items.length === 0 ? (
            <EmptyState
              icon={<Megaphone size={28} />}
              title="Aucune actualité"
              message="Les annonces de Monpermis apparaîtront ici dès qu’elles seront publiées."
            />
          ) : (
            <>
              <SectionTitle>Fil d’annonces</SectionTitle>
              <div className="home-app-news-list home-news-feed">
                {items.map((item, index) => (
                  <Reveal key={item.id} delay={index * 60} variant="up">
                  <AnnouncementCard
                    item={item}
                    compact
                    staggerIndex={index}
                    onOpen={() => navigate(`/actualites/${item.id}`)}
                  />
                  </Reveal>
                ))}
              </div>
            </>
          )}
          </ContentReveal>
        </div>
      </div>
    </AppShell>
  )
}
