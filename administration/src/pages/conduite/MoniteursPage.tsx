import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ImagePlus, KeyRound, Pencil, Plus, Trash2, UserCog, Users, X } from 'lucide-react'
import {
  createMoniteur,
  deleteMoniteur,
  fetchMoniteurs,
  updateMoniteur,
  uploadVehiclePhoto,
} from '../../api/reservations'
import { ConduiteSection } from '../../components/model/ConduiteSection'
import { nf } from '../../components/model/ModelCharts'
import { EmptyState, SkeletonBlock } from '../../ui'
import { getAdminToken, isAuthError } from '../../context/AdminAuthContext'
import type { Moniteur, WeeklyAvailabilitySlot } from '../../types/reservations'
import { resolveMediaUrl } from '../../utils/mediaUrl'

const WEEK_DAYS = [
  { dayOfWeek: 1, label: 'Lundi' },
  { dayOfWeek: 2, label: 'Mardi' },
  { dayOfWeek: 3, label: 'Mercredi' },
  { dayOfWeek: 4, label: 'Jeudi' },
  { dayOfWeek: 5, label: 'Vendredi' },
  { dayOfWeek: 6, label: 'Samedi' },
  { dayOfWeek: 0, label: 'Dimanche' },
] as const

function mediaSrc(url: string) {
  return resolveMediaUrl(url)
}

const MONITEUR_BIO_MAX = 2000
const MONITEUR_PHOTOS_MAX = 12
const MONITEUR_VIDEOS_MAX = 6

