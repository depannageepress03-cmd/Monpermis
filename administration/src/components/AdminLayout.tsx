import {
  Bell,
  BookOpen,
  CalendarDays,
  Car,
  Gift,
  Landmark,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Radar,
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
import { fetchOpsStatus } from '../api/auth'
import { fetchDashboardSummary } from '../api/dashboard'
import { getAdminToken, useAdminAuth } from '../context/AdminAuthContext'
import { SITE_NAME } from '../theme/brand'

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
      {
        to: '/activite-apprenants',
        label: 'Activité apprenants',
        icon: Radar,
        match: (pathname) => pathname.startsWith('/activite-apprenants'),
      },
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
    const token = getAdminToken()
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
    const token = getAdminToken()
    if (!token) return
    fetchOpsStatus(token)
      .then((json) => {
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

  const isMobile = width < 981
  const closeMobile = () => setMobileOpen(false)
  const [dashDate, setDashDate] = useState('')
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  useEffect(() => {
    if (!userMenuOpen) return
    const close = () => setUserMenuOpen(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [userMenuOpen])

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    const q = searchQuery.trim()
    if (!q) return
    navigate(`/utilisateurs?q=${encodeURIComponent(q)}`)
  }

  const initials = adminInitials(admin?.fullName)
  const roleLabel = admin?.role === 'superadmin' ? 'Direction' : 'Équipe'
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

  const todayIso = new Date().toLocaleDateString('en-CA')
  const shownDate = dashDate || todayIso
  const dateLong = new Date(`${shownDate}T12:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const onDashboard = location.pathname === '/'

  return (
    <div className={`cx-root cx-app-shell cx-shell2${mobileOpen ? ' cx-nav-open' : ''}`}>
      <aside className="cx-sidebar" aria-label="Navigation" inert={isMobile && !mobileOpen ? true : undefined}>
        <div className="cx-sb-brand">
          <img src={logoUrl} alt={SITE_NAME} width={52} height={52} />
          <span>
            <strong>MONPERMIS</strong>
            <small>Admin</small>
          </span>
        </div>

        <nav className="cx-side-nav" id="nav">
          {visibleGroups.map((group, n) => (
            <div key={group.id} style={{ display: 'contents' }}>
              {n ? <div className="cx-side-nav-divider" /> : null}
              <p className="cx-side-nav-group">{group.label}</p>
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
                  <NavLink
                    key={item.to}
                    to={
                      item.badgeKey === 'refunds' && badgeCount > 0 ? '/finances?tab=refunds' : item.to
                    }
                    end={item.end}
                    onClick={closeMobile}
                    title={item.label}
                    className={({ isActive }) => {
                      const active = item.match ? item.match(location.pathname) : isActive
                      return `cx-side-nav-link${active ? ' cx-is-active' : ''}`
                    }}
                  >
                    <Icon className="cx-side-nav-ico" />
                    <span>{item.label}</span>
                    {badgeLabel ? (
                      <span className="cx-nav-badge" aria-label={`${badgeCount} en attente`}>
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
              <span className="cx-user-name">{admin?.fullName || 'Administrateur'}</span>
              <span className="cx-user-role">
                {roleLabel}
                {admin?.phone ? ` · ${admin.phone}` : ''}
              </span>
            </span>
            <button type="button" className="cx-btn-logout" onClick={signOut}>
              Se déconnecter
            </button>
          </div>
        </div>
      </aside>
      <button
        type="button"
        className="cx-sidebar-backdrop"
        aria-label="Fermer le menu"
        onClick={closeMobile}
      />

      <div className="cx-main cx-main2">
        <div className="cx-topbar2">
          <form className="cx-tb2-search" onSubmit={handleSearch} role="search">
            <Search aria-hidden />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un apprenant, un numéro, un e-mail…"
              autoComplete="off"
              aria-label="Rechercher un apprenant"
            />
          </form>
          <button
            type="button"
            className="cx-tb2-bell"
            onClick={openOpsQueue}
            aria-label={
              notifCount > 0 ? `${notifCount} éléments en attente` : 'Aucun élément en attente'
            }
            title={
              [
                badges.reservations > 0 ? `${badges.reservations} réservation(s)` : null,
                badges.access > 0 ? `${badges.access} abonnement(s)` : null,
                refundBadge > 0 ? `${refundBadge} remboursement(s)` : null,
              ]
                .filter(Boolean)
                .join(' · ') || 'File opérationnelle'
            }
          >
            <Bell aria-hidden />
            {notifCount > 0 ? <i className="cx-bell-dot" /> : null}
          </button>
          <label className="cx-tb2-date" title="Date affichée sur le tableau de bord">
            <CalendarDays aria-hidden />
            <span>{dateLong}</span>
            {onDashboard ? (
              <input
                type="date"
                value={shownDate}
                max={todayIso}
                onChange={(e) => e.target.value && setDashDate(e.target.value)}
                aria-label="Date du tableau de bord"
              />
            ) : null}
          </label>
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
              <strong>{admin?.fullName || 'Administrateur'}</strong>
              <small>{roleLabel}</small>
            </span>
            <i className="cx-tb2-chev" />
          </button>
          {userMenuOpen ? (
            <div className="cx-pop cx-pop-user" onClick={(e) => e.stopPropagation()}>
              <button type="button" onClick={signOut}>
                <LogOut aria-hidden />
                Se déconnecter
              </button>
            </div>
          ) : null}
        </div>

        <div className="cx-mobile-bar">
          <button
            type="button"
            className="cx-nav-toggle"
            onClick={() => setMobileOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu aria-hidden />
          </button>
          <span className="cx-mobile-bar-brand">
            <img src={logoUrl} alt="" />
            MONPERMIS
          </span>
          <span className="cx-user-avatar">{initials}</span>
        </div>

        <div className="cx-content">
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
          <div className="cx-view admin-content cx-legacy">
            <Outlet context={{ admin, dashDate, setDashDate }} />
          </div>
        </div>
      </div>
    </div>
  )
}
