import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { KeyRound, RefreshCw, ScrollText } from 'lucide-react'
import { fetchAdminDetail, updateAdmin, type AdminAccount, type AuditLogEntry } from '../api/admins'
import { AdminSectionHeader } from '../components/AdminSectionHeader'
import { StatusBadge } from '../components/StatusBadge'
import { getAdminToken, isAuthError } from '../context/AdminAuthContext'
import { actionLabel, formatAuditDate, resourceLabel, summarizeMetadata } from '../utils/auditLabels'
import { roleLabel } from '../utils/roles'
import { validatePassword } from '../utils/validation'

export function AdminDetailPage() {
  const { adminId = '' } = useParams()
  const [admin, setAdmin] = useState<AdminAccount | null>(null)
  const [actions, setActions] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [role, setRole] = useState<'admin' | 'superadmin'>('admin')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

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
      setRole(data.admin.role === 'superadmin' ? 'superadmin' : 'admin')
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

  const applyUpdate = async (
    payload: Parameters<typeof updateAdmin>[2],
    okMessage: string,
  ): Promise<boolean> => {
    const token = getAdminToken()
    if (!token || !adminId) {
      setError('Session expirée. Reconnectez-vous.')
      return false
    }
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const data = await updateAdmin(token, adminId, payload)
      setAdmin(data.admin)
      setRole(data.admin.role === 'superadmin' ? 'superadmin' : 'admin')
      setSuccess(okMessage)
      void load()
      return true
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Mise à jour impossible')
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = () => {
    if (!admin) return
    const next = !admin.isActive
    void applyUpdate(
      { isActive: next },
      next ? 'Compte activé.' : 'Compte désactivé.',
    )
  }

  const handleRoleSave = (e: FormEvent) => {
    e.preventDefault()
    if (!admin || role === admin.role) return
    void applyUpdate({ role }, `Rôle mis à jour : ${roleLabel(role)}.`)
  }

  const handlePasswordSave = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    const pwdError = validatePassword(password)
    if (pwdError) {
      setError(pwdError)
      return
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }
    const ok = await applyUpdate({ password }, 'Mot de passe mis à jour.')
    if (ok) {
      setPassword('')
      setConfirmPassword('')
    }
  }

  return (
    <div className="admin-page">
      <AdminSectionHeader
        backTo="/administrateurs"
        backLabel="Tous les administrateurs"
        kicker="Gestion"
        title={admin?.fullName || 'Administrateur'}
        subtitle="Modifier le rôle, activer le compte, réinitialiser le mot de passe, et consulter l’activité."
      />

      {admin ? (
        <div className="users-toolbar-figma" style={{ marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
          <StatusBadge tone={admin.isActive ? 'success' : 'danger'}>
            {admin.isActive ? 'Actif' : 'Inactif'}
          </StatusBadge>
          <StatusBadge tone={admin.role === 'superadmin' ? 'warning' : 'neutral'} withIcon={false}>
            {roleLabel(admin.role)}
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
      {success ? (
        <p className="form-success" role="status">
          {success}
        </p>
      ) : null}

      {admin ? (
        <div
          style={{
            display: 'grid',
            gap: 16,
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            marginBottom: 20,
          }}
        >
          <section className="admin-section">
            <div className="admin-section-head">
              <h3 className="admin-section-label">Statut du compte</h3>
            </div>
            <div className="admin-section-body">
              <p className="muted" style={{ marginBottom: 12 }}>
                Un compte inactif ne peut plus se connecter.
              </p>
              <button
                type="button"
                className={admin.isActive ? 'dash-filter-btn' : 'btn-primary btn-primary-inline'}
                disabled={saving}
                onClick={handleToggleActive}
              >
                {admin.isActive ? 'Désactiver' : 'Activer'}
              </button>
            </div>
          </section>

          <section className="admin-section">
            <div className="admin-section-head">
              <h3 className="admin-section-label">Rôle</h3>
            </div>
            <div className="admin-section-body">
              <form onSubmit={handleRoleSave}>
                <label htmlFor="admin-role" className="muted" style={{ display: 'block', marginBottom: 8 }}>
                  Superadmin : gestion des admins, audit, finances.
                  <br />
                  Admin : opérations courantes uniquement.
                </label>
                <select
                  id="admin-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'admin' | 'superadmin')}
                  style={{ display: 'block', width: '100%', marginBottom: 12, padding: '8px 10px' }}
                >
                  <option value="admin">Admin</option>
                  <option value="superadmin">Superadmin</option>
                </select>
                <button
                  type="submit"
                  className="btn-primary btn-primary-inline"
                  disabled={saving || role === admin.role}
                >
                  Enregistrer le rôle
                </button>
              </form>
            </div>
          </section>

          <section className="admin-section">
            <div className="admin-section-head">
              <h3 className="admin-section-label">Mot de passe</h3>
            </div>
            <div className="admin-section-body">
              <form onSubmit={handlePasswordSave} className="create-admin-form">
                <div className="create-admin-field" style={{ marginBottom: 10 }}>
                  <label htmlFor="new-password">
                    <KeyRound size={14} />
                    Nouveau mot de passe
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
                <div className="create-admin-field" style={{ marginBottom: 12 }}>
                  <label htmlFor="confirm-new-password">
                    <KeyRound size={14} />
                    Confirmer
                  </label>
                  <input
                    id="confirm-new-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
                <button type="submit" className="btn-primary btn-primary-inline" disabled={saving}>
                  Définir le mot de passe
                </button>
              </form>
            </div>
          </section>
        </div>
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
