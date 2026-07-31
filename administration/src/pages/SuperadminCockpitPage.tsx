import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  Landmark,
  Radio,
  RefreshCw,
  ScrollText,
  Shield,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react'
import {
  fetchCockpit,
  subscribeToActivityEvents,
  type ActivityEvent,
  type CockpitData,
} from '../api/activity'
import { StatusBadge } from '../components/StatusBadge'
import { getAdminToken, isAuthError } from '../context/AdminAuthContext'
import { actionLabel, formatAuditDate, resourceLabel } from '../utils/auditLabels'
import { roleLabel } from '../utils/roles'
import { PageHeader, Reveal, Skeleton } from '../ui'

function formatXof(value: number) {
  return `${new Intl.NumberFormat('fr-FR').format(value)} FCFA`
}

function actorBadge(type: ActivityEvent['actorType']) {
  if (type === 'admin') return { label: 'Admin', tone: 'warning' as const }
  if (type === 'user') return { label: 'Apprenant', tone: 'success' as const }
  return { label: 'Système', tone: 'neutral' as const }
}

function severityClass(severity: ActivityEvent['severity']) {
  if (severity === 'success') return 'is-success'
  if (severity === 'warning') return 'is-warning'
  if (severity === 'danger') return 'is-danger'
  return 'is-info'
}

