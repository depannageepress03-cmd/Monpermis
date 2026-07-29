import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarClock,
  Eye,
  ImagePlus,
  Megaphone,
  Pencil,
  Save,
  Search,
  Send,
  Trash2,
  X,
} from 'lucide-react'
import {
  createAnnouncement,
  deleteAnnouncement,
  fetchAnnouncements,
  fetchRecipientCount,
  publishAnnouncement,
  renotifyAnnouncement,
  updateAnnouncement,
  uploadAnnouncementImage,
  type Announcement,
  type AnnouncementAudience,
  type AnnouncementKind,
} from '../api/announcements'
import { RichTextEditor } from '../components/RichTextEditor'
import { getAdminToken, isAuthError } from '../context/AdminAuthContext'
import { resolveMediaUrl } from '../utils/mediaUrl'
import { stripHtml } from '../utils/richText'

const KIND_LABELS: Record<AnnouncementKind, string> = {
  info: 'Information',
  promo: 'Promotion',
  alerte: 'Alerte',
}

const AUDIENCE_LABELS: Record<AnnouncementAudience, string> = {
  all: 'Tous les apprenants',
  active: 'Abonnements actifs',
  code: 'Accès Code',
  conduite: 'Accès Conduite',
}

const BODY_MAX = 4000
const TITLE_MAX = 160

