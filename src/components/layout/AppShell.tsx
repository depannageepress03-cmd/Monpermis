import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Home, BookOpen, Car, BarChart3, Tag } from 'lucide-react';
import './app-shell.css';

export type AppTab = 'accueil' | 'code' | 'conduite' | 'progres' | 'profil';

/** Initiales d'avatar depuis l'utilisateur connecté (fallback 'JE'). */
export function userInitialsOf(firstName?: string | null, lastName?: string | null, fallback = 'JE') {
  const initials = `${firstName?.trim()?.[0] ?? ''}${lastName?.trim()?.[0] ?? ''}`.toUpperCase()
  return initials || fallback
}

/** Onglets de la TabBar flottante (ordre des maquettes : Accueil · Code · Conduite · Progrès · Offres). */
export const TAB_ROUTES: Record<AppTab, string> = {
  accueil: '/accueil',
  code: '/code-de-la-route',
  conduite: '/conduite',
  progres: '/code-de-la-route/mes-notes',
  profil: '/abonnement',
};

const TABS: { key: AppTab; label: string; icon: typeof Home }[] = [
  { key: 'accueil', label: 'Accueil', icon: Home },
  { key: 'code', label: 'Code', icon: BookOpen },
  { key: 'conduite', label: 'Conduite', icon: Car },
  { key: 'progres', label: 'Progrès', icon: BarChart3 },
  { key: 'profil', label: 'Offres', icon: Tag },
];

export function AppShell({ activeTab, children, userInitials = 'JE', hasUnread = true, onNavigate, onOpenNotifications, onOpenProfile }: {
  activeTab: AppTab; children: ReactNode; userInitials?: string; hasUnread?: boolean; onNavigate?: (tab: AppTab) => void; onOpenNotifications?: () => void; onOpenProfile?: () => void;
}) {
  const navigate = useNavigate();
  // Navigation par défaut (react-router) : les pages qui n'injectent pas
  // onNavigate gardent des onglets fonctionnels.
  const handleNavigate = onNavigate ?? ((tab: AppTab) => navigate(TAB_ROUTES[tab]));
  return (
    <div className="mp-shell">
      <header className="mp-header">
        <div className="mp-logo">
          <span className="mp-logo-mark" aria-hidden="true" />
          <span className="mp-logo-word">Monpermis<span className="mp-logo-accent">.bj</span></span>
        </div>
        <div className="mp-header-actions">
          <button type="button" className="mp-icon-btn" aria-label="Notifications" onClick={onOpenNotifications}>
            <Bell size={19} />{hasUnread ? <span className="mp-dot" /> : null}
          </button>
          {onOpenProfile ? (
            <button type="button" className="mp-avatar mp-avatar--btn" aria-label="Voir mon profil" onClick={onOpenProfile}>{userInitials}</button>
          ) : (
            <div className="mp-avatar">{userInitials}</div>
          )}
        </div>
        {/* Nav unique : tabbar flottante en bas sur mobile/tablette (CSS), sidebar verticale sur ordinateur (CSS). */}
        <nav className="mp-nav" aria-label="Navigation principale">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} type="button" className={`mp-nav-item ${activeTab === key ? 'mp-nav-item--active' : ''}`} aria-current={activeTab === key ? 'page' : undefined} onClick={() => handleNavigate(key)}>
              <Icon size={18} /><span>{label}</span>
            </button>
          ))}
        </nav>
      </header>
      <main className="mp-content">{children}</main>
    </div>
  );
}
