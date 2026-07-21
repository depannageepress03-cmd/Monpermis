import {
  Bell,
  BookOpen,
  CreditCard,
  CalendarDays,
  Car,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Plus,
  Search,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import logoUrl from '../assets/logo.png'
import { fetchDashboardSummary } from '../api/dashboard'
import { useAdminAuth } from '../context/AdminAuthContext'
import { SITE_NAME } from '../theme/brand'
import { BrandName } from './BrandName'

const ADMIN_TOKEN_KEY = 'monpermis_admin_token'

type NavItem = {
  to: string
  label: string
  end?: boolean
  icon: typeof LayoutDashboard
  match?: (pathname: string) => boolean
}

const navItems: NavItem[] = [
  { to: '/', label: 'Tableau de bord', end: true, icon: LayoutDashboard },
  {
    to: '/code',
    label: 'Code de la route',
    icon: BookOpen,
    match: (pathname) => pathname === '/code' || pathname.startsWith('/code/'),
  },
  {
    to: '/conduite',
    label: 'Conduite',
    icon: Car,
    match: (pathname) =>
      (pathname === '/conduite' || pathname.startsWith('/conduite/')) &&
      !pathname.startsWith('/conduite/reservations') &&
      !pathname.startsWith('/conduite/moniteurs'),
  },
  {
    to: '/conduite/reservations',
    label: 'Réservations',
    icon: CalendarDays,
    match: (pathname) =>
      pathname.startsWith('/conduite/reservations') || pathname.startsWith('/conduite/moniteurs'),
  },
  { to: '/utilisateurs', label: 'Utilisateurs', icon: Users },
  { to: '/abonnements', label: 'Abonnements', icon: CreditCard },
  { to: '/annonces', label: 'Annonces', icon: Megaphone },
  { to: '/creer-admin', label: 'Créer un admin', icon: UserPlus },
]

function pageLabel(pathname: string) {
  if (pathname === '/') return 'Tableau de bord'
  if (pathname.startsWith('/utilisateurs')) return 'Utilisateurs'
  if (pathname.startsWith('/abonnements')) return 'Abonnements'
  if (pathname.startsWith('/creer-admin')) return 'Créer un admin'
  if (pathname.includes('/questions')) return 'Questions'
  if (pathname.startsWith('/code/revision-chapitres')) return 'Révision par chapitres'
  if (pathname.startsWith('/code/examens-test')) return 'Examens test'
  if (pathname.startsWith('/code/suivi-apprenants')) return 'Suivi apprenants'
  if (pathname.startsWith('/code/mes-notes')) return 'Suivi apprenants'
  if (pathname.startsWith('/code/e-codepermis')) return 'E-Codepermis'
  if (pathname.startsWith('/code')) return 'Code de la route'
  if (pathname.startsWith('/conduite/lecons')) return 'Leçons de conduite'
  if (pathname.startsWith('/conduite/reservations') || pathname.startsWith('/conduite/moniteurs')) {
    return 'Réservations'
  }
  if (pathname.startsWith('/conduite')) return 'Conduite'
  return 'Administration'
}

function adminInitials(fullName?: string) {
  if (!fullName?.trim()) return 'AD'
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return parts[0].slice(0, 2).toUpperCase()
}

export function AdminLayout() {
  const { admin, signOut } = useAdminAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [notifCount, setNotifCount] = useState(0)
  const [width, setWidth] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth : 1440,
  )

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY)
    if (!token) {
      setNotifCount(0)
      return
    }
    let cancelled = false
    fetchDashboardSummary(token)
      .then(({ summary }) => {
        if (cancelled) return
        setNotifCount(
          (summary.subscriptions?.pending ?? 0) + (summary.conduite?.reservationsPending ?? 0),
        )
      })
      .catch(() => {
        if (!cancelled) setNotifCount(0)
      })
    return () => {
      cancelled = true
    }
  }, [location.pathname])

  const isMobile = width < 640
  const isTablet = width >= 640 && width < 1080
  const closeMobile = () => setMobileOpen(false)

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    const q = searchQuery.trim()
    if (!q) return
    navigate(`/utilisateurs?q=${encodeURIComponent(q)}`)
  }

  const initials = adminInitials(admin?.fullName)

  return (
    <div
      className={`admin-app${mobileOpen ? ' is-sidebar-open' : ''}${isTablet ? ' is-tablet' : ''}${isMobile ? ' is-mobile' : ''}`}
    >
      {isMobile && mobileOpen ? (
        <div className="admin-sidebar-backdrop" onClick={closeMobile} aria-hidden />
      ) : null}

      <aside
        className={`admin-sidebar${isMobile && !mobileOpen ? ' is-closed' : ''}`}
        aria-label="Navigation"
        inert={isMobile && !mobileOpen ? true : undefined}
      >
          <div className="sidebar-brand">
            <img src={logoUrl} alt={SITE_NAME} className="sidebar-logo" />
            <div className="sidebar-brand-text">
              <p className="sidebar-brand-name">
                <BrandName onDark />
              </p>
              <p className="sidebar-brand-kicker">Espace admin</p>
            </div>
          {isMobile ? (
            <button
              type="button"
              className="sidebar-close"
              onClick={closeMobile}
              aria-label="Fermer le menu"
            >
              <X size={16} />
            </button>
          ) : null}
        </div>

        <div className="sidebar-cta-wrap">
          <Link
            to="/conduite/reservations"
            className="sidebar-cta"
            onClick={closeMobile}
            title="Gérer réservations"
          >
            <Plus size={14} strokeWidth={2.5} />
            <span className="sidebar-cta-label">Gérer réservations</span>
          </Link>
        </div>

        <nav className="sidebar-nav">
          <ul className="sidebar-list">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={closeMobile}
                    title={item.label}
                    className={({ isActive }) => {
                      const active = item.match ? item.match(location.pathname) : isActive
                      return `sidebar-link${active ? ' active' : ''}`
                    }}
                  >
                    <Icon size={16} strokeWidth={2} />
                    <span className="sidebar-link-label">{item.label}</span>
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="sidebar-profile">
          <div className="sidebar-profile-avatar" aria-hidden>
            {initials}
          </div>
          <div className="sidebar-profile-meta">
            <p className="sidebar-profile-name">{admin?.fullName || 'Administrateur'}</p>
            <p className="sidebar-profile-email">{admin?.phone || SITE_NAME}</p>
          </div>
          <button
            type="button"
            className="sidebar-logout-icon"
            onClick={signOut}
            title="Déconnexion"
            aria-label="Déconnexion"
          >
            <LogOut size={15} strokeWidth={1.8} />
          </button>
        </div>
      </aside>

      <div className="admin-stage">
        <header className="admin-global-topbar">
          {isMobile ? (
            <button
              type="button"
              className="admin-menu-btn"
              onClick={() => setMobileOpen(true)}
              aria-label="Ouvrir le menu"
            >
              <Menu size={18} />
            </button>
          ) : null}

          {!isMobile ? (
            <div className="admin-breadcrumb">
              <span>Admin</span>
              <ChevronRight size={12} />
              <strong>{pageLabel(location.pathname)}</strong>
            </div>
          ) : (
            <div className="admin-breadcrumb-spacer" />
          )}

          <form
            className={`admin-global-search${searchFocused ? ' is-focused' : ''}`}
            onSubmit={handleSearch}
            role="search"
          >
            <Search size={14} strokeWidth={2} aria-hidden />
            {!isMobile ? (
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder="Rechercher…"
                aria-label="Recherche globale"
              />
            ) : null}
          </form>

          <button
            type="button"
            className={`admin-notif-btn${notifCount > 0 ? ' has-badge' : ''}`}
            aria-label={
              notifCount > 0
                ? `${notifCount} éléments en attente`
                : 'Aucun élément en attente'
            }
            data-count={notifCount > 0 ? notifCount : undefined}
            onClick={() => navigate('/abonnements')}
            title="Paiements / réservations en attente"
          >
            <Bell size={16} strokeWidth={1.8} />
          </button>

          <div className="admin-topbar-avatar" title={admin?.fullName || 'Administrateur'}>
            {initials}
          </div>
        </header>

        <div className="admin-shell-card">
          <div className="admin-content">
            <Outlet context={{ admin }} />
          </div>
        </div>
      </div>
    </div>
  )
}
