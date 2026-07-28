import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { ImagePlus, Pencil, Plus, Trash2, X } from 'lucide-react'
import {
  createMoniteur,
  deleteAdminReservation,
  deleteMoniteur,
  fetchAdminReservations,
  fetchMoniteurs,
  updateMoniteur,
  uploadVehiclePhoto,
} from '../../api/reservations'
import { AdminSectionHeader } from '../../components/AdminSectionHeader'
import { getAdminToken, isAuthError } from '../../context/AdminAuthContext'
import type {
  Moniteur,
  ReservationAdmin,
  WeeklyAvailabilitySlot,
} from '../../types/reservations'
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

type EditDayHours = {
  dayOfWeek: number
  enabled: boolean
  start: string
  end: string
}

function toEditDayHours(slots: WeeklyAvailabilitySlot[] | undefined): EditDayHours[] {
  return WEEK_DAYS.map(({ dayOfWeek }) => {
    const same = (slots || []).filter((slot) => Number(slot.dayOfWeek) === dayOfWeek)
    const starts = same.map((slot) => slot.start || '08:00').sort()
    const ends = same.map((slot) => slot.end || '18:00').sort()
    return {
      dayOfWeek,
      enabled: same.length > 0,
      start: starts[0] || '08:00',
      end: ends[ends.length - 1] || '18:00',
    }
  })
}

function fromEditDayHours(days: EditDayHours[]): WeeklyAvailabilitySlot[] {
  return days
    .filter((day) => day.enabled)
    .map(({ dayOfWeek, start, end }) => ({ dayOfWeek, start, end }))
}

