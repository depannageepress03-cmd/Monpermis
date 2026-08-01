import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarDays,
  Clock3,
  FileText,
  Phone,
  Plus,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Users,
  UserCheck,
} from 'lucide-react'
import { fetchAdmins, type AdminAccount } from '../api/admins'
import { StatusBadge } from '../components/StatusBadge'
import { getAdminToken, isAuthError } from '../context/AdminAuthContext'
import { roleLabel } from '../utils/roles'
import { Reveal, StatCard } from '../ui'

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
  if (!parts) return <span className="muted">—</span>
  const Icon = icon === 'created' ? CalendarDays : Clock3
  return (
    <span className="admins-date-cell">
      <Icon size={13} strokeWidth={2} className="admins-date-icon" aria-hidden />
      <span className="admins-date-lines">
        <span className="admins-date-day">{parts.date}</span>
        <span className="admins-date-time">{parts.time}</span>
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
    <div className="admin-page admins-page">
      <Reveal variant="blur" className="admins-hero">
        <span className="admins-hero-icon" aria-hidden>
          <ShieldCheck size={26} strokeWidth={2} />
        </span>
        <div className="admin-page-intro">
          <p className="admin-page-intro-label">Sécurité</p>
          <h2 className="admin-page-intro-title">Administrateurs</h2>
          <p className="admin-page-intro-text">
            Gestion des comptes : rôles, activation et journal d’activité. Réservé aux
            super-administrateurs.
          </p>
        </div>
        <svg
          className="admins-hero-art"
          viewBox="0 0 200 160"
          aria-hidden
          focusable="false"
        >
          <circle cx="140" cy="80" r="72" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 6" />
          <path
            d="M140 42c14 5 24 7 24 7v22c0 20-11 34-24 40-13-6-24-20-24-40V49s10-2 24-7Z"
            fill="currentColor"
            opacity="0.14"
          />
          <path
            d="M140 42c14 5 24 7 24 7v22c0 20-11 34-24 40-13-6-24-20-24-40V49s10-2 24-7Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          />
          <path
            d="M129 92l7 7 15-17"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="52" cy="52" r="13" fill="currentColor" opacity="0.18" />
          <circle cx="52" cy="52" r="13" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="34" cy="104" r="10" fill="currentColor" opacity="0.14" />
          <circle cx="34" cy="104" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
      </Reveal>

      <div className="admins-toolbar">
        <button
          type="button"
          className="ui-btn ui-btn-ghost"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw size={15} strokeWidth={2} />
          {loading ? 'Chargement…' : 'Actualiser'}
        </button>
        <Link to="/journal-audit" className="ui-btn ui-btn-ghost">
          <FileText size={15} strokeWidth={2} />
          Journal d’audit
        </Link>
        <Link to="/creer-admin" className="ui-btn ui-btn-primary admins-cta">
          <Plus size={17} strokeWidth={2.2} />
          Créer un admin
        </Link>
      </div>

      <section className="admin-section admins-table-card">
        <div className="admin-section-head">
          <h3 className="admin-section-label">
            Comptes ({admins.length}) — {activeCount} actif{activeCount > 1 ? 's' : ''}
            {superCount > 0 ? ` · ${superCount} superadmin${superCount > 1 ? 's' : ''}` : ''}
          </h3>
          {admins.length > 0 ? (
            <StatusBadge tone="success" withIcon={false}>
              {activationRate}% actifs
            </StatusBadge>
          ) : null}
        </div>
        <div className="admin-section-body" style={{ padding: 0 }}>
          {error ? (
            <p className="form-error" role="alert" style={{ margin: 16 }}>
              {error}
            </p>
          ) : null}

          <div className="admin-data-table-wrap">
            <table className="admin-data-table admins-table" style={{ minWidth: 640 }}>
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
                    <td data-label="Administrateur">
                      <div className="admins-identity">
                        <span className="sidebar-profile-avatar admins-avatar">
                          {initials(admin.fullName)}
                        </span>
                        <strong>{admin.fullName}</strong>
                      </div>
                    </td>
                    <td data-label="Téléphone">
                      <span className="admins-phone-cell">
                        <Phone size={13} strokeWidth={2} aria-hidden />
                        {admin.phone}
                      </span>
                    </td>
                    <td data-label="Rôle">
                      <StatusBadge
                        tone={admin.role === 'superadmin' ? 'warning' : 'neutral'}
                        withIcon={false}
                      >
                        {roleLabel(admin.role)}
                      </StatusBadge>
                    </td>
                    <td data-label="Créé le">
                      <DateCell value={admin.createdAt} icon="created" />
                    </td>
                    <td data-label="Dernière connexion">
                      <DateCell value={admin.lastLoginAt} icon="login" />
                    </td>
                    <td data-label="Statut">
                      <StatusBadge tone={admin.isActive ? 'success' : 'danger'} withIcon={false}>
                        <span className="admins-status-dot" aria-hidden />
                        {admin.isActive ? 'Actif' : 'Inactif'}
                      </StatusBadge>
                    </td>
                    <td data-label="Actions">
                      <Link
                        to={`/administrateurs/${admin.id}`}
                        className="ui-btn ui-btn-ghost admins-manage-btn"
                      >
                        <Settings2 size={13} strokeWidth={2} />
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

      <div className="admins-kpi-grid">
        <StatCard
          label="Administrateurs"
          value={admins.length}
          icon={<Users size={16} strokeWidth={2} />}
          meta="Total des comptes"
        />
        <StatCard
          label="Administrateurs actifs"
          value={activeCount}
          icon={<UserCheck size={16} strokeWidth={2} />}
          tone="success"
          meta="Comptes activés"
        />
        <StatCard
          label="Taux d’activation"
          value={`${activationRate}%`}
          icon={<ShieldCheck size={16} strokeWidth={2} />}
          tone="success"
          meta="Comptes actifs"
        />
        <StatCard
          label="Dernière activité"
          value={lastActivityLabel}
          icon={<Clock3 size={16} strokeWidth={2} />}
          meta="Connexion la plus récente"
        />
      </div>
    </div>
  )
}