function isAllowedMoniteurVideoUrl(raw: string): boolean {
  const trimmed = raw.trim()
  if (!trimmed) return false
  try {
    const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`
    const url = new URL(withScheme)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false
    const host = url.hostname.replace(/^www\./, '')
    if (host === 'youtu.be') return url.pathname.split('/').filter(Boolean).length >= 1
    if (
      host === 'youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'youtube-nocookie.com' ||
      host === 'music.youtube.com'
    ) {
      return Boolean(url.searchParams.get('v') || /\/(embed|shorts|live|v)\//.test(url.pathname))
    }
    if (host.endsWith('vimeo.com')) {
      return url.pathname.split('/').some((part) => /^\d+$/.test(part))
    }
    return false
  } catch {
    return false
  }
}

type TimeInterval = {
  start: string
  end: string
}

type EditDayHours = {
  dayOfWeek: number
  enabled: boolean
  morning: TimeInterval
  afternoonEnabled: boolean
  afternoon: TimeInterval
}

function sortSlots(slots: WeeklyAvailabilitySlot[]) {
  return [...slots].sort((a, b) => String(a.start).localeCompare(String(b.start)))
}

function toEditDayHours(slots: WeeklyAvailabilitySlot[] | undefined): EditDayHours[] {
  return WEEK_DAYS.map(({ dayOfWeek }) => {
    const same = sortSlots(
      (slots || []).filter((slot) => Number(slot.dayOfWeek) === dayOfWeek),
    )
    const first = same[0]
    const second = same[1]
    return {
      dayOfWeek,
      enabled: same.length > 0,
      morning: {
        start: first?.start || '08:00',
        end: first?.end || '12:00',
      },
      afternoonEnabled: Boolean(second),
      afternoon: {
        start: second?.start || '14:00',
        end: second?.end || '18:00',
      },
    }
  })
}

function fromEditDayHours(days: EditDayHours[]): WeeklyAvailabilitySlot[] {
  const result: WeeklyAvailabilitySlot[] = []
  for (const day of days) {
    if (!day.enabled) continue
    result.push({
      dayOfWeek: day.dayOfWeek,
      start: day.morning.start,
      end: day.morning.end,
    })
    if (day.afternoonEnabled) {
      result.push({
        dayOfWeek: day.dayOfWeek,
        start: day.afternoon.start,
        end: day.afternoon.end,
      })
    }
  }
  return result
}

function intervalInvalid(interval: TimeInterval) {
  return !interval.start || !interval.end || interval.end <= interval.start
}

export function MoniteursPage() {
  const [moniteurs, setMoniteurs] = useState<Moniteur[]>([])
  const [editDayHours, setEditDayHours] = useState<EditDayHours[]>(() => toEditDayHours([]))
  const [loading, setLoading] = useState(true)
  const [savingMoniteur, setSavingMoniteur] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [moniteurName, setMoniteurName] = useState('')
  const [createPassword, setCreatePassword] = useState('')
  const [createdLoginEmail, setCreatedLoginEmail] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [editingMoniteur, setEditingMoniteur] = useState<Moniteur | null>(null)
  const [editBio, setEditBio] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [editActiveLogin, setEditActiveLogin] = useState(false)
  const [editSpecialties, setEditSpecialties] = useState('')
  const [editVehicleBrand, setEditVehicleBrand] = useState('')
  const [editVehiclePhotoUrl, setEditVehiclePhotoUrl] = useState('')
  const [editPhotoUrl, setEditPhotoUrl] = useState('')
  const [editCity, setEditCity] = useState('')
  const [uploadingEditMoniteurPhoto, setUploadingEditMoniteurPhoto] = useState(false)
  const [editPhotos, setEditPhotos] = useState<string[]>([])
  const [editVideos, setEditVideos] = useState<string[]>([])
  const [editNewVideoUrl, setEditNewVideoUrl] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [uploadingEditPhoto, setUploadingEditPhoto] = useState(false)
  const [uploadingEditVehiclePhoto, setUploadingEditVehiclePhoto] = useState(false)

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const token = getAdminToken()
    if (!token) return
    if (!opts?.silent) setLoading(true)
    setError(null)
    try {
      const moniteursData = await fetchMoniteurs(token)
      setMoniteurs(moniteursData.moniteurs)
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible')
    } finally {
      if (!opts?.silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const handleCreateMoniteur = async (e: FormEvent) => {
    e.preventDefault()
    const token = getAdminToken()
    if (!token) return
    const name = moniteurName.trim()
    const password = createPassword
    if (name.length < 2) {
      setError('Saisissez le nom du moniteur')
      return
    }
    if (password.length < 8) {
      setError('Mot de passe : minimum 8 caractères')
      return
    }

    setSavingMoniteur(true)
    setError(null)
    setCreatedLoginEmail(null)
    try {
      const data = await createMoniteur(token, {
        fullName: name,
        password,
        activeLogin: true,
      })
      const loginEmail = data.loginEmail || data.moniteur.email || ''
      setMoniteurName('')
      setCreatePassword('')
      setCreatedLoginEmail(loginEmail || null)
      setSuccess(
        loginEmail
          ? `Compte « ${data.moniteur.fullName} » créé. Identifiant : ${loginEmail} — remettez-le avec le mot de passe au moniteur. Le profil public se remplit sur le portail.`
          : `Compte « ${data.moniteur.fullName} » créé.`,
      )
      await load()
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Création impossible')
    } finally {
      setSavingMoniteur(false)
    }
  }

  const handleDeleteMoniteur = async (item: Moniteur) => {
    const token = getAdminToken()
    if (!token) return
    const confirmed = window.confirm(
      `Supprimer le moniteur « ${item.fullName} » et son véhicule ?`,
    )
    if (!confirmed) return

    setDeletingId(item.id)
    setError(null)
    try {
      await deleteMoniteur(token, item.id)
      setSuccess(`Moniteur « ${item.fullName} » supprimé.`)
      if (editingMoniteur?.id === item.id) setEditingMoniteur(null)
      await load()
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Suppression impossible')
    } finally {
      setDeletingId(null)
    }
  }

  const openEdit = (item: Moniteur) => {
    setEditingMoniteur(item)
    setEditBio(item.bio || '')
    setEditPhone(item.phone || '')
    setEditEmail(item.email || '')
    setEditPassword('')
    setEditActiveLogin(Boolean(item.activeLogin))
    setEditSpecialties((item.specialties || []).join(', '))
    setEditVehicleBrand(item.vehicleBrand || '')
    setEditVehiclePhotoUrl(item.vehiclePhotoUrl || '')
    setEditPhotoUrl(item.photoUrl || '')
    setEditCity(item.city || '')
    setEditPhotos(item.photos || [])
    setEditVideos(item.videos || [])
    setEditNewVideoUrl('')
    setEditDayHours(toEditDayHours(item.weeklyAvailability))
    setError(null)
    setSuccess(null)
  }

  const closeEdit = () => setEditingMoniteur(null)

  const handleEditGalleryUpload = async (file: File | null) => {
    if (!file) return
    if (editPhotos.length >= MONITEUR_PHOTOS_MAX) {
      setError(`Maximum ${MONITEUR_PHOTOS_MAX} photos dans la galerie.`)
      return
    }
    const token = getAdminToken()
    if (!token) return
    setUploadingEditPhoto(true)
    setError(null)
    try {
      const { imageUrl } = await uploadVehiclePhoto(token, file)
      setEditPhotos((prev) => [...prev, imageUrl].slice(0, MONITEUR_PHOTOS_MAX))
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Import photo impossible')
    } finally {
      setUploadingEditPhoto(false)
    }
  }

  const handleEditMoniteurPhotoUpload = async (file: File | null) => {
    if (!file) return
    const token = getAdminToken()
    if (!token) return
    setUploadingEditMoniteurPhoto(true)
    setError(null)
    try {
      const { imageUrl } = await uploadVehiclePhoto(token, file)
      setEditPhotoUrl(imageUrl)
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Import photo impossible')
    } finally {
      setUploadingEditMoniteurPhoto(false)
    }
  }

  const handleEditVehiclePhotoUpload = async (file: File | null) => {
    if (!file) return
    const token = getAdminToken()
    if (!token) return
    setUploadingEditVehiclePhoto(true)
    setError(null)
    try {
      const { imageUrl } = await uploadVehiclePhoto(token, file)
      setEditVehiclePhotoUrl(imageUrl)
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Import photo impossible')
    } finally {
      setUploadingEditVehiclePhoto(false)
    }
  }

  const removeEditPhoto = (url: string) => {
    setEditPhotos((prev) => prev.filter((item) => item !== url))
  }

  const addEditVideo = () => {
    const url = editNewVideoUrl.trim()
    if (!url) return
    if (!isAllowedMoniteurVideoUrl(url)) {
      setError('Vidéo : uniquement un lien YouTube ou Vimeo (https).')
      return
    }
    if (editVideos.length >= MONITEUR_VIDEOS_MAX) {
      setError(`Maximum ${MONITEUR_VIDEOS_MAX} vidéos de présentation.`)
      return
    }
    if (editVideos.includes(url)) {
      setEditNewVideoUrl('')
      return
    }
    setError('')
    setEditVideos((prev) => [...prev, url])
    setEditNewVideoUrl('')
  }

  const removeEditVideo = (url: string) => {
    setEditVideos((prev) => prev.filter((item) => item !== url))
  }

  const handleSaveEdit = async () => {
    const token = getAdminToken()
    if (!token || !editingMoniteur) return
    const invalid = editDayHours.find((day) => {
      if (!day.enabled) return false
      if (intervalInvalid(day.morning)) return true
      if (day.afternoonEnabled && intervalInvalid(day.afternoon)) return true
      return false
    })
    if (invalid) {
      setError('Pour chaque plage, l’heure de fin doit être après l’heure de début')
      return
    }
    setSavingEdit(true)
    setError(null)
    setSuccess(null)
    try {
      const slots = fromEditDayHours(editDayHours)
      const { moniteur } = await updateMoniteur(token, editingMoniteur.id, {
        bio: editBio.trim().slice(0, MONITEUR_BIO_MAX),
        phone: editPhone.trim(),
        email: editEmail.trim().toLowerCase(),
        activeLogin: editActiveLogin,
        ...(editPassword.trim() ? { password: editPassword.trim() } : {}),
        specialties: editSpecialties
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        vehicleBrand: editVehicleBrand.trim(),
        vehiclePhotoUrl: editVehiclePhotoUrl,
        photoUrl: editPhotoUrl,
        city: editCity.trim(),
        photos: editPhotos.slice(0, MONITEUR_PHOTOS_MAX),
        videos: editVideos.slice(0, MONITEUR_VIDEOS_MAX),
        weeklyAvailability: slots,
      })
      setSuccess(`« ${moniteur.fullName} » enregistré (profil + disponibilité).`)
      setEditingMoniteur(null)
      await load()
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Mise à jour impossible')
    } finally {
      setSavingEdit(false)
    }
  }

  const updateEditDay = (dayOfWeek: number, patch: Partial<EditDayHours>) => {
    setEditDayHours((prev) =>
      prev.map((day) => (day.dayOfWeek === dayOfWeek ? { ...day, ...patch } : day)),
    )
  }

  const updateEditInterval = (
    dayOfWeek: number,
    which: 'morning' | 'afternoon',
    patch: Partial<TimeInterval>,
  ) => {
    setEditDayHours((prev) =>
      prev.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? { ...day, [which]: { ...day[which], ...patch } }
          : day,
      ),
    )
  }

  const stats = useMemo(
    () => ({
      total: moniteurs.length,
      active: moniteurs.filter((item) => item.active !== false).length,
      login: moniteurs.filter((item) => item.activeLogin).length,
      scheduled: moniteurs.filter((item) => (item.weeklyAvailability || []).length > 0).length,
    }),
    [moniteurs],
  )

  return (
    <ConduiteSection
      kicker="Gestion"
      title="Moniteurs"
      subtitle="Créez uniquement le compte (nom + mot de passe). Le moniteur complète ensuite son profil sur le portail."
    >
      {error ? <p className="cx-note cx-note-err" role="alert">{error}</p> : null}
      {success ? <p className="cx-note cx-note-ok" role="status">{success}</p> : null}
      {createdLoginEmail ? (
        <p className="cx-note cx-note-info" role="status">
          Identifiant de connexion à remettre : <strong>{createdLoginEmail}</strong>
        </p>
      ) : null}

      <div className="cx-kc-grid">
        <div className="cx-kc">
          <span className="cx-kc-ico cx-kc-blue">
            <Users aria-hidden />
          </span>
          <div className="cx-kc-body">
            <span className="cx-kc-label">Moniteurs</span>
            <span className="cx-kc-value">{nf(stats.total)}</span>
            <span className="cx-kc-sub">comptes créés</span>
          </div>
        </div>
        <div className="cx-kc">
          <span className="cx-kc-ico cx-kc-green">
            <CheckCircle2 aria-hidden />
          </span>
          <div className="cx-kc-body">
            <span className="cx-kc-label">Actifs</span>
            <span className="cx-kc-value">{nf(stats.active)}</span>
            <span className="cx-kc-sub">visibles côté élèves</span>
          </div>
        </div>
        <div className="cx-kc">
          <span className="cx-kc-ico cx-kc-sky">
            <KeyRound aria-hidden />
          </span>
          <div className="cx-kc-body">
            <span className="cx-kc-label">Portail activé</span>
            <span className="cx-kc-value">{nf(stats.login)}</span>
            <span className="cx-kc-sub">peuvent se connecter</span>
          </div>
        </div>
        <div className="cx-kc">
          <span className="cx-kc-ico cx-kc-gold">
            <UserCog aria-hidden />
          </span>
          <div className="cx-kc-body">
            <span className="cx-kc-label">Disponibilités</span>
            <span className="cx-kc-value">
              {nf(stats.scheduled)} <small>/ {nf(stats.total)}</small>
            </span>
            <span className="cx-kc-sub">ont défini leurs horaires</span>
          </div>
        </div>
      </div>

      <section className="cx-panel">
        <div className="cx-panel-head cx-ph cx-ph-plain">
          <span className="cx-phi cx-phi-tile">
            <Plus aria-hidden />
          </span>
          <div className="cx-ph-txt">
            <h2 className="cx-panel-title">Créer un compte moniteur</h2>
            <p className="cx-muted">
              Un identifiant de connexion est généré automatiquement. Photos, véhicule, ville et bio sont saisis par le
              moniteur sur son portail.
            </p>
          </div>
        </div>
        <form onSubmit={handleCreateMoniteur} className="cx-field-row">
          <input
            className="cx-input"
            value={moniteurName}
            onChange={(e) => setMoniteurName(e.target.value)}
            placeholder="Nom complet"
            required
            minLength={2}
          />
          <input
            className="cx-input"
            type="password"
            value={createPassword}
            onChange={(e) => setCreatePassword(e.target.value)}
            placeholder="Mot de passe (min. 8)"
            autoComplete="new-password"
            required
            minLength={8}
          />
          <button type="submit" className="cx-btn cx-btn-fill" disabled={savingMoniteur}>
            <Plus aria-hidden />
            {savingMoniteur ? 'Création…' : 'Créer le compte'}
          </button>
        </form>
      </section>

      <div className="cx-mon-grid">
        <aside className="cx-panel cx-sticky" aria-label="Équipe">
          <div className="cx-panel-head cx-ph cx-ph-plain">
            <div className="cx-ph-txt">
              <h2 className="cx-panel-title">Équipe</h2>
              <p className="cx-muted">Vue support : profils et plages horaires</p>
            </div>
          </div>
          {loading && moniteurs.length === 0 ? <SkeletonBlock rows={4} /> : null}
          {!loading && moniteurs.length === 0 ? (
            <EmptyState title="Aucun moniteur" description="Créez d’abord un compte ci-dessus." />
          ) : null}
          <div className="cx-mon-list">
            {moniteurs.map((item) => {
              const active = editingMoniteur?.id === item.id
              const hasSchedule = (item.weeklyAvailability || []).length > 0
              return (
                <div key={item.id} className={`cx-mon${active ? ' cx-sel' : ''}`}>
                  <button type="button" className="cx-mon-pick" onClick={() => openEdit(item)}>
                    {item.vehiclePhotoUrl ? (
                      <img src={mediaSrc(item.vehiclePhotoUrl)} alt="" />
                    ) : (
                      <span className="cx-mon-ph">Véhicule</span>
                    )}
                    <span className="cx-mon-meta">
                      <strong>{item.fullName}</strong>
                      <span>{item.vehicleBrand || 'Marque non renseignée'}</span>
                      <span>
                        {item.city ? `${item.city} · ` : ''}
                        {hasSchedule ? 'Dispo OK' : 'Dispo à définir'}
                      </span>
                    </span>
                  </button>
                  <div className="cx-mon-act">
                    <button
                      type="button"
                      className="cx-btn cx-btn-icon"
                      title="Modifier profil et disponibilité"
                      onClick={() => openEdit(item)}
                    >
                      <Pencil aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="cx-btn cx-btn-icon cx-btn-danger"
                      title="Supprimer le moniteur"
                      disabled={deletingId === item.id}
                      onClick={() => void handleDeleteMoniteur(item)}
                    >
                      <Trash2 aria-hidden />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </aside>

        {editingMoniteur ? (
          <section className="cx-panel" key={editingMoniteur.id}>
            <div className="cx-detail-head">
              <span className="cx-chap-num">
                {editingMoniteur.fullName
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join('')
                  .toUpperCase()}
              </span>
              <div className="cx-detail-title">
                <small>Modifier le moniteur</small>
                <h2>{editingMoniteur.fullName}</h2>
              </div>
              <button type="button" className="cx-btn cx-btn-icon" title="Fermer" onClick={closeEdit}>
                <X aria-hidden />
              </button>
            </div>

            <div className="cx-edit-cols" style={{ marginTop: '1.1rem' }}>
              <div className="cx-edit-col">
                <div className="cx-block">
                  <h3>Coordonnées & accès</h3>
                  <div className="cx-form-grid">
                    <input className="cx-input" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="Téléphone" />
                    <input className="cx-input" type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Email (portail moniteur)" />
                    <input
                      className="cx-input"
                      type="password"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder={editingMoniteur.hasPassword ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe portail (min. 8)'}
                      autoComplete="new-password"
                    />
                    <label className="cx-check" style={{ alignSelf: 'center' }}>
                      <input type="checkbox" checked={editActiveLogin} onChange={(e) => setEditActiveLogin(e.target.checked)} />
                      <span>Activer la connexion portail</span>
                    </label>
                    <input className="cx-input" value={editSpecialties} onChange={(e) => setEditSpecialties(e.target.value)} placeholder="Spécialités (séparées par des virgules)" />
                    <input className="cx-input" value={editVehicleBrand} onChange={(e) => setEditVehicleBrand(e.target.value)} placeholder="Marque du véhicule" />
                    <input className="cx-input" value={editCity} onChange={(e) => setEditCity(e.target.value)} placeholder="Ville / zone" />
                  </div>
                </div>

                <div className="cx-block">
                  <h3>Présentation</h3>
                  <textarea
                    className="cx-textarea"
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value.slice(0, MONITEUR_BIO_MAX))}
                    placeholder="Présentez ce moniteur aux élèves (expérience, pédagogie…)"
                    rows={4}
                    maxLength={MONITEUR_BIO_MAX}
                  />
                  <span className="cx-counter">
                    {editBio.length}/{MONITEUR_BIO_MAX}
                  </span>
                </div>

                <div className="cx-block">
                  <h3>Disponibilité (jours & horaires)</h3>
                  <p>Cochez les jours libres. Jusqu’à 2 plages par jour (matin et après-midi).</p>
                  <div className="cx-hours">
                    {editDayHours.map((day) => {
                      const label = WEEK_DAYS.find((item) => item.dayOfWeek === day.dayOfWeek)?.label || 'Jour'
                      return (
                        <div key={day.dayOfWeek} className={`cx-day${day.enabled ? '' : ' cx-off'}`}>
                          <label className="cx-check">
                            <input
                              type="checkbox"
                              checked={day.enabled}
                              onChange={(e) =>
                                updateEditDay(day.dayOfWeek, {
                                  enabled: e.target.checked,
                                  ...(e.target.checked ? {} : { afternoonEnabled: false }),
                                })
                              }
                            />
                            <span>{label}</span>
                          </label>
                          <div className="cx-day-rows">
                            <div className="cx-day-row">
                              <span className="cx-slot">Matin</span>
                              <input
                                type="time"
                                value={day.morning.start}
                                disabled={!day.enabled}
                                onChange={(e) => updateEditInterval(day.dayOfWeek, 'morning', { start: e.target.value })}
                                aria-label={`${label} matin début`}
                              />
                              <span>à</span>
                              <input
                                type="time"
                                value={day.morning.end}
                                disabled={!day.enabled}
                                onChange={(e) => updateEditInterval(day.dayOfWeek, 'morning', { end: e.target.value })}
                                aria-label={`${label} matin fin`}
                              />
                            </div>
                            <div className="cx-day-row">
                              <label className="cx-check cx-slot">
                                <input
                                  type="checkbox"
                                  checked={day.afternoonEnabled}
                                  disabled={!day.enabled}
                                  onChange={(e) => updateEditDay(day.dayOfWeek, { afternoonEnabled: e.target.checked })}
                                />
                                <span>Après-midi</span>
                              </label>
                              <input
                                type="time"
                                value={day.afternoon.start}
                                disabled={!day.enabled || !day.afternoonEnabled}
                                onChange={(e) => updateEditInterval(day.dayOfWeek, 'afternoon', { start: e.target.value })}
                                aria-label={`${label} après-midi début`}
                              />
                              <span>à</span>
                              <input
                                type="time"
                                value={day.afternoon.end}
                                disabled={!day.enabled || !day.afternoonEnabled}
                                onChange={(e) => updateEditInterval(day.dayOfWeek, 'afternoon', { end: e.target.value })}
                                aria-label={`${label} après-midi fin`}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="cx-edit-col">
                <div className="cx-block">
                  <h3>Photo du moniteur</h3>
                  <div className="cx-photo-box">
                    {editPhotoUrl ? <img src={mediaSrc(editPhotoUrl)} alt="Moniteur" /> : <span className="cx-photo-ph">Moniteur</span>}
                    <label className="cx-filebtn">
                      <ImagePlus aria-hidden />
                      {uploadingEditMoniteurPhoto ? 'Import…' : 'Changer'}
                      <input type="file" accept="image/*" hidden onChange={(e) => void handleEditMoniteurPhotoUpload(e.target.files?.[0] ?? null)} />
                    </label>
                  </div>
                </div>

                <div className="cx-block">
                  <h3>Photo du véhicule</h3>
                  <div className="cx-photo-box">
                    {editVehiclePhotoUrl ? <img src={mediaSrc(editVehiclePhotoUrl)} alt="Véhicule" /> : <span className="cx-photo-ph">Véhicule</span>}
                    <label className="cx-filebtn">
                      <ImagePlus aria-hidden />
                      {uploadingEditVehiclePhoto ? 'Import…' : 'Changer'}
                      <input type="file" accept="image/*" hidden onChange={(e) => void handleEditVehiclePhotoUpload(e.target.files?.[0] ?? null)} />
                    </label>
                  </div>
                </div>

                <div className="cx-block">
                  <h3>Galerie de photos</h3>
                  <div className="cx-gallery">
                    {editPhotos.map((url) => (
                      <div key={url} className="cx-gallery-item">
                        <img src={mediaSrc(url)} alt="" />
                        <button type="button" onClick={() => removeEditPhoto(url)} title="Retirer">
                          <X aria-hidden />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="cx-filebtn">
                      <ImagePlus aria-hidden />
                      {uploadingEditPhoto ? 'Import…' : 'Ajouter une photo'}
                      <input type="file" accept="image/*" hidden onChange={(e) => void handleEditGalleryUpload(e.target.files?.[0] ?? null)} />
                    </label>
                  </div>
                </div>

                <div className="cx-block">
                  <h3>Vidéos de présentation</h3>
                  <p>Liens YouTube ou Vimeo uniquement.</p>
                  <div className="cx-videos">
                    {editVideos.map((url) => (
                      <div key={url} className="cx-video">
                        <span>{url}</span>
                        <button type="button" onClick={() => removeEditVideo(url)} title="Retirer">
                          <X aria-hidden />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="cx-field-row">
                    <input
                      className="cx-input"
                      value={editNewVideoUrl}
                      onChange={(e) => setEditNewVideoUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=…"
                    />
                    <button type="button" className="cx-btn" onClick={addEditVideo}>
                      <Plus aria-hidden />
                      Ajouter
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="cx-actions" style={{ marginTop: '1.1rem' }}>
              <button type="button" className="cx-btn" onClick={closeEdit}>
                Annuler
              </button>
              <button type="button" className="cx-btn cx-btn-fill" disabled={savingEdit} onClick={() => void handleSaveEdit()}>
                {savingEdit ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </section>
        ) : (
          <section className="cx-panel">
            <EmptyState
              title="Aucun moniteur sélectionné"
              description="Choisissez un moniteur dans la liste pour modifier son profil et sa disponibilité."
            />
          </section>
        )}
      </div>
    </ConduiteSection>
  )
}