export function ReservationsPage() {
  const [moniteurs, setMoniteurs] = useState<Moniteur[]>([])
  const [reservations, setReservations] = useState<ReservationAdmin[]>([])
  const [moniteurId, setMoniteurId] = useState('')
  const [scheduleDayHours, setScheduleDayHours] = useState<EditDayHours[]>(() => toEditDayHours([]))
  const [savingSchedule, setSavingSchedule] = useState(false)
  const [loading, setLoading] = useState(true)
  const [savingMoniteur, setSavingMoniteur] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [moniteurName, setMoniteurName] = useState('')
  const [vehicleBrand, setVehicleBrand] = useState('')
  const [formVehicleType, setFormVehicleType] = useState('')
  const [vehiclePhotoUrl, setVehiclePhotoUrl] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [city, setCity] = useState('')
  const [uploadingMoniteurPhoto, setUploadingMoniteurPhoto] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingReservationId, setDeletingReservationId] = useState<string | null>(null)

  const [editingMoniteur, setEditingMoniteur] = useState<Moniteur | null>(null)
  const [editBio, setEditBio] = useState('')
  const [editPhone, setEditPhone] = useState('')
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

  const selectedMoniteur = useMemo(
    () => moniteurs.find((item) => item.id === moniteurId) ?? null,
    [moniteurs, moniteurId],
  )

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    const token = getAdminToken()
    if (!token) return
    if (!opts?.silent) setLoading(true)
    setError(null)
    try {
      const [moniteursData, reservationsData] = await Promise.all([
        fetchMoniteurs(token),
        fetchAdminReservations(token),
      ])
      setMoniteurs(moniteursData.moniteurs)
      setReservations(reservationsData.reservations || [])
      setMoniteurId((current) => {
        if (current && moniteursData.moniteurs.some((item) => item.id === current)) {
          return current
        }
        return moniteursData.moniteurs[0]?.id || ''
      })
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible')
    } finally {
      if (!opts?.silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const timer = window.setInterval(() => {
      void load({ silent: true })
    }, 8000)
    return () => window.clearInterval(timer)
  }, [load])

  useEffect(() => {
    if (!selectedMoniteur) {
      setScheduleDayHours(toEditDayHours([]))
      return
    }
    setScheduleDayHours(toEditDayHours(selectedMoniteur.weeklyAvailability))
  }, [selectedMoniteur])

  const handlePhotoUpload = async (file: File | null) => {
    if (!file) return
    const token = getAdminToken()
    if (!token) return
    setUploadingPhoto(true)
    setError(null)
    try {
      const { imageUrl } = await uploadVehiclePhoto(token, file)
      setVehiclePhotoUrl(imageUrl)
      setSuccess('Photo du véhicule importée.')
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Import photo impossible')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleMoniteurPhotoUpload = async (file: File | null) => {
    if (!file) return
    const token = getAdminToken()
    if (!token) return
    setUploadingMoniteurPhoto(true)
    setError(null)
    try {
      const { imageUrl } = await uploadVehiclePhoto(token, file)
      setPhotoUrl(imageUrl)
      setSuccess('Photo du moniteur importée.')
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Import photo impossible')
    } finally {
      setUploadingMoniteurPhoto(false)
    }
  }

  const handleCreateMoniteur = async (e: FormEvent) => {
    e.preventDefault()
    const token = getAdminToken()
    if (!token) return
    const name = moniteurName.trim()
    const type = formVehicleType.trim()
    if (name.length < 2) {
      setError('Saisissez le nom du moniteur')
      return
    }
    if (type.length < 2) {
      setError('Saisissez le type de véhicule')
      return
    }

    setSavingMoniteur(true)
    setError(null)
    try {
      const { moniteur } = await createMoniteur(token, {
        fullName: name,
        vehicleBrand: vehicleBrand.trim(),
        vehiclePhotoUrl,
        photoUrl,
        city: city.trim(),
        vehicleTypes: [type.trim().toLowerCase()],
      })
      setMoniteurName('')
      setVehicleBrand('')
      setFormVehicleType('')
      setVehiclePhotoUrl('')
      setPhotoUrl('')
      setCity('')
      setSuccess(`Moniteur « ${moniteur.fullName} » ajouté.`)
      await load()
      setMoniteurId(moniteur.id)
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
      if (moniteurId === item.id) setMoniteurId('')
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
    setEditSpecialties((item.specialties || []).join(', '))
    setEditVehicleBrand(item.vehicleBrand || '')
    setEditVehiclePhotoUrl(item.vehiclePhotoUrl || '')
    setEditPhotoUrl(item.photoUrl || '')
    setEditCity(item.city || '')
    setEditPhotos(item.photos || [])
    setEditVideos(item.videos || [])
    setEditNewVideoUrl('')
    setError(null)
  }

  const closeEdit = () => setEditingMoniteur(null)

  const handleEditGalleryUpload = async (file: File | null) => {
    if (!file) return
    const token = getAdminToken()
    if (!token) return
    setUploadingEditPhoto(true)
    setError(null)
    try {
      const { imageUrl } = await uploadVehiclePhoto(token, file)
      setEditPhotos((prev) => [...prev, imageUrl])
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
    setEditVideos((prev) => [...prev, url])
    setEditNewVideoUrl('')
  }

  const removeEditVideo = (url: string) => {
    setEditVideos((prev) => prev.filter((item) => item !== url))
  }

  const handleSaveEdit = async () => {
    const token = getAdminToken()
    if (!token || !editingMoniteur) return
    setSavingEdit(true)
    setError(null)
    try {
      const { moniteur } = await updateMoniteur(token, editingMoniteur.id, {
        bio: editBio.trim(),
        phone: editPhone.trim(),
        specialties: editSpecialties
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        vehicleBrand: editVehicleBrand.trim(),
        vehiclePhotoUrl: editVehiclePhotoUrl,
        photoUrl: editPhotoUrl,
        city: editCity.trim(),
        photos: editPhotos,
        videos: editVideos,
      })
      setSuccess(`Profil de « ${moniteur.fullName} » mis à jour.`)
      setEditingMoniteur(null)
      await load()
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Mise à jour impossible')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleSaveSchedule = async () => {
    const token = getAdminToken()
    if (!token || !moniteurId || !selectedMoniteur) return
    const invalid = scheduleDayHours.find(
      (day) => day.enabled && day.end <= day.start,
    )
    if (invalid) {
      setError('Pour chaque jour coché, l’heure de fin doit être après l’heure de début')
      return
    }
    setSavingSchedule(true)
    setError(null)
    try {
      const { moniteur } = await updateMoniteur(token, moniteurId, {
        weeklyAvailability: fromEditDayHours(scheduleDayHours),
      })
      setSuccess(
        `Disponibilité de « ${moniteur.fullName} » enregistrée. Les élèves voient ces jours et choisissent leurs horaires.`,
      )
      await load({ silent: true })
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Enregistrement des horaires impossible')
    } finally {
      setSavingSchedule(false)
    }
  }

  const updateScheduleDay = (dayOfWeek: number, patch: Partial<EditDayHours>) => {
    setScheduleDayHours((prev) =>
      prev.map((day) => (day.dayOfWeek === dayOfWeek ? { ...day, ...patch } : day)),
    )
  }

  const handleDeleteReservation = async (reservation: ReservationAdmin) => {
    const token = getAdminToken()
    if (!token) return
    const label = reservation.creneau
      ? `${reservation.creneau.date} à ${reservation.creneau.startTime}`
      : 'cette réservation'
    const who = reservation.user
      ? `${reservation.user.firstName} ${reservation.user.lastName}`
      : 'l’élève'
    if (
      !window.confirm(
        `Supprimer la réservation de ${who} (${label}) ?\nLe créneau sera libéré.`,
      )
    ) {
      return
    }
    setDeletingReservationId(reservation.id)
    setError(null)
    try {
      await deleteAdminReservation(token, reservation.id)
      setSuccess('Réservation supprimée.')
      await load({ silent: true })
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Suppression impossible')
    } finally {
      setDeletingReservationId(null)
    }
  }

  return (
    <div className="admin-page">
      <AdminSectionHeader
        backTo="/conduite"
        backLabel="Conduite"
        kicker="Gestion"
        title="Réservations & moniteurs"
        subtitle="Définissez les jours libres de chaque moniteur. Les élèves choisissent ensuite leurs horaires."
      />

      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}

      <section className="admin-section">
        <div className="admin-section-head">
          <h3 className="admin-section-label">1. Moniteur & véhicule</h3>
        </div>
        <form onSubmit={handleCreateMoniteur} className="admin-section-body">
          <div className="admin-toolbar">
            <input
              value={moniteurName}
              onChange={(e) => setMoniteurName(e.target.value)}
              placeholder="Nom du moniteur"
              required
              minLength={2}
            />
            <input
              value={vehicleBrand}
              onChange={(e) => setVehicleBrand(e.target.value)}
              placeholder="Marque (ex. Toyota Corolla)"
            />
            <input
              value={formVehicleType}
              onChange={(e) => setFormVehicleType(e.target.value)}
              placeholder="Type (ex. Voiture, Moto…)"
              required
              minLength={2}
              aria-label="Type de véhicule"
            />
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ville / zone (ex. Cotonou, Calavi…)"
              aria-label="Ville du moniteur"
            />
            <label className="btn-outline btn-file">
              <ImagePlus size={15} />
              {uploadingMoniteurPhoto ? 'Import…' : 'Photo moniteur'}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => void handleMoniteurPhotoUpload(e.target.files?.[0] ?? null)}
              />
            </label>
            <label className="btn-outline btn-file">
              <ImagePlus size={15} />
              {uploadingPhoto ? 'Import…' : 'Photo véhicule'}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => void handlePhotoUpload(e.target.files?.[0] ?? null)}
              />
            </label>
            <button
              type="submit"
              className="btn-primary btn-primary-inline"
              disabled={savingMoniteur || uploadingPhoto || uploadingMoniteurPhoto}
            >
              <Plus size={16} />
              {savingMoniteur ? 'Ajout…' : 'Enregistrer'}
            </button>
          </div>

          {photoUrl ? (
            <div className="moniteur-vehicle-preview">
              <img src={mediaSrc(photoUrl)} alt="Moniteur" />
              <div>
                <p className="admin-muted">Aperçu photo moniteur</p>
                <button type="button" className="btn-text-danger" onClick={() => setPhotoUrl('')}>
                  <Trash2 size={14} />
                  Retirer
                </button>
              </div>
            </div>
          ) : null}

          {vehiclePhotoUrl ? (
            <div className="moniteur-vehicle-preview">
              <img src={mediaSrc(vehiclePhotoUrl)} alt="Véhicule" />
              <div>
                <p className="admin-muted">Aperçu photo véhicule</p>
                <button
                  type="button"
                  className="btn-text-danger"
                  onClick={() => setVehiclePhotoUrl('')}
                >
                  <Trash2 size={14} />
                  Retirer
                </button>
              </div>
            </div>
          ) : null}
        </form>
      </section>

      <section className="admin-section">
        <div className="admin-section-head">
          <h3 className="admin-section-label">2. Disponibilité du moniteur</h3>
          <p className="admin-section-hint">
            Cochez les jours où le moniteur est libre et indiquez ses horaires. L’élève voit
            cette disponibilité et choisit lui-même de telle heure à telle heure.
          </p>
        </div>
        <div className="admin-section-body">
          {moniteurs.length === 0 ? (
            <p className="admin-empty">Créez d’abord un moniteur ci-dessus.</p>
          ) : (
            <div className="moniteur-pick-grid">
              {moniteurs.map((item) => {
                const active = item.id === moniteurId
                return (
                  <div
                    key={item.id}
                    className={`moniteur-pick-card${active ? ' is-active' : ''}`}
                  >
                    <button
                      type="button"
                      className="moniteur-pick-main"
                      onClick={() => setMoniteurId(item.id)}
                    >
                      {item.vehiclePhotoUrl ? (
                        <img src={mediaSrc(item.vehiclePhotoUrl)} alt="" />
                      ) : (
                        <div className="moniteur-vehicle-placeholder">Véhicule</div>
                      )}
                      <div className="moniteur-pick-meta">
                        <strong>{item.fullName}</strong>
                        <span>{item.vehicleBrand || 'Marque non renseignée'}</span>
                        <span className="moniteur-pick-type">
                          {item.vehicleTypes?.[0] || 'Véhicule'}
                          {item.city ? ` · ${item.city}` : ''}
                        </span>
                      </div>
                    </button>
                    <button
                      type="button"
                      className="btn-icon moniteur-pick-edit"
                      title="Modifier le profil"
                      onClick={() => openEdit(item)}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      className="btn-icon-danger moniteur-pick-delete"
                      title="Supprimer le moniteur"
                      disabled={deletingId === item.id}
                      onClick={() => void handleDeleteMoniteur(item)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {editingMoniteur ? (
            <div className="moniteur-edit-panel">
              <div className="moniteur-edit-head">
                <h4>Profil de {editingMoniteur.fullName}</h4>
                <button type="button" className="btn-icon" title="Fermer" onClick={closeEdit}>
                  <X size={16} />
                </button>
              </div>

              <div className="admin-toolbar">
                <input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="Téléphone"
                />
                <input
                  value={editSpecialties}
                  onChange={(e) => setEditSpecialties(e.target.value)}
                  placeholder="Spécialités (séparées par des virgules)"
                />
                <input
                  value={editVehicleBrand}
                  onChange={(e) => setEditVehicleBrand(e.target.value)}
                  placeholder="Marque du véhicule"
                />
                <input
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  placeholder="Ville / zone"
                />
              </div>

              <label className="moniteur-edit-label">
                Présentation
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Présentez ce moniteur aux élèves (expérience, pédagogie…)"
                  rows={3}
                />
              </label>

              <div className="moniteur-edit-label">
                Photo du moniteur
                <div className="moniteur-vehicle-preview">
                  {editPhotoUrl ? (
                    <img src={mediaSrc(editPhotoUrl)} alt="Moniteur" />
                  ) : (
                    <div className="moniteur-vehicle-placeholder">Moniteur</div>
                  )}
                  <label className="btn-outline btn-file">
                    <ImagePlus size={15} />
                    {uploadingEditMoniteurPhoto ? 'Import…' : 'Changer'}
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => void handleEditMoniteurPhotoUpload(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
              </div>

              <div className="moniteur-edit-label">
                Photo du véhicule
                <div className="moniteur-vehicle-preview">
                  {editVehiclePhotoUrl ? (
                    <img src={mediaSrc(editVehiclePhotoUrl)} alt="Véhicule" />
                  ) : (
                    <div className="moniteur-vehicle-placeholder">Véhicule</div>
                  )}
                  <label className="btn-outline btn-file">
                    <ImagePlus size={15} />
                    {uploadingEditVehiclePhoto ? 'Import…' : 'Changer'}
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => void handleEditVehiclePhotoUpload(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
              </div>

              <div className="moniteur-edit-label">
                Galerie de photos
                <div className="moniteur-photo-gallery">
                  {editPhotos.map((url) => (
                    <div key={url} className="moniteur-photo-item">
                      <img src={mediaSrc(url)} alt="" />
                      <button type="button" onClick={() => removeEditPhoto(url)} title="Retirer">
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                  <label className="btn-outline btn-file moniteur-photo-add">
                    <ImagePlus size={15} />
                    {uploadingEditPhoto ? 'Import…' : 'Ajouter'}
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => void handleEditGalleryUpload(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>
              </div>

              <div className="moniteur-edit-label">
                Vidéos de présentation (liens)
                <div className="moniteur-video-list">
                  {editVideos.map((url) => (
                    <div key={url} className="moniteur-video-item">
                      <span>{url}</span>
                      <button type="button" onClick={() => removeEditVideo(url)} title="Retirer">
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                  <div className="moniteur-video-add">
                    <input
                      value={editNewVideoUrl}
                      onChange={(e) => setEditNewVideoUrl(e.target.value)}
                      placeholder="https://…"
                    />
                    <button type="button" className="btn-outline-sm" onClick={addEditVideo}>
                      <Plus size={14} />
                      Ajouter
                    </button>
                  </div>
                </div>
              </div>

              <div className="moniteur-edit-actions">
                <button type="button" className="btn-outline" onClick={closeEdit}>
                  Annuler
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={savingEdit}
                  onClick={() => void handleSaveEdit()}
                >
                  {savingEdit ? 'Enregistrement…' : 'Enregistrer le profil'}
                </button>
              </div>
            </div>
          ) : null}

          {selectedMoniteur ? (
            <div className="moniteur-schedule-panel">
              <div className="moniteur-generate-identity">
                {selectedMoniteur.vehiclePhotoUrl ? (
                  <img src={mediaSrc(selectedMoniteur.vehiclePhotoUrl)} alt="" />
                ) : (
                  <div className="moniteur-vehicle-placeholder">Véhicule</div>
                )}
                <div>
                  <p className="moniteur-generate-name">{selectedMoniteur.fullName}</p>
                  <p className="moniteur-generate-vehicle">
                    Jours et plages horaires de disponibilité
                  </p>
                </div>
              </div>

              <div className="moniteur-hours-grid">
                {scheduleDayHours.map((day) => {
                  const label =
                    WEEK_DAYS.find((item) => item.dayOfWeek === day.dayOfWeek)?.label || 'Jour'
                  return (
                    <div key={day.dayOfWeek} className="moniteur-hours-row">
                      <label className="moniteur-hours-day">
                        <input
                          type="checkbox"
                          checked={day.enabled}
                          onChange={(e) =>
                            updateScheduleDay(day.dayOfWeek, { enabled: e.target.checked })
                          }
                        />
                        <span>{label}</span>
                      </label>
                      <input
                        type="time"
                        value={day.start}
                        disabled={!day.enabled}
                        onChange={(e) =>
                          updateScheduleDay(day.dayOfWeek, { start: e.target.value })
                        }
                        aria-label={`${label} début`}
                      />
                      <span className="admin-muted">à</span>
                      <input
                        type="time"
                        value={day.end}
                        disabled={!day.enabled}
                        onChange={(e) => updateScheduleDay(day.dayOfWeek, { end: e.target.value })}
                        aria-label={`${label} fin`}
                      />
                    </div>
                  )
                })}
              </div>

              <div className="moniteur-edit-actions">
                <button
                  type="button"
                  className="btn-primary"
                  disabled={savingSchedule}
                  onClick={() => void handleSaveSchedule()}
                >
                  {savingSchedule ? 'Enregistrement…' : 'Enregistrer la disponibilité'}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section-head">
          <h3 className="admin-section-label">3. Réservations élèves</h3>
          <button type="button" className="btn-outline-sm" onClick={() => void load()} disabled={loading}>
            {loading ? 'Actualisation…' : 'Actualiser'}
          </button>
        </div>
        <div className="admin-section-body">
          {loading && reservations.length === 0 ? <p className="admin-empty">Chargement…</p> : null}
          {!loading && reservations.length === 0 ? (
            <p className="admin-empty">
              Aucune réservation pour le moment. Dès qu’un élève confirme une séance, elle
              apparaît ici automatiquement.
            </p>
          ) : null}
          <div className="admin-list">
            {reservations.map((reservation) => (
              <div key={String(reservation.id)} className="admin-list-item">
                <div className="admin-list-main">
                  {reservation.moniteur?.vehiclePhotoUrl ? (
                    <img
                      className="admin-list-thumb"
                      src={mediaSrc(reservation.moniteur.vehiclePhotoUrl)}
                      alt=""
                    />
                  ) : null}
                  <div className="admin-list-text">
                    <strong>
                      {reservation.user
                        ? `${reservation.user.firstName} ${reservation.user.lastName}`
                        : 'Élève'}
                    </strong>
                    <span>
                      {reservation.creneau
                        ? `${reservation.creneau.date} · ${reservation.creneau.startTime}`
                        : '—'}{' '}
                      · {reservation.moniteur?.fullName || 'Moniteur'}
                      {reservation.moniteur?.vehicleBrand
                        ? ` · ${reservation.moniteur.vehicleBrand}`
                        : ''}{' '}
                      · {reservation.vehicleType} ·{' '}
                      {reservation.heuresDebitees > 0
                        ? `${reservation.heuresDebitees} h débitée${reservation.heuresDebitees > 1 ? 's' : ''}`
                        : `${(reservation.priceFcfa || 0).toLocaleString('fr-FR')} FCFA`}
                    </span>
                    {reservation.cancellationReason ? (
                      <span className="admin-muted">
                        Motif d’annulation
                        {reservation.cancelledBy === 'learner'
                          ? ' (élève)'
                          : reservation.cancelledBy === 'admin'
                            ? ' (admin)'
                            : ''}
                        : {reservation.cancellationReason}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="admin-list-actions">
                  <span className="admin-chip">{reservation.status}</span>
                  {reservation.heuresDebitees > 0 ? (
                    <span className="admin-chip is-success">Prépayé</span>
                  ) : null}
                  <button
                    type="button"
                    className="btn-outline-sm btn-danger-sm"
                    disabled={deletingReservationId === reservation.id}
                    onClick={() => void handleDeleteReservation(reservation)}
                    title="Supprimer la réservation"
                  >
                    <Trash2 size={15} />
                    {deletingReservationId === reservation.id ? '…' : 'Supprimer'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
