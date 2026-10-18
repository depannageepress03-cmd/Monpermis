import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarClock,
  CheckCircle2,
  Clock3,
  Eye,
  ImagePlus,
  Megaphone,
  Pencil,
  Plus,
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
import { PageSection } from '../components/model/PageSection'
import { nf } from '../components/model/ModelCharts'
import { RichTextEditor } from '../components/RichTextEditor'
import { getAdminToken, isAuthError } from '../context/AdminAuthContext'
import { Drawer, EmptyState, SkeletonBlock } from '../ui'
import { resolveMediaUrl } from '../utils/mediaUrl'
import { stripHtml } from '../utils/richText'
import { sanitizeHtml } from '../utils/sanitizeHtml'

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
    return { label: 'Expirée', className: 'cx-st-ko' }
  }
  if (a.active) {
    return { label: 'Active', className: 'cx-st-ok' }
  }
  if (a.scheduledAt && new Date(a.scheduledAt).getTime() > now) {
    return { label: 'Programmée', className: 'cx-st-wait' }
  }
  return { label: 'Dépubliée', className: 'cx-st-off' }
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
  const [composeOpen, setComposeOpen] = useState(false)
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
    setComposeOpen(false)
  }

  const openCompose = () => {
    setForm(emptyForm())
    setEditingId(null)
    setError(null)
    setSuccess(null)
    setComposeOpen(true)
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
    setComposeOpen(true)
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

  const composeForm = (
    <form
      id="announcement-compose-form"
      onSubmit={(e) => {
        e.preventDefault()
        void handleSaveDraft()
      }}
      className="cx-form"
    >
      <div className="cx-form-grid">
        <div className="cx-fld" style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="ann-title">
            <Megaphone aria-hidden />
            Titre
          </label>
          <input
            id="ann-title"
            className="cx-input"
            type="text"
            required
            maxLength={TITLE_MAX}
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="Ex : Nouvelle session d’examen blanc"
          />
          <p className="cx-hint">
            {form.title.length}/{TITLE_MAX}
          </p>
        </div>

        <div className="cx-fld">
          <label htmlFor="ann-kind">Catégorie</label>
          <select
            id="ann-kind"
            className="cx-select"
            value={form.kind}
            onChange={(e) => setForm((p) => ({ ...p, kind: e.target.value as AnnouncementKind }))}
          >
            <option value="info">Information</option>
            <option value="promo">Promotion</option>
            <option value="alerte">Alerte</option>
          </select>
        </div>

        <div className="cx-fld">
          <label htmlFor="ann-audience">Audience</label>
          <select
            id="ann-audience"
            className="cx-select"
            value={form.audience}
            onChange={(e) => setForm((p) => ({ ...p, audience: e.target.value as AnnouncementAudience }))}
          >
            {(Object.keys(AUDIENCE_LABELS) as AnnouncementAudience[]).map((key) => (
              <option key={key} value={key}>
                {AUDIENCE_LABELS[key]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="cx-fld">
        <label htmlFor="ann-body">Message</label>
        <RichTextEditor
          value={form.body}
          onChange={(html) => setForm((p) => ({ ...p, body: html }))}
          placeholder="Détails de l’annonce (gras, listes, liens)…"
        />
        <p className={`cx-hint${plainLen > BODY_MAX ? ' cx-bad' : ''}`}>
          {plainLen}/{BODY_MAX} caractères
        </p>
      </div>

      <div className="cx-form-grid">
        <div className="cx-fld">
          <label htmlFor="ann-scheduled">
            <CalendarClock aria-hidden />
            Programmer (optionnel)
          </label>
          <input
            id="ann-scheduled"
            className="cx-input"
            type="datetime-local"
            value={form.scheduledAt}
            onChange={(e) => setForm((p) => ({ ...p, scheduledAt: e.target.value }))}
          />
        </div>
        <div className="cx-fld">
          <label htmlFor="ann-expires">Expire le (optionnel)</label>
          <input
            id="ann-expires"
            className="cx-input"
            type="datetime-local"
            value={form.expiresAt}
            onChange={(e) => setForm((p) => ({ ...p, expiresAt: e.target.value }))}
          />
        </div>
        <div className="cx-fld">
          <label htmlFor="ann-cta">Lien CTA (optionnel)</label>
          <input
            id="ann-cta"
            className="cx-input"
            type="url"
            value={form.ctaUrl}
            onChange={(e) => setForm((p) => ({ ...p, ctaUrl: e.target.value }))}
            placeholder="https://… ou /abonnement"
          />
        </div>
      </div>

      <div className="cx-fld">
        <label>Image (optionnel)</label>
        <div className="cx-photo-box">
          {form.imageUrl ? <img src={resolveMediaUrl(form.imageUrl)} alt="" /> : null}
          <label className="cx-filebtn">
            <ImagePlus aria-hidden />
            {uploadingImage ? 'Upload…' : form.imageUrl ? 'Changer l’image' : 'Ajouter une image'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              hidden
              disabled={uploadingImage}
              onChange={(e) => void handleImagePick(e.target.files?.[0] ?? null)}
            />
          </label>
          {form.imageUrl ? (
            <button
              type="button"
              className="cx-btn cx-btn-sm"
              onClick={() => setForm((p) => ({ ...p, imageUrl: '', imagePublicId: '' }))}
            >
              Retirer
            </button>
          ) : null}
        </div>
      </div>

      {error ? <p className="cx-note cx-note-err" role="alert">{error}</p> : null}
      {success ? <p className="cx-note cx-note-ok" role="status">{success}</p> : null}

      <div className="cx-form-actions">
        <button type="button" disabled={submitting} className="cx-btn" onClick={() => void handleSaveDraft()}>
          <Save aria-hidden />
          {submitting ? 'Enregistrement…' : 'Enregistrer brouillon'}
        </button>
        <button type="button" className="cx-btn" disabled={!form.title.trim()} onClick={() => setPreviewOpen(true)}>
          <Eye aria-hidden />
          Aperçu
        </button>
        {editingId ? (
          <>
            <button type="button" disabled={submitting} className="cx-btn" onClick={() => void handleSaveEdit()}>
              <Save aria-hidden />
              Enregistrer
            </button>
            <button
              type="button"
              disabled={submitting}
              className="cx-btn cx-btn-fill"
              onClick={() => void openConfirm('publish-existing', editingId)}
            >
              <Send aria-hidden />
              Publier &amp; notifier
            </button>
            <button type="button" disabled={submitting} className="cx-btn" onClick={() => void openConfirm('renotify', editingId)}>
              Re-notifier
            </button>
          </>
        ) : (
          <button type="button" disabled={submitting} className="cx-btn cx-btn-fill" onClick={() => void openConfirm('publish-new')}>
            <Send aria-hidden />
            Publier &amp; notifier
          </button>
        )}
      </div>
    </form>
  )

  const stats = useMemo(() => {
    let active = 0
    let scheduled = 0
    let draft = 0
    let views = 0
    for (const a of items) {
      const label = statusMeta(a).label
      if (label === 'Active') active += 1
      else if (label === 'Programmée') scheduled += 1
      else if (label === 'Dépubliée') draft += 1
      views += a.viewCount ?? 0
    }
    return { total: items.length, active, scheduled, draft, views }
  }, [items])

  return (
    <PageSection
      kicker="Communication"
      title="Annonces & actualités"
      subtitle="Rédigez un brouillon, prévisualisez, puis publiez avec confirmation. Seuls les comptes actifs ciblés reçoivent une notification."
      actions={
        <button type="button" className="cx-btn cx-btn-fill" onClick={openCompose}>
          <Plus aria-hidden />
          Nouvelle annonce
        </button>
      }
    >
      {!composeOpen && error ? <p className="cx-note cx-note-err" role="alert">{error}</p> : null}
      {!composeOpen && success ? <p className="cx-note cx-note-ok" role="status">{success}</p> : null}

      <div className="cx-kc-grid">
        <div className="cx-kc">
          <span className="cx-kc-ico cx-kc-blue">
            <Megaphone aria-hidden />
          </span>
          <div className="cx-kc-body">
            <span className="cx-kc-label">Annonces</span>
            <span className="cx-kc-value">{nf(stats.total)}</span>
            <span className="cx-kc-sub">dans la liste</span>
          </div>
        </div>
        <div className="cx-kc">
          <span className="cx-kc-ico cx-kc-green">
            <CheckCircle2 aria-hidden />
          </span>
          <div className="cx-kc-body">
            <span className="cx-kc-label">Actives</span>
            <span className="cx-kc-value">{nf(stats.active)}</span>
            <span className="cx-kc-sub">visibles côté apprenants</span>
          </div>
        </div>
        <div className="cx-kc">
          <span className="cx-kc-ico cx-kc-gold">
            <Clock3 aria-hidden />
          </span>
          <div className="cx-kc-body">
            <span className="cx-kc-label">Programmées</span>
            <span className="cx-kc-value">{nf(stats.scheduled)}</span>
            <span className="cx-kc-sub">{nf(stats.draft)} dépubliée{stats.draft > 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className="cx-kc">
          <span className="cx-kc-ico cx-kc-sky">
            <Eye aria-hidden />
          </span>
          <div className="cx-kc-body">
            <span className="cx-kc-label">Vues</span>
            <span className="cx-kc-value">{nf(stats.views)}</span>
            <span className="cx-kc-sub">cumul des annonces listées</span>
          </div>
        </div>
      </div>

      <section className="cx-panel">
        <div className="cx-toolbar" style={{ marginBottom: '1rem' }}>
          <label className="cx-search">
            <Search aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une annonce…"
              aria-label="Rechercher une annonce"
            />
          </label>
          <select
            className="cx-select"
            style={{ width: 'auto', minWidth: '11rem' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filtrer par statut"
          >
            <option value="all">Tous les statuts</option>
            <option value="active">Actives</option>
            <option value="draft">Dépubliées</option>
            <option value="scheduled">Programmées</option>
            <option value="expired">Expirées</option>
          </select>
        </div>

        {loading ? (
          <SkeletonBlock rows={5} />
        ) : items.length === 0 ? (
          <EmptyState
            title="Aucune annonce"
            description="Créez un brouillon, prévisualisez-le, puis publiez-le pour le diffuser aux apprenants."
            actionLabel="Nouvelle annonce"
            onAction={openCompose}
            icon={<Megaphone size={32} style={{ opacity: 0.35 }} />}
          />
        ) : (
          <div className="cx-table-wrap">
            <table className="cx-ann-table">
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
                      <td className="cx-ann-title">
                        <strong>{a.title}</strong>
                        {preview ? <p>{preview.length > 100 ? `${preview.slice(0, 99)}…` : preview}</p> : null}
                        {a.broadcastAt ? (
                          <p>Notifiée le {new Date(a.broadcastAt).toLocaleString('fr-FR')}</p>
                        ) : null}
                      </td>
                      <td>{KIND_LABELS[a.kind]}</td>
                      <td>{AUDIENCE_LABELS[a.audience || 'all']}</td>
                      <td>
                        <button
                          type="button"
                          className={`cx-status ${meta.className}`}
                          onClick={() => void handleToggle(a)}
                          title={a.active ? 'Dépublier' : 'Publier'}
                        >
                          {meta.label}
                        </button>
                      </td>
                      <td>{a.viewCount ?? 0}</td>
                      <td>{new Date(a.createdAt).toLocaleDateString('fr-FR')}</td>
                      <td>
                        <div className="cx-row-actions">
                          <button type="button" className="cx-btn cx-btn-icon" onClick={() => fillForm(a)} aria-label="Modifier" title="Modifier">
                            <Pencil aria-hidden />
                          </button>
                          <button
                            type="button"
                            className="cx-btn cx-btn-icon cx-btn-danger"
                            onClick={() => void handleDelete(a)}
                            aria-label="Supprimer"
                            title="Supprimer"
                          >
                            <Trash2 aria-hidden />
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
      </section>

      <Drawer
        open={composeOpen}
        title={editingId ? 'Modifier l’annonce' : 'Nouvelle annonce'}
        subtitle="Enregistrez un brouillon ou publiez avec notification."
        onClose={resetForm}
      >
        {composeForm}
      </Drawer>

      {previewOpen ? (
        <div className="cx-modal-bg" onClick={() => setPreviewOpen(false)}>
          <div className="cx-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="cx-modal-head">
              <h2>Aperçu apprenant</h2>
              <button type="button" className="cx-btn cx-btn-icon" onClick={() => setPreviewOpen(false)} aria-label="Fermer">
                <X aria-hidden />
              </button>
            </div>
            <div className="cx-modal-body">
              <div className="cx-prev-grid">
                <div>
                  <p className="cx-prev-label">Web — carte accueil</p>
                  <article className={`cx-ann-web cx-k-${form.kind}`}>
                    {form.imageUrl ? <img src={resolveMediaUrl(form.imageUrl)} alt="" className="cx-ann-img" /> : null}
                    <strong>{form.title || 'Sans titre'}</strong>
                    {form.body ? <div className="cx-ann-body" dangerouslySetInnerHTML={{ __html: sanitizeHtml(form.body) }} /> : null}
                    {form.ctaUrl ? <span className="cx-ann-cta">Voir plus</span> : null}
                  </article>
                </div>
                <div>
                  <p className="cx-prev-label">Mobile — carte</p>
                  <div className={`cx-ann-mob cx-k-${form.kind}`}>
                    <i />
                    <div>
                      <strong>{form.title || 'Sans titre'}</strong>
                      <p>{stripHtml(form.body) || '—'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {confirmMode ? (
        <div className="cx-modal-bg" onClick={() => setConfirmMode(null)}>
          <div className="cx-modal cx-modal-sm" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="cx-modal-head">
              <h2>{confirmCopy}</h2>
              <button type="button" className="cx-btn cx-btn-icon" onClick={() => setConfirmMode(null)} aria-label="Fermer">
                <X aria-hidden />
              </button>
            </div>
            <div className="cx-modal-body">
              <p className="cx-panel-note" style={{ color: 'var(--ink)' }}>
                Audience : <strong>{AUDIENCE_LABELS[form.audience]}</strong>
                <br />
                {confirmLoading ? (
                  'Calcul du nombre de destinataires…'
                ) : (
                  <>
                    Environ <strong>{recipientCount ?? '—'}</strong> compte(s) actif(s) seront notifiés dans
                    l’application.
                  </>
                )}
              </p>
              <p className="cx-panel-note">
                Les comptes suspendus ne sont pas notifiés. La diffusion se fait dans l’application (boîte de
                notifications).
              </p>
              <div className="cx-actions">
                <button type="button" className="cx-btn" onClick={() => setConfirmMode(null)}>
                  Annuler
                </button>
                <button
                  type="button"
                  className="cx-btn cx-btn-fill"
                  disabled={submitting || confirmLoading}
                  onClick={() => void confirmAction()}
                >
                  <Send aria-hidden />
                  {submitting ? 'Envoi…' : 'Confirmer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </PageSection>
  )
}
