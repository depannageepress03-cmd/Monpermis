import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, RefreshCw, ScrollText, Shield, UserPlus } from 'lucide-react'
import { fetchAdmins, type AdminAccount } from '../api/admins'
import { StatusBadge } from '../components/StatusBadge'
import { getAdminToken, isAuthError } from '../context/AdminAuthContext'
import { roleLabel } from '../utils/roles'

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return (parts[0] || 'AD').slice(0, 2).toUpperCase()
}

export function AdminsPage() {
  const [admins, setAdmins] = useState<AdminAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const token = getAdminToken()
    if (!token) {
      setError('Session expirée. Reconnectez-vous.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAdmins(token)
      setAdmins(data.admins)
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const activeCount = useMemo(() => admins.filter((a) => a.isActive).length, [admins])
  const superCount = useMemo(
    () => admins.filter((a) => a.role === 'superadmin').length,
    [admins],
  )

  return (
    <div className="admin-page">
      <div className="admin-page-intro">
        <p className="admin-page-intro-label">Sécurité</p>
        <h2 className="admin-page-intro-title">Administrateurs</h2>
        <p className="admin-page-intro-text">
          Gestion des comptes : rôles, activation et journal d’activité. Réservé aux
          super-administrateurs.
        </p>
      </div>

      <div className="users-toolbar-figma" style={{ marginBottom: 16, gap: 10, flexWrap: 'wrap' }}>
        <button type="button" className="dash-filter-btn" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={12} strokeWidth={2} />
          {loading ? 'Chargement…' : 'Actualiser'}
        </button>
        <Link to="/journal-audit" className="dash-filter-btn" style={{ textDecoration: 'none' }}>
          <ScrollText size={12} strokeWidth={2} />
          Journal d’audit
        </Link>
        <Link to="/creer-admin" className="ui-btn ui-btn-primary" style={{ textDecoration: 'none' }}>
          <UserPlus size={16} />
          Créer un admin
        </Link>
      </div>

      <section className="admin-section">
        <div className="admin-section-head">
          <h3 className="admin-section-label">
            <Shield size={14} style={{ display: 'inline', marginRight: 6 }} />
            Comptes ({admins.length}) — {activeCount} actif{activeCount > 1 ? 's' : ''}
            {superCount > 0 ? ` · ${superCount} superadmin${superCount > 1 ? 's' : ''}` : ''}
          </h3>
        </div>
        <div className="admin-section-body" style={{ padding: 0 }}>
          {error ? (
            <p className="form-error" role="alert" style={{ margin: 16 }}>
              {error}
            </p>
          ) : null}

          <div className="admin-data-table-wrap">
            <table className="admin-data-table" style={{ minWidth: 640 }}>
              <thead>
                <tr>
                  <th>Administrateur</th>
                  <th>Téléphone</th>
                  <th>Rôle</th>
                  <th>Créé le</th>
                  <th>Dernière connexion</th>
                  <th>Statut</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {loading && admins.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="muted">
                      Chargement…
                    </td>
                  </tr>
                ) : null}
                {!loading && admins.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="muted">
                      Aucun administrateur
                    </td>
                  </tr>
                ) : null}
                {admins.map((admin) => (
                  <tr key={admin.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="sidebar-profile-avatar" style={{ width: 32, height: 32, fontSize: 11 }}>
                          {initials(admin.fullName)}
                        </span>
                        <strong>{admin.fullName}</strong>
                      </div>
                    </td>
                    <td>{admin.phone}</td>
                    <td>
                      <StatusBadge
                        tone={admin.role === 'superadmin' ? 'warning' : 'neutral'}
                        withIcon={false}
                      >
                        {roleLabel(admin.role)}
                      </StatusBadge>
                    </td>
                    <td>{formatDateTime(admin.createdAt)}</td>
                    <td>{formatDateTime(admin.lastLoginAt)}</td>
                    <td>
                      <StatusBadge tone={admin.isActive ? 'success' : 'danger'}>
                        {admin.isActive ? 'Actif' : 'Inactif'}
                      </StatusBadge>
                    </td>
                    <td>
                      <Link
                        to={`/administrateurs/${admin.id}`}
                        className="dash-filter-btn"
                        style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}
                      >
                        <ClipboardList size={12} />
                        Gérer
                      </Link>
                    </td>
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