function relativeTime(value: string) {
  const diffMs = Date.now() - new Date(value).getTime()
  const minutes = Math.round(diffMs / 60000)
  if (Number.isNaN(minutes)) return '—'
  if (minutes < 1) return 'à l’instant'
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`
  return formatAuditDate(value)
}

const emptyCockpit: CockpitData = {
  admins: { total: 0, active: 0, superadmins: 0, activeLast24h: 0, recent: [] },
  activity: { today: 0, recent: [] },
  users: { registeredToday: 0 },
  finances: { currency: 'XOF', todayEncaisse: 0, monthEncaisse: 0, needsRefund: 0 },
}

export function SuperadminCockpitPage() {
  const [data, setData] = useState<CockpitData>(emptyCockpit)
  const [feed, setFeed] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [live, setLive] = useState(false)
  const [filter, setFilter] = useState<'all' | 'admin' | 'user'>('all')

  const load = useCallback(async ({ silent = false } = {}) => {
    const token = getAdminToken()
    if (!token) {
      setError('Session expirée. Reconnectez-vous.')
      setLoading(false)
      return
    }
    if (!silent) {
      setLoading(true)
      setError(null)
    }
    try {
      const cockpit = await fetchCockpit(token)
      setData(cockpit)
      setFeed(cockpit.activity.recent)
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const token = getAdminToken()
    if (!token) return
    return subscribeToActivityEvents(
      token,
      (activity) => {
        setFeed((prev) => {
          if (prev.some((e) => e.id === activity.id)) return prev
          return [activity, ...prev].slice(0, 80)
        })
        setData((prev) => ({
          ...prev,
          activity: { ...prev.activity, today: prev.activity.today + 1 },
        }))
      },
      setLive,
    )
  }, [])

  const visibleFeed = useMemo(() => {
    if (filter === 'all') return feed
    return feed.filter((e) => e.actorType === filter)
  }, [feed, filter])

  return (
    <div className="admin-page cockpit-page">
      <PageHeader
        kicker="Direction"
        title="Cockpit de contrôle"
        description="Pilote les admins, l’activité en direct et la comptabilité — un seul écran."
        actions={
          <>
            <span className={`cockpit-live-pill${live ? ' is-on' : ''}`}>
              <Radio size={12} strokeWidth={2.4} />
              {live ? 'Temps réel' : 'Reconnexion…'}
            </span>
            <button
              type="button"
              className="ui-btn ui-btn-ghost"
              onClick={() => void load({ silent: true })}
              disabled={loading}
            >
              <RefreshCw size={14} />
              Actualiser
            </button>
            <Link to="/creer-admin" className="ui-btn ui-btn-primary">
              <UserPlus size={14} />
              Nouvel admin
            </Link>
          </>
        }
      />

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="cockpit-kpi-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="cockpit-kpi">
              <Skeleton height={14} width="40%" />
              <Skeleton height={26} width="55%" />
              <Skeleton height={12} width="70%" />
            </div>
          ))}
        </div>
      ) : (
        <div className="cockpit-kpi-grid">
          <Reveal delay={0} variant="scale">
            <Link to="/administrateurs" className="cockpit-kpi">
              <span className="cockpit-kpi-label">
                <Shield size={14} /> Admins
              </span>
              <strong className="cockpit-kpi-value">{data.admins.active}</strong>
              <span className="cockpit-kpi-meta">
                {data.admins.total} comptes · {data.admins.superadmins} super ·{' '}
                {data.admins.activeLast24h} actifs 24h
              </span>
            </Link>
          </Reveal>
          <Reveal delay={70} variant="scale">
            <Link to="/journal-audit" className="cockpit-kpi">
              <span className="cockpit-kpi-label">
                <Activity size={14} /> Activité aujourd’hui
              </span>
              <strong className="cockpit-kpi-value">{data.activity.today}</strong>
              <span className="cockpit-kpi-meta">
                {data.users.registeredToday} inscription
                {data.users.registeredToday > 1 ? 's' : ''} apprenant
              </span>
            </Link>
          </Reveal>
          <Reveal delay={140} variant="scale">
            <Link to="/finances" className="cockpit-kpi">
              <span className="cockpit-kpi-label">
                <Wallet size={14} /> Encaissé aujourd’hui
              </span>
              <strong className="cockpit-kpi-value">{formatXof(data.finances.todayEncaisse)}</strong>
              <span className="cockpit-kpi-meta">
                Mois · {formatXof(data.finances.monthEncaisse)}
              </span>
            </Link>
          </Reveal>
          <Reveal delay={210} variant="scale">
            <Link
              to={data.finances.needsRefund > 0 ? '/finances?tab=refunds' : '/finances'}
              className={`cockpit-kpi${data.finances.needsRefund > 0 ? ' is-alert' : ''}`}
            >
              <span className="cockpit-kpi-label">
                <Landmark size={14} /> À rembourser
              </span>
              <strong className="cockpit-kpi-value">{data.finances.needsRefund}</strong>
              <span className="cockpit-kpi-meta">Ouvrir la file remboursements</span>
            </Link>
          </Reveal>
        </div>
      )}

      <Reveal delay={80} className="cockpit-shortcuts">
        <Link to="/administrateurs" className="cockpit-shortcut">
          <Shield size={16} /> Gérer les admins
        </Link>
        <Link to="/journal-audit" className="cockpit-shortcut">
          <ScrollText size={16} /> Journal d’audit
        </Link>
        <Link to="/finances" className="cockpit-shortcut">
          <Landmark size={16} /> Comptabilité
        </Link>
        <Link to="/utilisateurs" className="cockpit-shortcut">
          <Users size={16} /> Apprenants
        </Link>
        <Link to="/" className="cockpit-shortcut">
          <Activity size={16} /> Ops dashboard
        </Link>
      </Reveal>

      <div className="cockpit-grid">
        <Reveal as="section" className="cockpit-panel" delay={120}>
          <div className="cockpit-panel-head">
            <h3>
              <Radio size={15} /> Activité en direct
            </h3>
            <div className="cockpit-filter-tabs" role="tablist">
              {(
                [
                  ['all', 'Tout'],
                  ['admin', 'Admins'],
                  ['user', 'Apprenants'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={filter === key}
                  className={filter === key ? 'is-active' : undefined}
                  onClick={() => setFilter(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="cockpit-feed">
            {visibleFeed.length === 0 ? (
              <p className="cockpit-empty">Aucune activité pour ce filtre. Les événements apparaissent ici en direct.</p>
            ) : (
              visibleFeed.map((event) => {
                const badge = actorBadge(event.actorType)
                return (
                  <article
                    key={event.id}
                    className={`cockpit-feed-item ${severityClass(event.severity)}`}
                  >
                    <div className="cockpit-feed-top">
                      <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
                      <time dateTime={event.createdAt}>{relativeTime(event.createdAt)}</time>
                    </div>
                    <p className="cockpit-feed-summary">
                      {event.summary ||
                        `${event.actorName} · ${actionLabel(event.action)} · ${resourceLabel(event.resource)}`}
                    </p>
                    <p className="cockpit-feed-meta">
                      <strong>{event.actorName || '—'}</strong>
                      {' · '}
                      {actionLabel(event.action)}
                      {' · '}
                      {resourceLabel(event.resource)}
                      {event.resourceId ? ` #${event.resourceId.slice(0, 8)}` : ''}
                    </p>
                  </article>
                )
              })
            )}
          </div>
        </Reveal>

        <Reveal as="section" className="cockpit-panel" delay={180}>
          <div className="cockpit-panel-head">
            <h3>
              <Shield size={15} /> Équipe admin
            </h3>
            <Link to="/administrateurs" className="cockpit-panel-link">
              Tout voir
            </Link>
          </div>
          <div className="cockpit-admins">
            {data.admins.recent.length === 0 ? (
              <p className="cockpit-empty">Aucun administrateur.</p>
            ) : (
              data.admins.recent.map((admin) => (
                <Link
                  key={admin.id}
                  to={`/administrateurs/${admin.id}`}
                  className="cockpit-admin-row"
                >
                  <span className="cockpit-admin-avatar" aria-hidden>
                    {admin.fullName
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((p) => p[0])
                      .join('')
                      .toUpperCase()}
                  </span>
                  <span className="cockpit-admin-meta">
                    <strong>{admin.fullName}</strong>
                    <span>
                      {roleLabel(admin.role)} · {admin.phone}
                    </span>
                  </span>
                  <StatusBadge tone={admin.isActive ? 'success' : 'danger'}>
                    {admin.isActive ? 'Actif' : 'Suspendu'}
                  </StatusBadge>
                </Link>
              ))
            )}
          </div>
          <div className="cockpit-panel-foot">
            <Link to="/creer-admin" className="ui-btn ui-btn-primary ui-btn-block">
              <UserPlus size={14} />
              Créer un administrateur
            </Link>
          </div>
        </Reveal>
      </div>
    </div>
  )
}
