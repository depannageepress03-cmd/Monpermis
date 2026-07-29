import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { RefreshCw, ScrollText } from 'lucide-react'
import { fetchAdminDetail, type AdminAccount, type AuditLogEntry } from '../api/admins'
import { AdminSectionHeader } from '../components/AdminSectionHeader'
import { StatusBadge } from '../components/StatusBadge'
import { getAdminToken, isAuthError } from '../context/AdminAuthContext'
import { actionLabel, formatAuditDate, resourceLabel, summarizeMetadata } from '../utils/auditLabels'

export function AdminDetailPage() {
  const { adminId = '' } = useParams()
  const [admin, setAdmin] = useState<AdminAccount | null>(null)
  const [actions, setActions] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const token = getAdminToken()
    if (!token || !adminId) {
      setError('Session expirée ou administrateur invalide.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAdminDetail(token, adminId, 80)
      setAdmin(data.admin)
      setActions(data.recentActions)
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [adminId])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="admin-page">
      <AdminSectionHeader
        backTo="/administrateurs"
        backLabel="Tous les administrateurs"
        kicker="Traçabilité"
        title={admin?.fullName || 'Activité admin'}
        subtitle="Historique des opérations réalisées par ce compte."
      />

      {admin ? (
        <div className="users-toolbar-figma" style={{ marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
          <StatusBadge tone={admin.isActive ? 'success' : 'danger'}>
            {admin.isActive ? 'Actif' : 'Inactif'}
          </StatusBadge>
          <span className="muted">{admin.phone}</span>
          <span className="muted">Créé le {formatAuditDate(admin.createdAt)}</span>
          <span className="muted">Dernière connexion : {formatAuditDate(admin.lastLoginAt)}</span>
          <button type="button" className="dash-filter-btn" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={12} />
            Actualiser
          </button>
          <Link
            to={`/journal-audit?adminId=${admin.id}`}
            className="dash-filter-btn"
            style={{ textDecoration: 'none' }}
          >
            <ScrollText size={12} />
            Voir dans le journal
          </Link>
        </div>
      ) : null}

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <section className="admin-section">
        <div className="admin-section-head">
          <h3 className="admin-section-label">Actions récentes ({actions.length})</h3>
        </div>
        <div className="admin-section-body" style={{ padding: 0 }}>
          <div className="admin-data-table-wrap">
            <table className="admin-data-table" style={{ minWidth: 720 }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Action</th>
                  <th>Ressource</th>
                  <th>Identifiant</th>
                  <th>Détails</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {loading && actions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="muted">
                      Chargement…
                    </td>
                  </tr>
                ) : null}
                {!loading && actions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="muted">
                      Aucune action enregistrée pour cet administrateur
                    </td>
                  </tr>
                ) : null}
                {actions.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatAuditDate(entry.createdAt)}</td>
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
        </div>
      </section>
    </div>
  )
}
