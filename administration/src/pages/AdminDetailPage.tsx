import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, KeyRound, RefreshCw, ScrollText, ShieldCheck, ToggleLeft } from 'lucide-react'
import { fetchAdminDetail, updateAdmin, type AdminAccount, type AuditLogEntry } from '../api/admins'
import { DirectionSection } from '../components/model/DirectionSection'
import { EmptyState, SkeletonBlock } from '../ui'
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
    <DirectionSection
      kicker="Gestion"
      title={admin?.fullName || 'Administrateur'}
      subtitle="Modifier le rôle, activer le compte, réinitialiser le mot de passe, et consulter l’activité."
      actions={
        <>
          <Link to="/administrateurs" className="cx-refresh">
            <ArrowLeft aria-hidden />
            Tous les administrateurs
          </Link>
          {admin ? (
            <Link to={`/journal-audit?adminId=${admin.id}`} className="cx-refresh">
              <ScrollText aria-hidden />
              Voir dans le journal
            </Link>
          ) : null}
          <button type="button" className="cx-refresh" onClick={() => void load()} disabled={loading}>
            <RefreshCw aria-hidden />
            Actualiser
          </button>
        </>
      }
    >
      {error ? <p className="cx-note cx-note-err" role="alert">{error}</p> : null}
      {success ? <p className="cx-note cx-note-ok" role="status">{success}</p> : null}
      {loading && !admin ? <SkeletonBlock rows={5} /> : null}

      {admin ? (
        <>
          <section className="cx-panel">
            <div className="cx-toolbar">
              <span className={`cx-chip ${admin.isActive ? 'cx-green' : 'cx-red'}`}>{admin.isActive ? 'Actif' : 'Inactif'}</span>
              <span className={`cx-chip ${admin.role === 'superadmin' ? 'cx-amber' : ''}`.trim()}>{roleLabel(admin.role)}</span>
              <span className="cx-dim">{admin.phone}</span>
              <span className="cx-dim">Créé le {formatAuditDate(admin.createdAt)}</span>
              <span className="cx-dim">Dernière connexion : {formatAuditDate(admin.lastLoginAt)}</span>
            </div>
          </section>

          <div className="cx-grid-3">
            <section className="cx-panel">
              <div className="cx-panel-head cx-ph cx-ph-plain">
                <span className="cx-phi cx-phi-tile">
                  <ToggleLeft aria-hidden />
                </span>
                <div className="cx-ph-txt">
                  <h2 className="cx-panel-title">Statut du compte</h2>
                  <p className="cx-muted">Un compte inactif ne peut plus se connecter.</p>
                </div>
              </div>
              <button
                type="button"
                className={`cx-btn${admin.isActive ? '' : ' cx-btn-fill'}`}
                disabled={saving}
                onClick={handleToggleActive}
              >
                {admin.isActive ? 'Désactiver le compte' : 'Activer le compte'}
              </button>
            </section>

            <section className="cx-panel">
              <div className="cx-panel-head cx-ph cx-ph-plain">
                <span className="cx-phi cx-phi-tile">
                  <ShieldCheck aria-hidden />
                </span>
                <div className="cx-ph-txt">
                  <h2 className="cx-panel-title">Rôle</h2>
                  <p className="cx-muted">Superadmin : admins, audit, finances. Admin : opérations courantes.</p>
                </div>
              </div>
              <form onSubmit={handleRoleSave} className="cx-form">
                <select
                  id="admin-role"
                  className="cx-select"
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'admin' | 'superadmin')}
                  aria-label="Rôle"
                >
                  <option value="admin">Admin</option>
                  <option value="superadmin">Superadmin</option>
                </select>
                <button type="submit" className="cx-btn cx-btn-fill" disabled={saving || role === admin.role}>
                  Enregistrer le rôle
                </button>
              </form>
            </section>

            <section className="cx-panel">
              <div className="cx-panel-head cx-ph cx-ph-plain">
                <span className="cx-phi cx-phi-tile">
                  <KeyRound aria-hidden />
                </span>
                <div className="cx-ph-txt">
                  <h2 className="cx-panel-title">Mot de passe</h2>
                  <p className="cx-muted">Définir un nouveau mot de passe pour ce compte.</p>
                </div>
              </div>
              <form onSubmit={handlePasswordSave} className="cx-form">
                <div className="cx-fld">
                  <label htmlFor="new-password">
                    <KeyRound aria-hidden />
                    Nouveau mot de passe
                  </label>
                  <input
                    id="new-password"
                    className="cx-input"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
                <div className="cx-fld">
                  <label htmlFor="confirm-new-password">
                    <KeyRound aria-hidden />
                    Confirmer
                  </label>
                  <input
                    id="confirm-new-password"
                    className="cx-input"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
                <button type="submit" className="cx-btn cx-btn-fill" disabled={saving}>
                  Définir le mot de passe
                </button>
              </form>
            </section>
          </div>
        </>
      ) : null}

      <section className="cx-panel">
        <div className="cx-panel-head cx-ph cx-ph-plain">
          <span className="cx-phi cx-phi-tile">
            <ScrollText aria-hidden />
          </span>
          <div className="cx-ph-txt">
            <h2 className="cx-panel-title">Actions récentes ({actions.length})</h2>
            <p className="cx-muted">Dernières opérations effectuées par ce compte</p>
          </div>
        </div>
        {loading && actions.length === 0 ? (
          <SkeletonBlock rows={4} />
        ) : actions.length === 0 ? (
          <EmptyState title="Aucune action" description="Aucune action enregistrée pour cet administrateur." />
        ) : (
          <div className="cx-table-wrap">
            <table className="cx-data" style={{ minWidth: 720 }}>
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
                {actions.map((entry) => (
                  <tr key={entry.id}>
                    <td className="cx-dim">{formatAuditDate(entry.createdAt)}</td>
                    <td>
                      <span className="cx-evt">{actionLabel(entry.action)}</span>
                    </td>
                    <td>{resourceLabel(entry.resource)}</td>
                    <td className="cx-dim">{entry.resourceId || '—'}</td>
                    <td style={{ maxWidth: 280, whiteSpace: 'normal', fontSize: '.84rem' }}>{summarizeMetadata(entry.metadata)}</td>
                    <td className="cx-dim">{entry.ip || '—'}</td>
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
