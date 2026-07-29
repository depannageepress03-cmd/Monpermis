import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Filter, RefreshCw, Shield } from 'lucide-react'
import {
  fetchAdmins,
  fetchAuditLogs,
  type AdminAccount,
  type AuditLogEntry,
} from '../api/admins'
import { StatusBadge } from '../components/StatusBadge'
import { getAdminToken, isAuthError } from '../context/AdminAuthContext'
import { EmptyState, SkeletonBlock } from '../ui'
import { actionLabel, formatAuditDate, resourceLabel, summarizeMetadata } from '../utils/auditLabels'

export function AuditLogPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [admins, setAdmins] = useState<AdminAccount[]>([])
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [actions, setActions] = useState<string[]>([])
  const [resources, setResources] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [adminId, setAdminId] = useState(() => searchParams.get('adminId') || '')
  const [action, setAction] = useState(() => searchParams.get('action') || '')
  const [resource, setResource] = useState(() => searchParams.get('resource') || '')
  const [from, setFrom] = useState(() => searchParams.get('from') || '')
  const [to, setTo] = useState(() => searchParams.get('to') || '')
  const [q, setQ] = useState(() => searchParams.get('q') || '')

  useEffect(() => {
    const token = getAdminToken()
    if (!token) return
    fetchAdmins(token)
      .then((data) => setAdmins(data.admins))
      .catch(() => {})
  }, [])

  const load = useCallback(async (nextPage = 1) => {
    const token = getAdminToken()
    if (!token) {
      setError('Session expirée. Reconnectez-vous.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAuditLogs(token, {
        page: nextPage,
        limit: 50,
        adminId: adminId || undefined,
        action: action || undefined,
        resource: resource || undefined,
        from: from || undefined,
        to: to || undefined,
        q: q.trim() || undefined,
      })
      setLogs(data.logs)
      setPage(data.pagination.page)
      setPages(data.pagination.pages)
      setTotal(data.pagination.total)
      setActions(data.filters.actions)
      setResources(data.filters.resources)
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [adminId, action, resource, from, to, q])

  useEffect(() => {
    void load(1)
  }, [load])

  const applyFilters = (e: FormEvent) => {
    e.preventDefault()
    const next = new URLSearchParams()
    if (adminId) next.set('adminId', adminId)
    if (action) next.set('action', action)
    if (resource) next.set('resource', resource)
    if (from) next.set('from', from)
    if (to) next.set('to', to)
    if (q.trim()) next.set('q', q.trim())
    setSearchParams(next)
    void load(1)
  }

  const resetFilters = () => {
    setAdminId('')
    setAction('')
    setResource('')
    setFrom('')
    setTo('')
    setQ('')
    setSearchParams({})
  }

  return (
    <div className="admin-page">
      <div className="admin-page-intro">
        <p className="admin-page-intro-label">Sécurité</p>
        <h2 className="admin-page-intro-title">Journal d’audit</h2>
        <p className="admin-page-intro-text">
          Traçabilité des opérations administrateur (filtres par compte, action et date).
        </p>
      </div>

      <div className="users-toolbar-figma" style={{ marginBottom: 16, gap: 10, flexWrap: 'wrap' }}>
        <Link to="/administrateurs" className="dash-filter-btn" style={{ textDecoration: 'none' }}>
          <Shield size={12} />
          Liste des admins
        </Link>
        <button type="button" className="dash-filter-btn" onClick={() => void load(page)} disabled={loading}>
          <RefreshCw size={12} />
          {loading ? 'Chargement…' : 'Actualiser'}
        </button>
        <span className="muted" style={{ alignSelf: 'center' }}>
          {total} entrée{total > 1 ? 's' : ''}
        </span>
      </div>

      <section className="admin-section" style={{ marginBottom: 16 }}>
        <div className="admin-section-head">
          <h3 className="admin-section-label">
            <Filter size={14} style={{ display: 'inline', marginRight: 6 }} />
            Filtres
          </h3>
        </div>
        <div className="admin-section-body">
          <form
            onSubmit={applyFilters}
            className="create-admin-grid"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}
          >
            <div className="create-admin-field">
              <label htmlFor="audit-admin">Administrateur</label>
              <select id="audit-admin" value={adminId} onChange={(e) => setAdminId(e.target.value)}>
                <option value="">Tous</option>
                {admins.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div className="create-admin-field">
              <label htmlFor="audit-action">Action</label>
              <select id="audit-action" value={action} onChange={(e) => setAction(e.target.value)}>
                <option value="">Toutes</option>
                {actions.map((item) => (
                  <option key={item} value={item}>
                    {actionLabel(item)}
                  </option>
                ))}
              </select>
            </div>
            <div className="create-admin-field">
              <label htmlFor="audit-resource">Ressource</label>
              <select id="audit-resource" value={resource} onChange={(e) => setResource(e.target.value)}>
                <option value="">Toutes</option>
                {resources.map((item) => (
                  <option key={item} value={item}>
                    {resourceLabel(item)}
                  </option>
                ))}
              </select>
            </div>
            <div className="create-admin-field">
              <label htmlFor="audit-from">Du</label>
              <input id="audit-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="create-admin-field">
              <label htmlFor="audit-to">Au</label>
              <input id="audit-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="create-admin-field">
              <label htmlFor="audit-q">Recherche</label>
              <input
                id="audit-q"
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Nom, action, id…"
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
              <button type="submit" className="btn-primary btn-primary-inline">
                Filtrer
              </button>
              <button type="button" className="dash-filter-btn" onClick={resetFilters}>
                Réinitialiser
              </button>
            </div>
          </form>
        </div>
      </section>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <section className="admin-section">
        <div className="admin-section-body" style={{ padding: loading && logs.length === 0 ? 16 : 0 }}>
          {loading && logs.length === 0 ? (
            <SkeletonBlock rows={6} />
          ) : !loading && logs.length === 0 ? (
            <EmptyState
              title="Aucune entrée"
              description="Aucune entrée ne correspond à ces filtres."
            />
          ) : (
          <div className="admin-data-table-wrap">
            <table className="admin-data-table" style={{ minWidth: 860 }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Admin</th>
                  <th>Action</th>
                  <th>Ressource</th>
                  <th>Identifiant</th>
                  <th>Détails</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatAuditDate(entry.createdAt)}</td>
                    <td>
                      {entry.adminId ? (
                        <Link to={`/administrateurs/${entry.adminId}`}>{entry.adminName}</Link>
                      ) : (
                        entry.adminName
                      )}
                    </td>
                    <td>
                      <StatusBadge tone="neutral" withIcon={false}>
                        {actionLabel(entry.action)}
                      </StatusBadge>
                    </td>
                    <td>{resourceLabel(entry.resource)}</td>
                    <td className="muted">{entry.resourceId || '—'}</td>
                    <td style={{ maxWidth: 280, fontSize: 13 }}>{summarizeMetadata(entry.metadata)}</td>
                    <td className="muted">{entry.ip || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>
      </section>

      {pages > 1 ? (
        <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
          <button
            type="button"
            className="dash-filter-btn"
            disabled={page <= 1 || loading}
            onClick={() => void load(page - 1)}
          >
            Précédent
          </button>
          <span className="muted">
            Page {page} / {pages}
          </span>
          <button
            type="button"
            className="dash-filter-btn"
            disabled={page >= pages || loading}
            onClick={() => void load(page + 1)}
          >
            Suivant
          </button>
        </div>
      ) : null}
    </div>
  )
}
