import { useNavigate } from 'react-router-dom';
import { BarChart3, Home, LifeBuoy, Tag, TriangleAlert } from 'lucide-react';
import { TabBar } from './ui/TabBar';

export type MainTabId = 'accueil' | 'code' | 'conduite' | 'progres' | 'offres';

const ROUTES: Record<MainTabId, string> = {
  accueil: '/accueil',
  code: '/code-de-la-route',
  conduite: '/conduite',
  progres: '/profil',
  offres: '/abonnement',
};

const ICON_SIZE = 22;
const ICON_STROKE = 1.9;

/**
 * Barre d'onglets flottante des maquettes (TabBar.html).
 * Ordre : Accueil · Code · Conduite · Progrès · Offres.
 * La navigation reste SPA (pas de rechargement) via react-router.
 */
export function MainTabBar({ activeId }: { activeId: MainTabId }) {
  const navigate = useNavigate();
  return (
    <nav
      aria-label="Navigation principale"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div style={{ width: '100%', maxWidth: 390, pointerEvents: 'auto' }}>
        <TabBar
          items={[
            { id: 'accueil', icon: <Home size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Accueil' },
            { id: 'code', icon: <TriangleAlert size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Code' },
            { id: 'conduite', icon: <LifeBuoy size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Conduite' },
            { id: 'progres', icon: <BarChart3 size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Progrès' },
            { id: 'offres', icon: <Tag size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: 'Offres' },
          ]}
          activeId={activeId}
          onChange={(id) => navigate(ROUTES[id as MainTabId])}
          style={{ margin: 0, maxWidth: '100%' }}
        />
      </div>
    </nav>
  );
}
