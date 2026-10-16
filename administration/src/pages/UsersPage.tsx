import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, PauseCircle, RefreshCw, Search, Trash2, UserPlus, Users } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import {
  createUser,
  deleteUser,
  fetchUsers,
  updateUser,
  type AppUser,
} from '../api/users'
import { PublishSwitch } from '../components/PublishSwitch'
import { PageSection } from '../components/model/PageSection'
import { nf } from '../components/model/ModelCharts'
import { getAdminToken, isAuthError } from '../context/AdminAuthContext'
import { Drawer, EmptyState, SkeletonBlock } from '../ui'
import { normalizePhone, PHONE_PLACEHOLDER, isValidEmailFormat, validatePassword } from '../utils/validation'

function formatDate(value?: string) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

function userInitials(user: AppUser) {
  return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || '?'
}

export function UsersPage() {
  const [searchParams] = useSearchParams()
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [query, setQuery] = useState(() => searchParams.get('q') || '')

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    const q = searchParams.get('q')
    if (q != null) setQuery(q)
  }, [searchParams])

  const loadUsers = useCallback(async () => {
    const token = getAdminToken()
    if (!token) {
      setError('Session expirée. Reconnectez-vous.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const { users: data } = await fetchUsers(token)
      setUsers(data)
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  const filteredUsers = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return users
    return users.filter((user) => {
      const haystack = [user.firstName, user.lastName, user.email, user.phone, user.authProvider]
        .join(' ')
        .toLowerCase()
      return haystack.includes(needle)
    })
  }, [users, query])

  const activeCount = users.filter((user) => user.isActive).length
  const suspendedCount = users.length - activeCount

  const resetCreateForm = () => {
    setFirstName('')
    setLastName('')
    setEmail('')
    setPhone('')
    setPassword('')
  }

  const closeCreateDrawer = () => {
    setCreateOpen(false)
    resetCreateForm()
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (firstName.trim().length < 2 || lastName.trim().length < 2) {
      setError('Prénom et nom requis (2 caractères minimum)')
      return
    }
    if (!isValidEmailFormat(email)) {
      setError('Email invalide')
      return
    }
    const passwordError = validatePassword(password)
    if (passwordError) {
      setError(passwordError)
      return
    }

    const token = getAdminToken()
    if (!token) {
      setError('Session expirée. Reconnectez-vous.')
      return
    }

    setCreating(true)
    try {
      const { user } = await createUser(token, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: normalizePhone(phone),
        password,
      })
      setUsers((current) => [user, ...current])
      setSuccess(`Compte « ${user.firstName} ${user.lastName} » créé.`)
      closeCreateDrawer()
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Création impossible')
    } finally {
      setCreating(false)
    }
  }

  const handleSetActive = async (user: AppUser, nextActive: boolean) => {
    if (user.isActive === nextActive) return
    const token = getAdminToken()
    if (!token) {
      setError('Session expirée. Reconnectez-vous.')
      return
    }

    setBusyId(user.id)
    setError(null)
    setSuccess(null)
    try {
      const { user: updated } = await updateUser(token, user.id, { isActive: nextActive })
      setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      setSuccess(
        nextActive
          ? `${updated.firstName} ${updated.lastName} a été réactivé.`
          : `${updated.firstName} ${updated.lastName} a été suspendu.`,
      )
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Mise à jour impossible')
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (user: AppUser) => {
    const confirmed = window.confirm(
      `Supprimer définitivement le compte de ${user.firstName} ${user.lastName} ?`,
    )
    if (!confirmed) return

    const token = getAdminToken()
    if (!token) {
      setError('Session expirée. Reconnectez-vous.')
      return
    }

    setBusyId(user.id)
    setError(null)
    setSuccess(null)
    try {
      await deleteUser(token, user.id)
      setUsers((current) => current.filter((item) => item.id !== user.id))
      setSuccess(`Compte de ${user.firstName} ${user.lastName} supprimé.`)
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Suppression impossible')
    } finally {
      setBusyId(null)
    }
  }

  const activePct = users.length ? Math.round((activeCount / users.length) * 100) : 0

  return (
    <PageSection
      kicker="Gestion des comptes"
      title="Apprenants"
      subtitle="Comptes des apprenants inscrits : recherche, suspension, réactivation et création."
      actions={
        <>
          <button type="button" className="cx-refresh" onClick={() => void loadUsers()} disabled={loading}>
            <RefreshCw aria-hidden />
            Actualiser
          </button>
          <button type="button" className="cx-btn cx-btn-fill" onClick={() => setCreateOpen(true)}>
            <UserPlus aria-hidden />
            Nouvel apprenant
          </button>
        </>
      }
    >
      {error ? <p className="cx-note cx-note-err" role="alert">{error}</p> : null}
      {success ? <p className="cx-note cx-note-ok" role="status">{success}</p> : null}

      <div className="cx-kc-grid cx-kc-grid-3" aria-label="Indicateurs apprenants">
        <div className="cx-kc">
          <span className="cx-kc-ico cx-kc-blue">
            <Users aria-hidden />
          </span>
          <div className="cx-kc-body">
            <span className="cx-kc-label">Inscrits</span>
            <span className="cx-kc-value">{nf(users.length)}</span>
            <span className="cx-kc-sub">tous statuts confondus</span>
          </div>
        </div>
        <div className="cx-kc">
          <span className="cx-kc-ico cx-kc-green">
            <CheckCircle2 aria-hidden />
          </span>
          <div className="cx-kc-body">
            <span className="cx-kc-label">Actifs</span>
            <span className="cx-kc-value">{nf(activeCount)}</span>
            <span className="cx-kc-bar">
              <i style={{ width: `${activePct}%` }} />
            </span>
          </div>
        </div>
        <div className="cx-kc">
          <span className="cx-kc-ico cx-kc-gold">
            <PauseCircle aria-hidden />
          </span>
          <div className="cx-kc-body">
            <span className="cx-kc-label">Suspendus</span>
            <span className="cx-kc-value">{nf(suspendedCount)}</span>
            <span className="cx-kc-sub">nécessitent une révision</span>
          </div>
        </div>
      </div>

      <section className="cx-panel">
        <div className="cx-toolbar" style={{ marginBottom: '1rem' }}>
          <label className="cx-search" htmlFor="users-search">
            <Search aria-hidden />
            <input
              id="users-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un apprenant (nom, e-mail, téléphone)…"
            />
          </label>
          <span className="cx-chip">
            {filteredUsers.length} / {users.length} apprenant{users.length > 1 ? 's' : ''}
          </span>
        </div>

        {loading && users.length === 0 ? (
          <SkeletonBlock rows={6} />
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            title={query.trim() ? 'Aucun résultat' : 'Aucun apprenant'}
            description={
              query.trim()
                ? 'Aucun apprenant ne correspond à votre recherche.'
                : 'Créez le premier compte apprenant pour commencer.'
            }
            actionLabel={query.trim() ? undefined : 'Nouvel apprenant'}
            onAction={query.trim() ? undefined : () => setCreateOpen(true)}
          />
        ) : (
          <div className="cx-table-wrap">
            <table className="cx-data">
              <thead>
                <tr>
                  <th>Apprenant</th>
                  <th>Téléphone</th>
                  <th>Inscription</th>
                  <th>Statut</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const busy = busyId === user.id
                  return (
                    <tr key={user.id} className={!user.isActive ? 'cx-muted-row' : undefined}>
                      <td>
                        <div className="cx-person">
                          <span className={`cx-avatar${user.isActive ? '' : ' cx-bad'}`}>{userInitials(user)}</span>
                          <div>
                            <strong>
                              {user.firstName} {user.lastName}
                            </strong>
                            <small>{user.email || 'Apprenant'}</small>
                          </div>
                        </div>
                      </td>
                      <td className="cx-dim">{user.phone || '—'}</td>
                      <td className="cx-dim">{formatDate(user.createdAt)}</td>
                      <td>
                        <div className="cx-status-cell">
                          <span className={`cx-chip ${user.isActive ? 'cx-green' : 'cx-red'}`}>
                            {user.isActive ? 'Actif' : 'Suspendu'}
                          </span>
                          <PublishSwitch
                            checked={user.isActive}
                            onChange={(next) => void handleSetActive(user, next)}
                            disabled={busy}
                            label={user.isActive ? 'Actif' : 'Suspendu'}
                          />
                        </div>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="cx-btn cx-btn-icon cx-btn-danger"
                          disabled={busy}
                          onClick={() => void handleDelete(user)}
                          aria-label={`Supprimer ${user.firstName} ${user.lastName}`}
                          title="Supprimer le compte"
                        >
                          <Trash2 aria-hidden />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Drawer
        open={createOpen}
        title="Créer un compte apprenant"
        subtitle="Le compte sera actif immédiatement après création."
        onClose={closeCreateDrawer}
        footer={
          <>
            <button type="button" className="cx-btn" onClick={closeCreateDrawer}>
              Annuler
            </button>
            <button type="submit" form="create-user-form" className="cx-btn cx-btn-fill" disabled={creating}>
              <UserPlus aria-hidden />
              {creating ? 'Création…' : 'Créer le compte'}
            </button>
          </>
        }
      >
        <form id="create-user-form" onSubmit={handleCreate} className="cx-form">
          <div className="cx-form-grid">
            <div className="cx-fld">
              <label htmlFor="user-firstName">Prénom</label>
              <input id="user-firstName" className="cx-input" type="text" required minLength={2} value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="ex. Adjobi" />
            </div>
            <div className="cx-fld">
              <label htmlFor="user-lastName">Nom</label>
              <input id="user-lastName" className="cx-input" type="text" required minLength={2} value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="ex. Kossou" />
            </div>
          </div>
          <div className="cx-fld">
            <label htmlFor="user-email">E-mail</label>
            <input id="user-email" className="cx-input" type="text" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="exemple@gmail.com" />
          </div>
          <div className="cx-fld">
            <label htmlFor="user-phone">Téléphone</label>
            <input id="user-phone" className="cx-input" type="tel" inputMode="numeric" value={phone} onChange={(e) => setPhone(normalizePhone(e.target.value))} placeholder={PHONE_PLACEHOLDER} />
          </div>
          <div className="cx-fld">
            <label htmlFor="user-password">Mot de passe</label>
            <input id="user-password" className="cx-input" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
        </form>
      </Drawer>
    </PageSection>
  )
}
