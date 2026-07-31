import {
  Activity,
  Bell,
  BookOpen,
  CalendarDays,
  Car,
  ChevronRight,
  Gift,
  Landmark,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  ScrollText,
  Search,
  Shield,
  UserCog,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import logoUrl from '../assets/logo.png'
import { fetchDashboardSummary } from '../api/dashboard'
import { useAdminAuth } from '../context/AdminAuthContext'
import { getApiOrigin } from '../utils/mediaUrl'
import { SITE_NAME } from '../theme/brand'
import { BrandName } from './BrandName'

const ADMIN_TOKEN_KEY = 'monpermis_admin_token'

type NavItem = {
  to: string
  label: string
  end?: boolean
  icon: typeof LayoutDashboard
  match?: (pathname: string) => boolean
  /** Visible uniquement pour les superadmins (Administrateurs, audit, finances…). */
  superadminOnly?: boolean
  badgeKey?: 'reservations' | 'access' | 'refunds'
}

type NavGroup = {
  id: string
  label: string
  items: NavItem[]
}

type OpsBadges = {
  reservations: number
  access: number
  refunds: number
}

const navGroups: NavGroup[] = [
  {
    id: 'control',
    label: 'Contrôle',
    items: [
      {
        to: '/cockpit',
        label: 'Cockpit',
        icon: Activity,
        superadminOnly: true,
        match: (pathname) => pathname.startsWith('/cockpit'),
      },
      {
        to: '/administrateurs',
        label: 'Admins',
        icon: Shield,
        superadminOnly: true,
        match: (pathname) => pathname.startsWith('/administrateurs'),
      },
      {
        to: '/journal-audit',
        label: 'Journal',
        icon: ScrollText,
        superadminOnly: true,
      },
      {
        to: '/finances',
        label: 'Compta',
        icon: Landmark,
        superadminOnly: true,
        badgeKey: 'refunds',
      },
    ],
  },
  {
    id: 'ops',
    label: 'Exploitation',
    items: [
      { to: '/', label: 'Tableau de bord', end: true, icon: LayoutDashboard },
      { to: '/utilisateurs', label: 'Apprenants', icon: Users },
      { to: '/abonnements', label: 'Abonnés', icon: Wallet, badgeKey: 'access' },
      {
        to: '/conduite/reservations',
        label: 'Réservations',
        icon: CalendarDays,
        match: (pathname) => pathname.startsWith('/conduite/reservations'),
        badgeKey: 'reservations',
      },
      {
        to: '/conduite/moniteurs',
        label: 'Moniteurs',
        icon: UserCog,
        match: (pathname) => pathname.startsWith('/conduite/moniteurs'),
      },
    ],
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
          pathname === '/conduite' ||
          (pathname.startsWith('/conduite/') &&
            !pathname.startsWith('/conduite/reservations') &&
            !pathname.startsWith('/conduite/moniteurs')),
      },
      { to: '/codes-promo', label: 'Codes promo', icon: Gift },
      { to: '/annonces', label: 'Annonces', icon: Megaphone },
    ],
  },
]

function pageLabel(pathname: string) {
  if (pathname.startsWith('/cockpit')) return 'Cockpit'
  if (pathname === '/') return 'Tableau de bord'
  if (pathname.startsWith('/utilisateurs')) return 'Apprenants'
  if (pathname.startsWith('/abonnements') || pathname.startsWith('/demandes-acces')) {
    return 'Abonnés'
  }
  if (pathname.startsWith('/codes-promo')) return 'Codes promo'
  if (pathname.startsWith('/administrateurs')) return 'Admins'
  if (pathname.startsWith('/journal-audit')) return 'Journal d’audit'
  if (pathname.startsWith('/creer-admin')) return 'Créer un admin'
  if (pathname.startsWith('/finances')) return 'Comptabilité'
  if (pathname.includes('/questions')) return 'Questions'
  if (pathname.startsWith('/code/revision-chapitres')) return 'Révision par chapitres'
  if (pathname.startsWith('/code/examens-test')) return 'Examens test'
  if (pathname.startsWith('/code/suivi-apprenants')) return 'Suivi apprenants'
  if (pathname.startsWith('/code/mes-notes')) return 'Suivi apprenants'
  if (pathname.startsWith('/code/e-codepermis')) return 'E-Codepermis'
  if (pathname.startsWith('/code')) return 'Code de la route'
  if (pathname.startsWith('/conduite/lecons')) return 'Leçons de conduite'
  if (pathname.startsWith('/conduite/reservations')) return 'Réservations'
  if (pathname.startsWith('/conduite/moniteurs')) return 'Moniteurs'
  if (pathname.startsWith('/conduite')) return 'Conduite'
  return 'Administration'
}

function adminInitials(fullName?: string) {
  if (!fullName?.trim()) return 'AD'
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return parts[0].slice(0, 2).toUpperCase()
}

function formatBadge(count: number) {
  if (count <= 0) return undefined
  return count > 99 ? '99+' : String(count)
}

type HealthSnapshot = {
  db: string
  fedapay: string
  fedapayEnvironment: string
  fedapayWebhookSecret: string
}

