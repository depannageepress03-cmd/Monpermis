import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Megaphone, Send, Trash2 } from 'lucide-react'
import {
  createAnnouncement,
  deleteAnnouncement,
  fetchAnnouncements,
  updateAnnouncement,
  type Announcement,
  type AnnouncementKind,
} from '../api/announcements'
import { getAdminToken, isAuthError } from '../context/AdminAuthContext'

const KIND_LABELS: Record<AnnouncementKind, string> = {
  info: 'Information',
  promo: 'Promotion',
  alerte: 'Alerte',
}

export function AnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [kind, setKind] = useState<AnnouncementKind>('info')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    const token = getAdminToken()
    if (!token) return
    setLoading(true)
    try {
      const { announcements } = await fetchAnnouncements(token)
      setItems(announcements)
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (!title.trim()) {
      setError('Le titre est requis')
      return
    }
    const token = getAdminToken()
    if (!token) {
      setError('Session expirée. Reconnectez-vous.')
      return
    }
    setSubmitting(true)
    try {
      const { broadcastCount } = await createAnnouncement(
        { title: title.trim(), body: body.trim(), kind, active: true },
        token,
      )
      setSuccess(`Annonce publiée et envoyée à ${broadcastCount} utilisateur(s).`)
      setTitle('')
      setBody('')
      setKind('info')
      await load()
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Publication impossible')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggle = async (announcement: Announcement) => {
    const token = getAdminToken()
    if (!token) return
    try {
      const { announcement: updated } = await updateAnnouncement(
        announcement.id,
        { active: !announcement.active },
        token,
      )
      setItems((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Modification impossible')
    }
  }

  const handleDelete = async (announcement: Announcement) => {
    const token = getAdminToken()
    if (!token) return
    if (!window.confirm(`Supprimer l’annonce « ${announcement.title} » ?`)) return
    try {
      await deleteAnnouncement(announcement.id, token)
      setItems((prev) => prev.filter((a) => a.id !== announcement.id))
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Suppression impossible')
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-intro">
        <p className="admin-page-intro-label">Communication</p>
        <h2 className="admin-page-intro-title">Annonces &amp; actualités</h2>
        <p className="admin-page-intro-text">
          Publiez un message : il apparaît dans le fil d’actualités des apprenants et leur est
          envoyé en notification.
        </p>
      </div>

      <section className="admin-section">
        <div className="admin-section-head">
          <h3 className="admin-section-label">Nouvelle annonce</h3>
        </div>
        <div className="admin-section-body">
          <form onSubmit={handleSubmit} className="create-admin-form">
            <div className="create-admin-grid">
              <div className="create-admin-field">
                <label htmlFor="title">
                  <Megaphone size={14} />
                  Titre
                </label>
                <input
                  id="title"
                  type="text"
                  required
                  maxLength={160}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex : Nouvelle session d’examen blanc"
                />
              </div>

              <div className="create-admin-field">
                <label htmlFor="kind">Catégorie</label>
                <select id="kind" value={kind} onChange={(e) => setKind(e.target.value as AnnouncementKind)}>
                  <option value="info">Information</option>
                  <option value="promo">Promotion</option>
                  <option value="alerte">Alerte</option>
                </select>
              </div>
            </div>

            <div className="create-admin-field">
              <label htmlFor="body">Message</label>
              <textarea
                id="body"
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Détails de l’annonce (facultatif)"
              />
            </div>

            {error ? <p className="form-error" role="alert">{error}</p> : null}
            {success ? <p className="form-success" role="status">{success}</p> : null}

            <button type="submit" disabled={submitting} className="btn-primary btn-primary-inline">
              <Send size={18} />
              {submitting ? 'Publication…' : 'Publier &amp; notifier'}
            </button>
          </form>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section-head">
          <h3 className="admin-section-label">Annonces publiées</h3>
        </div>
        <div className="admin-section-body">
          {loading ? (
            <p className="muted">Chargement…</p>
          ) : items.length === 0 ? (
            <p className="muted">Aucune annonce pour le moment.</p>
          ) : (
            <div className="admin-data-table-wrap">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>Titre</th>
                    <th>Catégorie</th>
                    <th>Statut</th>
                    <th>Date</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <strong style={{ fontSize: 13, fontWeight: 600 }}>{a.title}</strong>
                        {a.body ? <p className="muted" style={{ margin: '2px 0 0' }}>{a.body}</p> : null}
                      </td>
                      <td className="muted">{KIND_LABELS[a.kind]}</td>
                      <td>
                        <button
                          type="button"
                          className="admin-access-pill"
                          onClick={() => void handleToggle(a)}
                        >
                          {a.active ? 'Active' : 'Masquée'}
                        </button>
                      </td>
                      <td className="muted">
                        {new Date(a.createdAt).toLocaleDateString('fr-FR')}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-icon-danger"
                          onClick={() => void handleDelete(a)}
                          aria-label="Supprimer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
