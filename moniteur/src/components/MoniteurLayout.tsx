import {
  Bell,
  CalendarClock,
  CalendarDays,
  History,
  LayoutDashboard,
  LogOut,
  Menu,
  UserRound,
  Wallet,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import logoUrl from '../assets/logo.png'
import { fetchDashboard } from '../api/portal'
import { getMoniteurToken, useMoniteurAuth } from '../context/MoniteurAuthContext'
import { SITE_NAME } from '../theme/brand'

type NavItem = {
  to: string
  label: string
  end?: boolean
  icon: typeof LayoutDashboard
  badge?: 'pending'
}

type NavGroup = { id: string; label: string; items: NavItem[] }

const navGroups: NavGroup[] = [
  {
    id: 'activity',
    label: 'Activité',
    items: [
      { to: '/', label: 'Tableau de bord', end: true, icon: LayoutDashboard },
      { to: '/reservations', label: 'Réservations', icon: CalendarClock, badge: 'pending' },
      { to: '/disponibilites', label: 'Disponibilités', icon: CalendarDays },
      { to: '/historique', label: 'Historique', icon: History },
    ],
  },
  {
    id: 'account',
    label: 'Compte',
    items: [
      { to: '/revenus', label: 'Revenus', icon: Wallet },
      { to: '/profil', label: 'Profil public', icon: UserRound },
    ],
  },
]

function initialsOf(fullName?: string) {
  if (!fullName?.trim()) return 'MO'
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return parts[0].slice(0, 2).toUpperCase()
}

function formatBadge(count: number) {
  if (count <= 0) return undefined
  return count > 99 ? '99+' : String(count)
}

/** Coque du portail moniteur — même modèle visuel que l'espace administrateur. */
export function MoniteurLayout() {
  const { moniteur, signOut } = useMoniteurAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [pending, setPending] = useState(0)
  const [width, setWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1440))

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Pastille « à confirmer » rafraîchie à chaque changement de page.
  useEffect(() => {
    const token = getMoniteurToken()
    if (!token) return
    let cancelled = false
    fetchDashboard(token)
      .then((data) => {
        if (!cancelled) setPending(data.stats?.pending ?? 0)
      })
      .catch(() => {
        if (!cancelled) setPending(0)
      })
    return () => {
      cancelled = true
    }
  }, [location.pathname])

  useEffect(() => {
    if (!userMenuOpen) return
    const close = () => setUserMenuOpen(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [userMenuOpen])

  const isMobile = width < 981
  const closeMobile = () => setMobileOpen(false)
  const initials = initialsOf(moniteur?.fullName)
  const dateLong = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className={`cx-root cx-app-shell cx-shell2${mobileOpen ? ' cx-nav-open' : ''}`}>
      <aside className="cx-sidebar" aria-label="Navigation" inert={isMobile && !mobileOpen ? true : undefined}>
        <div className="cx-sb-brand">
          <img src={logoUrl} alt={SITE_NAME} width={52} height={52} />
          <span>
            <strong>MONPERMIS</strong>
            <small>Moniteur</small>
          </span>
        </div>

        <nav className="cx-side-nav">
          {navGroups.map((group, n) => (
            <div key={group.id} style={{ display: 'contents' }}>
              {n ? <div className="cx-side-nav-divider" /> : null}
              <p className="cx-side-nav-group">{group.label}</p>
              {group.items.map((item) => {
                const Icon = item.icon
                const badgeLabel = item.badge === 'pending' ? formatBadge(pending) : undefined
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={closeMobile}
                    title={item.label}
                    className={({ isActive }) => `cx-side-nav-link${isActive ? ' cx-is-active' : ''}`}
                  >
                    <Icon className="cx-side-nav-ico" />
                    <span>{item.label}</span>
                    {badgeLabel ? (
                      <span className="cx-nav-badge" aria-label={`${pending} à confirmer`}>
                        {badgeLabel}
                      </span>
                    ) : null}
                  </NavLink>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="cx-sidebar-footer">
          <div className="cx-user-chip">
            <span className="cx-user-avatar" aria-hidden="true">
              {initials}
            </span>
            <span className="cx-user-meta">
              <span className="cx-user-name">{moniteur?.fullName || 'Moniteur'}</span>
              <span className="cx-user-role">Moniteur{moniteur?.phone ? ` · ${moniteur.phone}` : ''}</span>
            </span>
            <button type="button" className="cx-btn-logout" onClick={signOut}>
              Se déconnecter
            </button>
          </div>
        </div>
      </aside>
      <button type="button" className="cx-sidebar-backdrop" aria-label="Fermer le menu" onClick={closeMobile} />

      <div className="cx-main cx-main2">
        <div className="cx-topbar2">
          <Link to="/reservations" className={`cx-tb2-queue${pending > 0 ? ' cx-has' : ''}`}>
            <CalendarClock aria-hidden />
            {pending > 0
              ? `${pending} demande${pending > 1 ? 's' : ''} à confirmer`
              : 'Aucune demande en attente'}
          </Link>
          <button
            type="button"
            className="cx-tb2-bell"
            onClick={() => navigate('/reservations')}
            aria-label={pending > 0 ? `${pending} demandes à confirmer` : 'Aucune demande en attente'}
            title={pending > 0 ? `${pending} demande(s) à confirmer` : 'Réservations'}
          >
            <Bell aria-hidden />
            {pending > 0 ? <i className="cx-bell-dot" /> : null}
          </button>
          <span className="cx-tb2-date">
            <CalendarDays aria-hidden />
            <span>{dateLong}</span>
          </span>
          <button
            type="button"
            className="cx-tb2-user"
            aria-haspopup="true"
            aria-expanded={userMenuOpen}
            onClick={(e) => {
              e.stopPropagation()
              setUserMenuOpen((open) => !open)
            }}
          >
            <span className="cx-user-avatar" aria-hidden="true">
              {initials}
            </span>
            <span className="cx-tb2-meta">
              <strong>{moniteur?.fullName || 'Moniteur'}</strong>
              <small>Moniteur</small>
            </span>
            <i className="cx-tb2-chev" />
          </button>
          {userMenuOpen ? (
            <div className="cx-pop cx-pop-user" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen(false)
                  navigate('/profil')
                }}
              >
                <UserRound aria-hidden />
                Mon profil
              </button>
              <button type="button" onClick={signOut}>
                <LogOut aria-hidden />
                Se déconnecter
              </button>
            </div>
          ) : null}
        </div>

        <div className="cx-mobile-bar">
          <button type="button" className="cx-nav-toggle" onClick={() => setMobileOpen(true)} aria-label="Ouvrir le menu">
            <Menu aria-hidden />
          </button>
          <span className="cx-mobile-bar-brand">
            <img src={logoUrl} alt="" />
            MONPERMIS
          </span>
          <span className="cx-user-avatar">{initials}</span>
        </div>

        <div className="cx-content">
          <div className="cx-view">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  )
}