export function AdminLayout() {
  const { admin, signOut, canManageAdmins } = useAdminAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [badges, setBadges] = useState<OpsBadges>({ reservations: 0, access: 0, refunds: 0 })
  const [health, setHealth] = useState<HealthSnapshot | null>(null)
  const [healthDismissed, setHealthDismissed] = useState(false)
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
      setBadges({ reservations: 0, access: 0, refunds: 0 })
      return
    }
    let cancelled = false
    fetchDashboardSummary(token)
      .then(({ summary }) => {
        if (cancelled) return
        setBadges({
          reservations: summary.conduite?.reservationsPending ?? 0,
          access: summary.accessRequests?.pending ?? 0,
          refunds: summary.payments?.needsRefund ?? 0,
        })
      })
      .catch(() => {
        if (!cancelled) setBadges({ reservations: 0, access: 0, refunds: 0 })
      })
    return () => {
      cancelled = true
    }
  }, [location.pathname])

  useEffect(() => {
    if (!canManageAdmins || healthDismissed) return
    let cancelled = false
    const origin = getApiOrigin()
    const url = origin ? `${origin}/api/health` : '/api/health'
    fetch(url)
      .then(async (res) => {
        const json = (await res.json()) as HealthSnapshot & { success?: boolean }
        if (cancelled) return
        setHealth({
          db: json.db || 'unknown',
          fedapay: json.fedapay || 'unknown',
          fedapayEnvironment: json.fedapayEnvironment || '—',
          fedapayWebhookSecret: json.fedapayWebhookSecret || 'unknown',
        })
      })
      .catch(() => {
        if (!cancelled) {
          setHealth({
            db: 'unreachable',
            fedapay: 'unknown',
            fedapayEnvironment: '—',
            fedapayWebhookSecret: 'unknown',
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [canManageAdmins, healthDismissed])

  // Superadmin : atterrir sur le cockpit par défaut
  useEffect(() => {
    if (!canManageAdmins) return
    if (location.pathname === '/' && !sessionStorage.getItem('mp_ops_home')) {
      navigate('/cockpit', { replace: true })
    }
  }, [canManageAdmins, location.pathname, navigate])

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
  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.superadminOnly || canManageAdmins),
    }))
    .filter((group) => group.items.length > 0)
  const refundBadge = canManageAdmins ? badges.refunds : 0
  const notifCount = badges.reservations + badges.access + refundBadge

  const openOpsQueue = () => {
    if (canManageAdmins && badges.refunds > 0) {
      navigate('/finances?tab=refunds')
      return
    }
    if (badges.access > 0) {
      navigate('/abonnements')
      return
    }
    navigate('/conduite/reservations')
  }

  const healthOk =
    health &&
    health.db === 'connected' &&
    health.fedapay === 'configured' &&
    health.fedapayWebhookSecret === 'configured'
  const showHealthStrip = Boolean(canManageAdmins && health && !healthDismissed && !healthOk)

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
          {visibleGroups.map((group) => (
            <div key={group.id} className="sidebar-group">
              <p className="sidebar-group-label">{group.label}</p>
              <ul className="sidebar-list">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const badgeCount =
                    item.badgeKey === 'reservations'
                      ? badges.reservations
                      : item.badgeKey === 'access'
                        ? badges.access
                        : item.badgeKey === 'refunds'
                          ? refundBadge
                          : 0
                  const badgeLabel = formatBadge(badgeCount)
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={
                          item.badgeKey === 'refunds' && badgeCount > 0
                            ? '/finances?tab=refunds'
                            : item.to
                        }
                        end={item.end}
                        onClick={() => {
                          if (item.to === '/') sessionStorage.setItem('mp_ops_home', '1')
                          closeMobile()
                        }}
                        title={item.label}
                        className={({ isActive }) => {
                          const active = item.match ? item.match(location.pathname) : isActive
                          return `sidebar-link${active ? ' active' : ''}${badgeLabel ? ' has-badge' : ''}`
                        }}
                        data-count={badgeLabel}
                      >
                        <Icon size={16} strokeWidth={2} />
                        <span className="sidebar-link-label">{item.label}</span>
                        {badgeLabel ? (
                          <span
                            className="sidebar-link-badge"
                            aria-label={`${badgeCount} en attente`}
                          >
                            {badgeLabel}
                          </span>
                        ) : null}
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
            <p className="sidebar-profile-email">
              {admin?.role === 'superadmin' ? 'Direction' : 'Équipe'}
              {admin?.phone ? ` · ${admin.phone}` : ''}
            </p>
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
        {showHealthStrip && health ? (
          <div className="admin-health-strip" role="status">
            <span>
              Santé API · DB {health.db === 'connected' ? 'OK' : health.db} · FedaPay{' '}
              {health.fedapay === 'configured' ? health.fedapayEnvironment : 'manquant'} · Webhook{' '}
              {health.fedapayWebhookSecret === 'configured' ? 'OK' : 'manquant'}
            </span>
            <button
              type="button"
              className="admin-health-dismiss"
              onClick={() => setHealthDismissed(true)}
              aria-label="Fermer l’alerte santé"
            >
              <X size={12} />
            </button>
          </div>
        ) : null}

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
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder={isMobile ? 'Apprenant…' : 'Rechercher un apprenant…'}
              aria-label="Recherche apprenant"
            />
          </form>
          {canManageAdmins ? (
            <span className="admin-role-chip" title="Accès Direction">
              Direction
            </span>
          ) : null}

          <button
            type="button"
            className={`admin-notif-btn${notifCount > 0 ? ' has-badge' : ''}`}
            aria-label={
              notifCount > 0
                ? `${notifCount} éléments en attente`
                : 'Aucun élément en attente'
            }
            data-count={formatBadge(notifCount)}
            onClick={openOpsQueue}
            title={[
              badges.reservations > 0 ? `${badges.reservations} réservation(s)` : null,
              badges.access > 0 ? `${badges.access} abonnement(s)` : null,
              refundBadge > 0 ? `${refundBadge} remboursement(s)` : null,
            ]
              .filter(Boolean)
              .join(' · ') || 'File opérationnelle'}
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
