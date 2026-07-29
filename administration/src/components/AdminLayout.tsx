import {
  Bell,
  BookOpen,
  CalendarDays,
  Car,
  ChevronRight,
  Gift,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  ScrollText,
  Search,
  Shield,
  Users,
  UserRound,
  Wallet,
  X,
} from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'
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

type NavGroup = { id: string; label: string; items: NavItem[] }

const navGroups: NavGroup[] = [
  {
    id: 'overview',
    label: 'Vue d’ensemble',
    items: [{ to: '/', label: 'Tableau de bord', end: true, icon: LayoutDashboard }],
  },
  {
    id: 'content',
    label: 'Contenu',
    items: [
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
      { to: '/annonces', label: 'Annonces', icon: Megaphone },
    ],
  },
  {
    id: 'ops',
    label: 'Opérations',
    items: [
      {
        to: '/conduite/reservations',
        label: 'Réservations',
        icon: CalendarDays,
        match: (pathname) => pathname.startsWith('/conduite/reservations'),
      },
      {
        to: '/conduite/moniteurs',
        label: 'Moniteurs',
        icon: UserRound,
        match: (pathname) => pathname.startsWith('/conduite/moniteurs'),
      },
      { to: '/utilisateurs', label: 'Utilisateurs', icon: Users },
      { to: '/abonnements', label: 'Abonnés', icon: Wallet },
      { to: '/codes-promo', label: 'Codes promo', icon: Gift },
    ],
  },
  {
    id: 'system',
    label: 'Système',
    items: [
      { to: '/administrateurs', label: 'Administrateurs', icon: Shield },
      { to: '/journal-audit', label: 'Journal d’audit', icon: ScrollText },
    ],
  },
]

function pageLabel(pathname: string) {
  if (pathname === '/') return 'Tableau de bord'
  if (pathname.startsWith('/utilisateurs')) return 'Utilisateurs'
  if (pathname.startsWith('/abonnements') || pathname.startsWith('/demandes-acces')) return 'Abonnés'
  if (pathname.startsWith('/codes-promo')) return 'Codes promo'
  if (pathname.startsWith('/administrateurs')) return 'Administrateurs'
  if (pathname.startsWith('/journal-audit')) return 'Journal d’audit'
  if (pathname.startsWith('/creer-admin')) return 'Créer un admin'
  if (pathname.includes('/questions')) return 'Questions'
  if (pathname.startsWith('/code/revision-chapitres')) return 'Révision par chapitres'
  if (pathname.startsWith('/code/examens-test')) return 'Examens test'
  if (pathname.startsWith('/code/suivi-apprenants')) return 'Suivi apprenants'
  if (pathname.startsWith('/code/e-codepermis')) return 'E-Codepermis'
  if (pathname.startsWith('/code')) return 'Code de la route'
  if (pathname.startsWith('/conduite/lecons')) return 'Leçons de conduite'
  if (pathname.startsWith('/conduite/reservations')) return 'Réservations'
  if (pathname.startsWith('/conduite/moniteurs')) return 'Moniteurs'
  if (pathname.startsWith('/conduite')) return 'Conduite'
  if (pathname.startsWith('/annonces')) return 'Annonces'
  return 'Administration'
}

function breadcrumbParent(pathname: string): { to: string; label: string } | null {
  if (pathname.startsWith('/code/') && pathname !== '/code') return { to: '/code', label: 'Code' }
  if (pathname.startsWith('/conduite/') && pathname !== '/conduite') {
    return { to: '/conduite', label: 'Conduite' }
  }
  if (pathname.startsWith('/administrateurs/')) {
    return { to: '/administrateurs', label: 'Administrateurs' }
  }
  return null
}

function adminInitials(fullName?: string) {
  if (!fullName?.trim()) return 'AD'
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return parts[0].slice(0, 2).toUpperCase()
}

type SearchTarget = { label: string; to: string }

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
        setNotifCount(summary.conduite?.reservationsPending ?? 0)
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
  const currentLabel = pageLabel(location.pathname)
  const parentCrumb = breadcrumbParent(location.pathname)

  const searchTargets = useMemo((): SearchTarget[] => {
    const q = searchQuery.trim()
    if (!q) return []
    const encoded = encodeURIComponent(q)
    return [
      { label: `Utilisateurs · « ${q} »`, to: `/utilisateurs?q=${encoded}` },
      { label: `Abonnés · « ${q} »`, to: `/abonnements?q=${encoded}` },
      { label: `Réservations · « ${q} »`, to: `/conduite/reservations?q=${encoded}` },
    ]
  }, [searchQuery])

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    const first = searchTargets[0]
    if (!first) return
    navigate(first.to)
    setSearchFocused(false)
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

        <nav className="sidebar-nav">
          {navGroups.map((group) => (
            <div key={group.id} className="sidebar-group">
              <p className="sidebar-group-label">{group.label}</p>
              <ul className="sidebar-list">
                {group.items.map((item) => {
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
            </div>
          ))}
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

          <nav className="admin-breadcrumb" aria-label="Fil d’Ariane">
            <Link to="/">Admin</Link>
            {parentCrumb ? (
              <>
                <ChevronRight size={12} aria-hidden />
                <Link to={parentCrumb.to}>{parentCrumb.label}</Link>
              </>
            ) : null}
            <ChevronRight size={12} aria-hidden />
            <strong>{currentLabel}</strong>
          </nav>

          <div className="admin-search-wrap">
            <form
              className={`admin-global-search${searchFocused ? ' is-focused' : ''}`}
              onSubmit={handleSearch}
              role="search"
            >
              <Search size={14} strokeWidth={2} aria-hidden />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => window.setTimeout(() => setSearchFocused(false), 150)}
                placeholder="Rechercher…"
                aria-label="Recherche globale"
              />
            </form>
            {searchFocused && searchTargets.length > 0 ? (
              <div className="admin-search-results" role="listbox">
                {searchTargets.map((target) => (
                  <button
                    key={target.to}
                    type="button"
                    className="admin-search-result"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      navigate(target.to)
                      setSearchFocused(false)
                    }}
                  >
                    {target.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            className={`admin-notif-btn${notifCount > 0 ? ' has-badge' : ''}`}
            aria-label={
              notifCount > 0
                ? `${notifCount} éléments en attente`
                : 'Aucun élément en attente'
            }
            data-count={notifCount > 0 ? notifCount : undefined}
            onClick={() => navigate('/conduite/reservations')}
            title="Réservations en attente"
          >
            <Bell size={16} strokeWidth={1.8} />
          </button>
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
