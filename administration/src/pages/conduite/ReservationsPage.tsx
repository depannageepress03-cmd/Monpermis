import { FormEvent, useCallback, useEffect, useState } from 'react'
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

/**
 * Une séance payée en Mobile Money a heuresDebitees = 0 : sans ce badge, rien
 * n'indiquerait à l'admin que l'élève a bien réglé.
 */
function paymentBadge(reservation: ReservationAdmin) {
  if (reservation.heuresDebitees > 0) {
    return { label: 'Payé (solde d’heures)', tone: 'is-success' }
  }
  switch (reservation.paymentStatus) {
    case 'paid':
      return { label: 'Payé (Mobile Money)', tone: 'is-success' }
    case 'pending_validation':
      return { label: 'Paiement en attente', tone: 'is-warning' }
    case 'refunded':
      return { label: 'Remboursé', tone: '' }
    default:
      return { label: 'Non payé', tone: 'is-danger' }
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


export function ReservationsPage() {
  const [moniteurs, setMoniteurs] = useState<Moniteur[]>([])
  const [reservations, setReservations] = useState<ReservationAdmin[]>([])
  const [moniteurId, setMoniteurId] = useState('')
  const [editDayHours, setEditDayHours] = useState<EditDayHours[]>(() => toEditDayHours([]))
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
    setMoniteurId(item.id)
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
    setEditDayHours(toEditDayHours(item.weeklyAvailability))
    setError(null)
    setSuccess(null)
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
        subtitle="Ajoutez les moniteurs, puis modifiez profil et horaires via le crayon."
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
          <h3 className="admin-section-label">2. Moniteurs & disponibilité</h3>
          <p className="admin-section-hint">
            Touchez le crayon pour modifier le profil et les horaires (jusqu’à 2 plages par jour).
            Après enregistrement, le formulaire se masque.
          </p>
        </div>
        <div className="admin-section-body">
          {moniteurs.length === 0 ? (
            <p className="admin-empty">Créez d’abord un moniteur ci-dessus.</p>
          ) : (
            <div className="moniteur-pick-grid">
              {moniteurs.map((item) => {
                const active = item.id === moniteurId
                const hasSchedule = (item.weeklyAvailability || []).length > 0
                return (
                  <div
                    key={item.id}
                    className={`moniteur-pick-card${active ? ' is-active' : ''}`}
                  >
                    <div className="moniteur-pick-top">
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
                            {hasSchedule ? ' · Dispo OK' : ' · Dispo à définir'}
                          </span>
                        </div>
                      </button>
                      <button
                        type="button"
                        className="btn-icon moniteur-pick-edit"
                        title="Modifier profil et disponibilité"
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
                  </div>
                )
              })}
            </div>
          )}

          {editingMoniteur ? (
            <div className="moniteur-edit-panel">
              <div className="moniteur-edit-head">
                <h4>Modifier {editingMoniteur.fullName}</h4>
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

              <div className="moniteur-edit-label">
                Disponibilité (jours & horaires)
                <p className="admin-muted" style={{ margin: '0.35rem 0 0.6rem' }}>
                  Cochez les jours libres. Jusqu’à 2 plages par jour (ex. matin et après-midi).
                </p>
                <div className="moniteur-hours-grid">
                  {editDayHours.map((day) => {
                    const label =
                      WEEK_DAYS.find((item) => item.dayOfWeek === day.dayOfWeek)?.label || 'Jour'
                    return (
                      <div key={day.dayOfWeek} className="moniteur-hours-day-block">
                        <label className="moniteur-hours-day">
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
                        <div className="moniteur-hours-intervals">
                          <div className="moniteur-hours-row">
                            <span className="moniteur-hours-slot-label">1</span>
                            <input
                              type="time"
                              value={day.morning.start}
                              disabled={!day.enabled}
                              onChange={(e) =>
                                updateEditInterval(day.dayOfWeek, 'morning', {
                                  start: e.target.value,
                                })
                              }
                              aria-label={`${label} plage 1 début`}
                            />
                            <span className="admin-muted">à</span>
                            <input
                              type="time"
                              value={day.morning.end}
                              disabled={!day.enabled}
                              onChange={(e) =>
                                updateEditInterval(day.dayOfWeek, 'morning', {
                                  end: e.target.value,
                                })
                              }
                              aria-label={`${label} plage 1 fin`}
                            />
                          </div>
                          <div className="moniteur-hours-row">
                            <label className="moniteur-hours-slot-toggle">
                              <input
                                type="checkbox"
                                checked={day.afternoonEnabled}
                                disabled={!day.enabled}
                                onChange={(e) =>
                                  updateEditDay(day.dayOfWeek, {
                                    afternoonEnabled: e.target.checked,
                                  })
                                }
                              />
                              <span>2</span>
                            </label>
                            <input
                              type="time"
                              value={day.afternoon.start}
                              disabled={!day.enabled || !day.afternoonEnabled}
                              onChange={(e) =>
                                updateEditInterval(day.dayOfWeek, 'afternoon', {
                                  start: e.target.value,
                                })
                              }
                              aria-label={`${label} plage 2 début`}
                            />
                            <span className="admin-muted">à</span>
                            <input
                              type="time"
                              value={day.afternoon.end}
                              disabled={!day.enabled || !day.afternoonEnabled}
                              onChange={(e) =>
                                updateEditInterval(day.dayOfWeek, 'afternoon', {
                                  end: e.target.value,
                                })
                              }
                              aria-label={`${label} plage 2 fin`}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
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
                  {savingEdit ? 'Enregistrement…' : 'Enregistrer'}
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
                    {reservation.paymentRef ? (
                      <span className="admin-muted">Réf. paiement : {reservation.paymentRef}</span>
                    ) : null}
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
                  {(() => {
                    const badge = paymentBadge(reservation)
                    return (
                      <span className={`admin-chip ${badge.tone}`.trim()}>{badge.label}</span>
                    )
                  })()}
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
