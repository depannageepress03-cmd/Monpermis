import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Filter, RefreshCw, RotateCcw, ScrollText } from 'lucide-react'
import {
  fetchAdmins,
  fetchAuditLogs,
  type AdminAccount,
  type AuditLogEntry,
} from '../api/admins'
import { DirectionSection } from '../components/model/DirectionSection'
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
    <DirectionSection
      kicker="Sécurité"
      title="Journal d’audit"
      subtitle="Traçabilité des opérations administrateur : filtres par compte, action et date."
      actions={
        <button type="button" className="cx-refresh" onClick={() => void load(page)} disabled={loading}>
          <RefreshCw aria-hidden />
          {loading ? 'Chargement…' : 'Actualiser'}
        </button>
      }
    >
      {error ? <p className="cx-note cx-note-err" role="alert">{error}</p> : null}

      <section className="cx-panel">
        <div className="cx-panel-head cx-ph cx-ph-plain">
          <span className="cx-phi cx-phi-tile">
            <Filter aria-hidden />
          </span>
          <div className="cx-ph-txt">
            <h2 className="cx-panel-title">Filtres</h2>
            <p className="cx-muted">
              {total} entrée{total > 1 ? 's' : ''} correspondante{total > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <form onSubmit={applyFilters} className="cx-filter-bar">
          <label>
            Administrateur
            <select id="audit-admin" className="cx-select" value={adminId} onChange={(e) => setAdminId(e.target.value)}>
              <option value="">Tous</option>
              {admins.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.fullName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Action
            <select id="audit-action" className="cx-select" value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="">Toutes</option>
              {actions.map((item) => (
                <option key={item} value={item}>
                  {actionLabel(item)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Ressource
            <select id="audit-resource" className="cx-select" value={resource} onChange={(e) => setResource(e.target.value)}>
              <option value="">Toutes</option>
              {resources.map((item) => (
                <option key={item} value={item}>
                  {resourceLabel(item)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Du
            <input id="audit-from" className="cx-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            Au
            <input id="audit-to" className="cx-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <label>
            Recherche
            <input
              id="audit-q"
              className="cx-input"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nom, action, id…"
            />
          </label>
          <div className="cx-toolbar">
            <button type="submit" className="cx-btn cx-btn-fill">
              <Filter aria-hidden />
              Filtrer
            </button>
            <button type="button" className="cx-btn" onClick={resetFilters}>
              <RotateCcw aria-hidden />
              Réinitialiser
            </button>
          </div>
        </form>
      </section>

      <section className="cx-panel">
        <div className="cx-panel-head cx-ph cx-ph-plain">
          <span className="cx-phi cx-phi-tile">
            <ScrollText aria-hidden />
          </span>
          <div className="cx-ph-txt">
            <h2 className="cx-panel-title">Opérations</h2>
            <p className="cx-muted">
              Page {page} sur {pages}
            </p>
          </div>
        </div>

        {loading && logs.length === 0 ? (
          <SkeletonBlock rows={6} />
        ) : !loading && logs.length === 0 ? (
          <EmptyState title="Aucune entrée" description="Aucune entrée ne correspond à ces filtres." />
        ) : (
          <div className="cx-table-wrap">
            <table className="cx-data" style={{ minWidth: 860 }}>
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
                    <td className="cx-dim">{formatAuditDate(entry.createdAt)}</td>
                    <td>
                      {entry.adminId ? (
                        <Link to={`/administrateurs/${entry.adminId}`} className="cx-link-all" style={{ margin: 0 }}>
                          {entry.adminName}
                        </Link>
                      ) : (
                        entry.adminName
                      )}
                    </td>
                    <td>
                      <span className="cx-evt">{actionLabel(entry.action)}</span>
                    </td>
                    <td>{resourceLabel(entry.resource)}</td>
                    <td className="cx-dim">{entry.resourceId || '—'}</td>
                    <td style={{ maxWidth: 280, whiteSpace: 'normal', fontSize: '.84rem' }}>
                      {summarizeMetadata(entry.metadata)}
                    </td>
                    <td className="cx-dim">{entry.ip || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 ? (
          <div className="cx-pager">
            <span>
              Page {page} / {pages}
            </span>
            <div>
              <button type="button" className="cx-btn cx-btn-sm" disabled={page <= 1 || loading} onClick={() => void load(page - 1)}>
                Précédent
              </button>
              <button type="button" className="cx-btn cx-btn-sm" disabled={page >= pages || loading} onClick={() => void load(page + 1)}>
                Suivant
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </DirectionSection>
  )
}
