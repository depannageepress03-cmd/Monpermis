import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarDays,
  Clock3,
  Phone,
  Plus,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Users,
  UserCheck,
} from 'lucide-react'
import { fetchAdmins, type AdminAccount } from '../api/admins'
import { DirectionSection } from '../components/model/DirectionSection'
import { getAdminToken, isAuthError } from '../context/AdminAuthContext'
import { roleLabel } from '../utils/roles'
import { EmptyState, SkeletonBlock } from '../ui'

function formatDateParts(value?: string | null) {
  if (!value) return null
  try {
    const d = new Date(value)
    return {
      date: d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    }
  } catch {
    return null
  }
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return (parts[0] || 'AD').slice(0, 2).toUpperCase()
}

function DateCell({ value, icon }: { value?: string | null; icon: 'created' | 'login' }) {
  const parts = formatDateParts(value)
  if (!parts) return <span className="cx-dim">—</span>
  const Icon = icon === 'created' ? CalendarDays : Clock3
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem' }}>
      <Icon className="cx-ico-inline" aria-hidden />
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
        <span>{parts.date}</span>
        <small style={{ color: 'var(--ink-soft)' }}>{parts.time}</small>
      </span>
    </span>
  )
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
  const activationRate = admins.length ? Math.round((activeCount / admins.length) * 100) : 0
  const lastActivityLabel = useMemo(() => {
    const dates = admins.map((a) => a.lastLoginAt).filter((v): v is string => Boolean(v))
    if (dates.length === 0) return '—'
    const latest = dates.reduce((max, d) => (new Date(d) > new Date(max) ? d : max))
    return new Date(latest).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }, [admins])

  return (
    <DirectionSection
      kicker="Sécurité"
      title="Administrateurs"
      subtitle="Gestion des comptes : rôles, activation et journal d’activité. Réservé aux super-administrateurs."
      actions={
        <>
          <button type="button" className="cx-refresh" onClick={() => void load()} disabled={loading}>
            <RefreshCw aria-hidden />
            {loading ? 'Chargement…' : 'Actualiser'}
          </button>
          <Link to="/creer-admin" className="cx-btn cx-btn-fill">
            <Plus aria-hidden />
            Créer un admin
          </Link>
        </>
      }
    >
      {error ? <p className="cx-note cx-note-err" role="alert">{error}</p> : null}

      <div className="cx-kc-grid">
        <div className="cx-kc">
          <span className="cx-kc-ico cx-kc-blue">
            <Users aria-hidden />
          </span>
          <div className="cx-kc-body">
            <span className="cx-kc-label">Administrateurs</span>
            <span className="cx-kc-value">{admins.length}</span>
            <span className="cx-kc-sub">
              {superCount} superadmin{superCount > 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <div className="cx-kc">
          <span className="cx-kc-ico cx-kc-green">
            <UserCheck aria-hidden />
          </span>
          <div className="cx-kc-body">
            <span className="cx-kc-label">Actifs</span>
            <span className="cx-kc-value">{activeCount}</span>
            <span className="cx-kc-sub">comptes activés</span>
          </div>
        </div>
        <div className="cx-kc">
          <span className="cx-kc-ico cx-kc-sky">
            <ShieldCheck aria-hidden />
          </span>
          <div className="cx-kc-body">
            <span className="cx-kc-label">Taux d’activation</span>
            <span className="cx-kc-value">{activationRate}%</span>
            <span className="cx-kc-bar">
              <i style={{ width: `${activationRate}%` }} />
            </span>
          </div>
        </div>
        <div className="cx-kc">
          <span className="cx-kc-ico cx-kc-gold">
            <Clock3 aria-hidden />
          </span>
          <div className="cx-kc-body">
            <span className="cx-kc-label">Dernière activité</span>
            <span className="cx-kc-value" style={{ fontSize: '1.05rem' }}>{lastActivityLabel}</span>
            <span className="cx-kc-sub">connexion la plus récente</span>
          </div>
        </div>
      </div>

      <section className="cx-panel">
        <div className="cx-panel-head cx-ph cx-ph-plain">
          <span className="cx-phi cx-phi-tile">
            <ShieldCheck aria-hidden />
          </span>
          <div className="cx-ph-txt">
            <h2 className="cx-panel-title">Comptes ({admins.length})</h2>
            <p className="cx-muted">
              {activeCount} actif{activeCount > 1 ? 's' : ''}
              {superCount > 0 ? ` · ${superCount} superadmin${superCount > 1 ? 's' : ''}` : ''}
            </p>
          </div>
        </div>

        {loading && admins.length === 0 ? (
          <SkeletonBlock rows={4} />
        ) : admins.length === 0 ? (
          <EmptyState title="Aucun administrateur" description="Créez le premier compte administrateur." />
        ) : (
          <div className="cx-table-wrap">
            <table className="cx-data" style={{ minWidth: 640 }}>
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
                {admins.map((admin) => (
                  <tr key={admin.id}>
                    <td>
                      <div className="cx-person">
                        <span className="cx-avatar">{initials(admin.fullName)}</span>
                        <div>
                          <strong>{admin.fullName}</strong>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="cx-dim">
                        <Phone className="cx-ico-inline" aria-hidden />
                        {admin.phone}
                      </span>
                    </td>
                    <td>
                      <span className={`cx-chip ${admin.role === 'superadmin' ? 'cx-amber' : ''}`.trim()}>
                        {roleLabel(admin.role)}
                      </span>
                    </td>
                    <td>
                      <DateCell value={admin.createdAt} icon="created" />
                    </td>
                    <td>
                      <DateCell value={admin.lastLoginAt} icon="login" />
                    </td>
                    <td>
                      <span className={`cx-chip ${admin.isActive ? 'cx-green' : 'cx-red'}`}>
                        {admin.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td>
                      <Link to={`/administrateurs/${admin.id}`} className="cx-btn cx-btn-sm">
                        <Settings2 aria-hidden />
                        Gérer
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </DirectionSection>
  )
}
