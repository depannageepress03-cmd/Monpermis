import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Filter, RefreshCw, Search, Trash2, UserPlus } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import {
  createUser,
  deleteUser,
  fetchUsers,
  updateUser,
  type AppUser,
} from '../api/users'
import { PublishSwitch } from '../components/PublishSwitch'
import { StatusBadge } from '../components/StatusBadge'
import { getAdminToken, isAuthError } from '../context/AdminAuthContext'
import { Button, Drawer, EmptyState, SkeletonBlock } from '../ui'
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

  return (
    <div className="admin-page">
      <header className="admin-module-header">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <p className="admin-module-kicker">Gestion des comptes</p>
            <h1 className="admin-module-title">Utilisateurs</h1>
          </div>
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            <UserPlus size={14} strokeWidth={2} />
            Nouvel apprenant
          </Button>
        </div>
      </header>

      <section className="users-kpi-row" aria-label="Indicateurs utilisateurs">
        <div className="users-kpi is-muted">
          <span className="users-kpi-dot" />
          <div>
            <p className="users-kpi-label">Inscrits total</p>
            <p className="users-kpi-value">{users.length}</p>
            <p className="users-kpi-sub">Tous statuts</p>
          </div>
        </div>
        <div className="users-kpi is-success">
          <span className="users-kpi-dot" />
          <div>
            <p className="users-kpi-label">Actifs</p>
            <p className="users-kpi-value">{activeCount}</p>
            <p className="users-kpi-sub">Accès actif</p>
          </div>
        </div>
        <div className="users-kpi is-violet">
          <span className="users-kpi-dot" />
          <div>
            <p className="users-kpi-label">Suspendus</p>
            <p className="users-kpi-value">{suspendedCount}</p>
            <p className="users-kpi-sub">Nécessitent révision</p>
          </div>
        </div>
      </section>

      <div className="users-table-card">
        <div className="users-toolbar-figma">
          <label className="users-search-figma" htmlFor="users-search">
            <Search size={13} strokeWidth={2} />
            <input
              id="users-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un apprenant…"
            />
          </label>
          <button type="button" className="dash-filter-btn">
            <Filter size={12} strokeWidth={2} /> Filtrer
          </button>
          <button
            type="button"
            className="dash-filter-btn"
            onClick={() => void loadUsers()}
            disabled={loading}
          >
            <RefreshCw size={12} strokeWidth={2} />
            Actualiser
          </button>
        </div>

        {error ? <p className="form-error" role="alert" style={{ margin: '12px 18px' }}>{error}</p> : null}
        {success ? (
          <p className="form-success" role="status" style={{ margin: '12px 18px' }}>
            {success}
          </p>
        ) : null}

        {loading && users.length === 0 ? (
          <div style={{ padding: '16px 18px' }}>
            <SkeletonBlock rows={6} />
          </div>
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
          <>
            <div className="admin-data-table-wrap">
              <table className="admin-data-table" style={{ minWidth: 480 }}>
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
                      <tr key={user.id} className={!user.isActive ? 'is-suspended' : undefined}>
                        <td>
                          <div className="users-avatar-cell">
                            <div className={`users-avatar ${user.isActive ? 'is-ok' : 'is-bad'}`}>
                              {userInitials(user)}
                            </div>
                            <div>
                              <strong style={{ fontSize: 13, fontWeight: 600 }}>
                                {user.firstName} {user.lastName}
                              </strong>
                              <p style={{ margin: 0, fontSize: 11, color: '#3d5a73' }}>Apprenant</p>
                            </div>
                          </div>
                        </td>
                        <td className="muted">{user.phone || '—'}</td>
                        <td className="muted">{formatDate(user.createdAt)}</td>
                        <td>
                          <div className="users-status-cell">
                            <StatusBadge tone={user.isActive ? 'success' : 'danger'}>
                              {user.isActive ? 'Actif' : 'Suspendu'}
                            </StatusBadge>
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
                            className="btn-text-danger"
                            disabled={busy}
                            onClick={() => void handleDelete(user)}
                            aria-label="Supprimer"
                            style={{ padding: '4px 6px' }}
                          >
                            <Trash2 size={12} strokeWidth={2} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="users-pagination">
              <p>
                {filteredUsers.length} apprenant{filteredUsers.length > 1 ? 's' : ''}
              </p>
            </div>
          </>
        )}
      </div>

      <Drawer
        open={createOpen}
        title="Créer un compte apprenant"
        subtitle="Le compte sera actif immédiatement après création."
        onClose={closeCreateDrawer}
        footer={
          <>
            <Button variant="ghost" onClick={closeCreateDrawer}>
              Annuler
            </Button>
            <Button variant="primary" type="submit" form="create-user-form" disabled={creating}>
              <UserPlus size={14} strokeWidth={2} />
              {creating ? 'Création…' : 'Créer le compte'}
            </Button>
          </>
        }
      >
        <form id="create-user-form" onSubmit={handleCreate} className="admin-form">
          <div>
            <label htmlFor="user-firstName">Prénom</label>
            <input
              id="user-firstName"
              type="text"
              required
              minLength={2}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="ex. Adjobi"
            />
          </div>
          <div>
            <label htmlFor="user-lastName">Nom</label>
            <input
              id="user-lastName"
              type="text"
              required
              minLength={2}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="ex. Kossou"
            />
          </div>
          <div>
            <label htmlFor="user-email">Email</label>
            <input
              id="user-email"
              type="text"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="exemple@gmail.com"
            />
          </div>
          <div>
            <label htmlFor="user-phone">Téléphone</label>
            <input
              id="user-phone"
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(normalizePhone(e.target.value))}
              placeholder={PHONE_PLACEHOLDER}
            />
          </div>
          <div>
            <label htmlFor="user-password">Mot de passe</label>
            <input
              id="user-password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
        </form>
      </Drawer>
    </div>
  )
}