type ConfirmMode = 'publish-new' | 'publish-existing' | 'renotify' | null

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromLocalInput(value: string): string | null {
  if (!value.trim()) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

function statusMeta(a: Announcement) {
  const now = Date.now()
  if (a.expiresAt && new Date(a.expiresAt).getTime() <= now) {
    return { label: 'Expirée', className: 'is-danger' }
  }
  if (a.active) {
    return { label: 'Active', className: 'is-success' }
  }
  if (a.scheduledAt && new Date(a.scheduledAt).getTime() > now) {
    return { label: 'Programmée', className: 'is-warning' }
  }
  return { label: 'Dépubliée', className: 'is-muted' }
}

function emptyForm() {
  return {
    title: '',
    body: '',
    kind: 'info' as AnnouncementKind,
    audience: 'all' as AnnouncementAudience,
    scheduledAt: '',
    expiresAt: '',
    ctaUrl: '',
    imageUrl: '',
    imagePublicId: '',
  }
}

export function AnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [confirmMode, setConfirmMode] = useState<ConfirmMode>(null)
  const [confirmTargetId, setConfirmTargetId] = useState<string | null>(null)
  const [recipientCount, setRecipientCount] = useState<number | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  const plainLen = useMemo(() => stripHtml(form.body).length, [form.body])

  const load = useCallback(async () => {
    const token = getAdminToken()
    if (!token) return
    setLoading(true)
    try {
      const { announcements } = await fetchAnnouncements(token, {
        q: query.trim() || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
      })
      setItems(announcements)
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [query, statusFilter])

  useEffect(() => {
    void load()
  }, [load])

  const resetForm = () => {
    setForm(emptyForm())
    setEditingId(null)
  }

  const fillForm = (a: Announcement) => {
    setEditingId(a.id)
    setForm({
      title: a.title,
      body: a.body || '',
      kind: a.kind,
      audience: a.audience || 'all',
      scheduledAt: toLocalInput(a.scheduledAt),
      expiresAt: toLocalInput(a.expiresAt),
      ctaUrl: a.ctaUrl || '',
      imageUrl: a.imageUrl || '',
      imagePublicId: a.imagePublicId || '',
    })
    setError(null)
    setSuccess(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const buildPayload = (extra: Record<string, unknown> = {}) => ({
    title: form.title.trim(),
    body: form.body,
    kind: form.kind,
    audience: form.audience,
    scheduledAt: fromLocalInput(form.scheduledAt),
    expiresAt: fromLocalInput(form.expiresAt),
    ctaUrl: form.ctaUrl.trim(),
    imageUrl: form.imageUrl,
    imagePublicId: form.imagePublicId,
    ...extra,
  })

  const openConfirm = async (
    mode: ConfirmMode,
    targetId: string | null = null,
    audienceOverride?: AnnouncementAudience,
  ) => {
    setError(null)
    if (!form.title.trim() && (mode === 'publish-new' || (mode === 'publish-existing' && !targetId))) {
      setError('Le titre est requis')
      return
    }
    if (plainLen > BODY_MAX && mode !== 'renotify') {
      setError(`Message trop long (${BODY_MAX} max)`)
      return
    }
    setConfirmMode(mode)
    setConfirmTargetId(targetId)
    setRecipientCount(null)
    setConfirmLoading(true)
    const token = getAdminToken()
    if (!token) {
      setConfirmLoading(false)
      return
    }
    try {
      const audience = audienceOverride || form.audience
      const { count } = await fetchRecipientCount(audience, token)
      setRecipientCount(count)
    } catch {
      setRecipientCount(null)
    } finally {
      setConfirmLoading(false)
    }
  }

  const handleSaveDraft = async (e?: FormEvent) => {
    e?.preventDefault()
    setError(null)
    setSuccess(null)
    if (!form.title.trim()) {
      setError('Le titre est requis')
      return
    }
    if (plainLen > BODY_MAX) {
      setError(`Message trop long (${BODY_MAX} max)`)
      return
    }
    const token = getAdminToken()
    if (!token) {
      setError('Session expirée. Reconnectez-vous.')
      return
    }
    setSubmitting(true)
    try {
      if (editingId) {
        await updateAnnouncement(editingId, buildPayload({ active: false, notify: false }), token)
        setSuccess('Brouillon enregistré (dépubliée, aucune notification).')
      } else {
        await createAnnouncement(buildPayload({ active: false, notify: false }), token)
        setSuccess('Brouillon enregistré. Aucune notification envoyée.')
        resetForm()
      }
      await load()
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Enregistrement impossible')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!editingId) return
    setError(null)
    setSuccess(null)
    if (!form.title.trim()) {
      setError('Le titre est requis')
      return
    }
    const token = getAdminToken()
    if (!token) return
    setSubmitting(true)
    try {
      const existing = items.find((a) => a.id === editingId)
      await updateAnnouncement(
        editingId,
        buildPayload({ active: existing?.active ?? false, notify: false }),
        token,
      )
      setSuccess('Annonce mise à jour (sans re-notifier).')
      await load()
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Modification impossible')
    } finally {
      setSubmitting(false)
    }
  }

  const confirmAction = async () => {
    const token = getAdminToken()
    if (!token || !confirmMode) return
    setSubmitting(true)
    setError(null)
    try {
      if (confirmMode === 'publish-new') {
        const { broadcastCount } = await createAnnouncement(
          buildPayload({ active: true, notify: true }),
          token,
        )
        setSuccess(
          broadcastCount > 0
            ? `Annonce publiée et notifiée à ${broadcastCount} apprenant(s).`
            : 'Annonce publiée (aucun destinataire à notifier).',
        )
        resetForm()
      } else if (confirmMode === 'publish-existing') {
        const id = confirmTargetId || editingId
        if (!id) throw new Error('Annonce introuvable')
        if (editingId === id) {
          await updateAnnouncement(id, buildPayload({ notify: false }), token)
        }
        const { broadcastCount } = await publishAnnouncement(id, true, token)
        setSuccess(
          broadcastCount > 0
            ? `Annonce publiée et notifiée à ${broadcastCount} apprenant(s).`
            : 'Annonce publiée (aucun destinataire à notifier).',
        )
        if (editingId === id) resetForm()
      } else if (confirmMode === 'renotify') {
        const id = confirmTargetId || editingId
        if (!id) throw new Error('Annonce introuvable')
        if (editingId === id) {
          await updateAnnouncement(id, buildPayload({ notify: false }), token)
        }
        const { broadcastCount } = await renotifyAnnouncement(id, token)
        setSuccess(`Notification renvoyée à ${broadcastCount} apprenant(s).`)
      }
      setConfirmMode(null)
      await load()
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Action impossible')
      setConfirmMode(null)
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggle = async (announcement: Announcement) => {
    const token = getAdminToken()
    if (!token) return
    if (!announcement.active) {
      setForm({
        title: announcement.title,
        body: announcement.body || '',
        kind: announcement.kind,
        audience: announcement.audience || 'all',
        scheduledAt: toLocalInput(announcement.scheduledAt),
        expiresAt: toLocalInput(announcement.expiresAt),
        ctaUrl: announcement.ctaUrl || '',
        imageUrl: announcement.imageUrl || '',
        imagePublicId: announcement.imagePublicId || '',
      })
      await openConfirm('publish-existing', announcement.id, announcement.audience || 'all')
      return
    }
    try {
      const { announcement: updated } = await updateAnnouncement(
        announcement.id,
        { active: false, notify: false },
        token,
      )
      setItems((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
      setSuccess('Annonce dépubliée (retirée du fil, aucune notification).')
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
      if (editingId === announcement.id) resetForm()
      setSuccess('Annonce supprimée.')
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Suppression impossible')
    }
  }

  const handleImagePick = async (file: File | null) => {
    if (!file) return
    const token = getAdminToken()
    if (!token) return
    setUploadingImage(true)
    setError(null)
    try {
      const uploaded = await uploadAnnouncementImage(file, token)
      setForm((prev) => ({
        ...prev,
        imageUrl: uploaded.imageUrl,
        imagePublicId: uploaded.imagePublicId,
      }))
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Upload image impossible')
    } finally {
      setUploadingImage(false)
    }
  }

  const confirmCopy =
    confirmMode === 'renotify'
      ? 'Renvoyer une notification'
      : 'Publier et notifier'

  return (
    <div className="admin-page">
      <div className="admin-page-intro">
        <p className="admin-page-intro-label">Communication</p>
        <h2 className="admin-page-intro-title">Annonces &amp; actualités</h2>
        <p className="admin-page-intro-text">
          Rédigez un brouillon, prévisualisez, puis publiez avec confirmation. Seuls les comptes
          actifs ciblés reçoivent une notification.
        </p>
      </div>

      <section className="admin-section">
        <div className="admin-section-head">
          <h3 className="admin-section-label">
            {editingId ? 'Modifier l’annonce' : 'Nouvelle annonce'}
          </h3>
          {editingId ? (
            <button type="button" className="btn-outline-sm" onClick={resetForm}>
              <X size={14} />
              Annuler l’édition
            </button>
          ) : null}
        </div>
        <div className="admin-section-body">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void handleSaveDraft()
            }}
            className="create-admin-form"
          >
            <div className="create-admin-grid">
              <div className="create-admin-field">
                <label htmlFor="ann-title">
                  <Megaphone size={14} />
                  Titre
                </label>
                <input
                  id="ann-title"
                  type="text"
                  required
                  maxLength={TITLE_MAX}
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Ex : Nouvelle session d’examen blanc"
                />
                <p className="muted" style={{ margin: '4px 0 0', fontSize: 12 }}>
                  {form.title.length}/{TITLE_MAX}
                </p>
              </div>

              <div className="create-admin-field">
                <label htmlFor="ann-kind">Catégorie</label>
                <select
                  id="ann-kind"
                  value={form.kind}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, kind: e.target.value as AnnouncementKind }))
                  }
                >
                  <option value="info">Information</option>
                  <option value="promo">Promotion</option>
                  <option value="alerte">Alerte</option>
                </select>
              </div>

              <div className="create-admin-field">
                <label htmlFor="ann-audience">Audience</label>
                <select
                  id="ann-audience"
                  value={form.audience}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      audience: e.target.value as AnnouncementAudience,
                    }))
                  }
                >
                  {(Object.keys(AUDIENCE_LABELS) as AnnouncementAudience[]).map((key) => (
                    <option key={key} value={key}>
                      {AUDIENCE_LABELS[key]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="create-admin-field">
              <label htmlFor="ann-body">Message</label>
              <RichTextEditor
                value={form.body}
                onChange={(html) => setForm((p) => ({ ...p, body: html }))}
                placeholder="Détails de l’annonce (gras, listes, liens)…"
              />
              <p
                className="muted"
                style={{
                  margin: '6px 0 0',
                  fontSize: 12,
                  color: plainLen > BODY_MAX ? '#b42318' : undefined,
                }}
              >
                {plainLen}/{BODY_MAX} caractères
              </p>
            </div>

            <div className="create-admin-grid">
              <div className="create-admin-field">
                <label htmlFor="ann-scheduled">
                  <CalendarClock size={14} />
                  Programmer (optionnel)
                </label>
                <input
                  id="ann-scheduled"
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) => setForm((p) => ({ ...p, scheduledAt: e.target.value }))}
                />
              </div>
              <div className="create-admin-field">
                <label htmlFor="ann-expires">Expire le (optionnel)</label>
                <input
                  id="ann-expires"
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={(e) => setForm((p) => ({ ...p, expiresAt: e.target.value }))}
                />
              </div>
              <div className="create-admin-field">
                <label htmlFor="ann-cta">Lien CTA (optionnel)</label>
                <input
                  id="ann-cta"
                  type="url"
                  value={form.ctaUrl}
                  onChange={(e) => setForm((p) => ({ ...p, ctaUrl: e.target.value }))}
                  placeholder="https://… ou /abonnement"
                />
              </div>
            </div>

            <div className="create-admin-field">
              <label>Image (optionnel)</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <label className="btn-outline-sm" style={{ cursor: 'pointer' }}>
                  <ImagePlus size={14} />
                  {uploadingImage ? 'Upload…' : 'Ajouter une image'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    hidden
                    disabled={uploadingImage}
                    onChange={(e) => void handleImagePick(e.target.files?.[0] ?? null)}
                  />
                </label>
                {form.imageUrl ? (
                  <>
                    <img
                      src={resolveMediaUrl(form.imageUrl)}
                      alt=""
                      style={{
                        width: 64,
                        height: 64,
                        objectFit: 'cover',
                        borderRadius: 8,
                        border: '1px solid #e5e7eb',
                      }}
                    />
                    <button
                      type="button"
                      className="btn-outline-sm"
                      onClick={() =>
                        setForm((p) => ({ ...p, imageUrl: '', imagePublicId: '' }))
                      }
                    >
                      Retirer
                    </button>
                  </>
                ) : null}
              </div>
            </div>

            {error ? <p className="form-error" role="alert">{error}</p> : null}
            {success ? <p className="form-success" role="status">{success}</p> : null}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              <button
                type="button"
                disabled={submitting}
                className="btn-outline"
                onClick={() => void handleSaveDraft()}
              >
                <Save size={16} />
                {submitting ? 'Enregistrement…' : 'Enregistrer brouillon'}
              </button>
              <button
                type="button"
                className="btn-outline"
                disabled={!form.title.trim()}
                onClick={() => setPreviewOpen(true)}
              >
                <Eye size={16} />
                Aperçu
              </button>
              {editingId ? (
                <>
                  <button
                    type="button"
                    disabled={submitting}
                    className="btn-outline"
                    onClick={() => void handleSaveEdit()}
                  >
                    <Save size={16} />
                    Enregistrer
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    className="btn-primary btn-primary-inline"
                    onClick={() => void openConfirm('publish-existing', editingId)}
                  >
                    <Send size={16} />
                    Publier &amp; notifier
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    className="btn-outline"
                    onClick={() => void openConfirm('renotify', editingId)}
                  >
                    Re-notifier
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={submitting}
                  className="btn-primary btn-primary-inline"
                  onClick={() => void openConfirm('publish-new')}
                >
                  <Send size={16} />
                  Publier &amp; notifier
                </button>
              )}
            </div>
          </form>
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section-head">
          <h3 className="admin-section-label">Annonces</h3>
        </div>
        <div className="admin-section-body">
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              marginBottom: 14,
              alignItems: 'center',
            }}
          >
            <div style={{ position: 'relative', flex: '1 1 220px' }}>
              <Search
                size={14}
                style={{ position: 'absolute', left: 10, top: 11, opacity: 0.45 }}
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher…"
                style={{ width: '100%', paddingLeft: 32 }}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ minWidth: 160 }}
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actives</option>
              <option value="draft">Dépubliées</option>
              <option value="scheduled">Programmées</option>
              <option value="expired">Expirées</option>
            </select>
          </div>

          {loading ? (
            <p className="muted">Chargement…</p>
          ) : items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <Megaphone size={32} style={{ opacity: 0.35, marginBottom: 8 }} />
              <p style={{ fontWeight: 600, margin: '0 0 4px' }}>Aucune annonce</p>
              <p className="muted" style={{ margin: 0 }}>
                Créez un brouillon ci-dessus, prévisualisez-le, puis publiez-le pour le diffuser aux
                apprenants.
              </p>
            </div>
          ) : (
            <div className="admin-data-table-wrap">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th>Titre</th>
                    <th>Catégorie</th>
                    <th>Audience</th>
                    <th>Statut</th>
                    <th>Vues</th>
                    <th>Date</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((a) => {
                    const meta = statusMeta(a)
                    const preview = stripHtml(a.body)
                    return (
                      <tr key={a.id}>
                        <td>
                          <strong style={{ fontSize: 13, fontWeight: 600 }}>{a.title}</strong>
                          {preview ? (
                            <p className="muted" style={{ margin: '2px 0 0' }}>
                              {preview.length > 100 ? `${preview.slice(0, 99)}…` : preview}
                            </p>
                          ) : null}
                          {a.broadcastAt ? (
                            <p className="muted" style={{ margin: '2px 0 0', fontSize: 11 }}>
                              Notifiée le {new Date(a.broadcastAt).toLocaleString('fr-FR')}
                            </p>
                          ) : null}
                        </td>
                        <td className="muted">{KIND_LABELS[a.kind]}</td>
                        <td className="muted">{AUDIENCE_LABELS[a.audience || 'all']}</td>
                        <td>
                          <button
                            type="button"
                            className={`admin-status-badge ${meta.className}`}
                            style={{ border: 'none', cursor: 'pointer' }}
                            onClick={() => void handleToggle(a)}
                            title={a.active ? 'Dépublier' : 'Publier'}
                          >
                            {meta.label}
                          </button>
                        </td>
                        <td className="muted">{a.viewCount ?? 0}</td>
                        <td className="muted">
                          {new Date(a.createdAt).toLocaleDateString('fr-FR')}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              type="button"
                              className="btn-icon-danger"
                              style={{ color: 'inherit', background: 'transparent' }}
                              onClick={() => fillForm(a)}
                              aria-label="Modifier"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              className="btn-icon-danger"
                              onClick={() => void handleDelete(a)}
                              aria-label="Supprimer"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {previewOpen ? (
        <div className="modal-backdrop" onClick={() => setPreviewOpen(false)}>
          <div
            className="modal-content ann-preview-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 720, width: '92vw' }}
          >
            <div className="modal-header">
              <h2>Aperçu apprenant</h2>
              <button type="button" className="btn-outline-sm" onClick={() => setPreviewOpen(false)}>
                Fermer
              </button>
            </div>
            <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr 1fr' }}>
              <div>
                <p className="muted" style={{ margin: '0 0 8px', fontSize: 12 }}>
                  Web — carte accueil
                </p>
                <article className={`ann-preview-web ann-preview-web--${form.kind}`}>
                  {form.imageUrl ? (
                    <img src={resolveMediaUrl(form.imageUrl)} alt="" className="ann-preview-img" />
                  ) : null}
                  <strong>{form.title || 'Sans titre'}</strong>
                  {form.body ? (
                    <div
                      className="ann-preview-body"
                      dangerouslySetInnerHTML={{ __html: form.body }}
                    />
                  ) : null}
                  {form.ctaUrl ? <span className="ann-preview-cta">Voir plus</span> : null}
                </article>
              </div>
              <div>
                <p className="muted" style={{ margin: '0 0 8px', fontSize: 12 }}>
                  Mobile — carte
                </p>
                <div className={`ann-preview-mobile ann-preview-mobile--${form.kind}`}>
                  <div className="ann-preview-mobile-accent" />
                  <div className="ann-preview-mobile-body">
                    <strong>{form.title || 'Sans titre'}</strong>
                    <p>{stripHtml(form.body) || '—'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {confirmMode ? (
        <div className="modal-backdrop" onClick={() => setConfirmMode(null)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 440, width: '92vw' }}
          >
            <div className="modal-header">
              <h2>{confirmCopy}</h2>
              <button type="button" className="btn-outline-sm" onClick={() => setConfirmMode(null)}>
                Fermer
              </button>
            </div>
            <p style={{ margin: '0 0 12px', lineHeight: 1.45 }}>
              Audience : <strong>{AUDIENCE_LABELS[form.audience]}</strong>
              <br />
              {confirmLoading ? (
                'Calcul du nombre de destinataires…'
              ) : (
                <>
                  Environ <strong>{recipientCount ?? '—'}</strong> compte(s) actif(s) seront
                  notifiés dans l’application.
                </>
              )}
            </p>
            <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
              Les comptes suspendus ne sont pas notifiés. La diffusion se fait dans l’application
              (boîte de notifications).
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" className="btn-outline" onClick={() => setConfirmMode(null)}>
                Annuler
              </button>
              <button
                type="button"
                className="btn-primary btn-primary-inline"
                disabled={submitting || confirmLoading}
                onClick={() => void confirmAction()}
              >
                <Send size={16} />
                {submitting ? 'Envoi…' : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <style>{`
        .admin-status-badge.is-muted { background: #eef1f4; color: #5b6b7c; }
        .modal-backdrop {
          position: fixed; inset: 0; background: rgba(0,16,48,.45);
          display: flex; align-items: center; justify-content: center;
          z-index: 80; padding: 1rem;
        }
        .modal-content {
          background: #fff; border-radius: 14px; padding: 1.1rem 1.25rem 1.25rem;
          box-shadow: 0 18px 50px rgba(0,16,48,.18); max-height: 90vh; overflow: auto;
        }
        .modal-header {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; margin-bottom: 14px;
        }
        .modal-header h2 { margin: 0; font-size: 1.1rem; }
        .ann-preview-web {
          border: 1px solid #e5e7eb; border-radius: 14px; padding: .9rem 1rem;
          border-left: 4px solid #00b050; background: #fff;
        }
        .ann-preview-web--promo { border-left-color: #f59e0b; }
        .ann-preview-web--alerte { border-left-color: #e11d48; }
        .ann-preview-web strong { display: block; margin-bottom: .35rem; font-size: .95rem; }
        .ann-preview-body { font-size: .85rem; color: #3d5a73; line-height: 1.45; }
        .ann-preview-body p { margin: 0 0 .4rem; }
        .ann-preview-img {
          width: 100%; max-height: 140px; object-fit: cover; border-radius: 10px;
          margin-bottom: .6rem;
        }
        .ann-preview-cta {
          display: inline-block; margin-top: .4rem; font-size: .8rem;
          color: #00b050; font-weight: 600;
        }
        .ann-preview-mobile {
          display: flex; background: #0b1220; border-radius: 14px; overflow: hidden;
          min-height: 88px;
        }
        .ann-preview-mobile-accent { width: 4px; background: #00b050; flex-shrink: 0; }
        .ann-preview-mobile--promo .ann-preview-mobile-accent { background: #f87171; }
        .ann-preview-mobile--alerte .ann-preview-mobile-accent { background: #FFC000; }
        .ann-preview-mobile-body { padding: .85rem 1rem; color: #e8eef6; }
        .ann-preview-mobile-body strong { display: block; margin-bottom: .25rem; font-size: .9rem; }
        .ann-preview-mobile-body p {
          margin: 0; font-size: .78rem; color: #9aa8b8; line-height: 1.4;
          display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
        }
        @media (max-width: 700px) {
          .ann-preview-modal > div[style] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
