import {
  CalendarClock,
  CalendarDays,
  ClipboardList,
  LogOut,
  Menu,
  UserRound,
  Wallet,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import logoUrl from '../assets/logo.png'
import { useMoniteurAuth } from '../context/MoniteurAuthContext'
import { SITE_NAME } from '../theme/brand'

const navItems = [
  { to: '/', label: 'Tableau de bord', end: true, icon: ClipboardList },
  { to: '/disponibilites', label: 'Disponibilités', icon: CalendarDays },
  { to: '/reservations', label: 'Réservations', icon: CalendarClock },
  { to: '/historique', label: 'Historique', icon: ClipboardList },
  { to: '/revenus', label: 'Revenus', icon: Wallet },
  { to: '/profil', label: 'Profil', icon: UserRound },
]

export function MoniteurLayout() {
  const { moniteur, signOut } = useMoniteurAuth()
  const [open, setOpen] = useState(false)

  return (
    <div className={`admin-shell ${open ? 'nav-open' : ''}`}>
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <img src={logoUrl} alt="" />
          <div>
            <strong>{SITE_NAME}</strong>
            <span>Portail moniteur</span>
          </div>
          <button type="button" className="admin-nav-close" onClick={() => setOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <nav className="admin-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? 'active' : undefined)}
              onClick={() => setOpen(false)}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <p className="admin-muted">{moniteur?.fullName}</p>
          <button type="button" className="btn-outline" onClick={signOut}>
            <LogOut size={16} />
            Déconnexion
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <button type="button" className="btn-icon" onClick={() => setOpen(true)}>
            <Menu size={18} />
          </button>
          <div>
            <strong>{moniteur?.fullName || 'Moniteur'}</strong>
            <span className="admin-muted">{moniteur?.email}</span>
          </div>
        </header>
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
