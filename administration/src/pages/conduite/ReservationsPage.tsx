import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarPlus, Check, ImagePlus, Plus, Trash2 } from 'lucide-react'
import {
  createMoniteur,
  deleteAdminReservation,
  deleteMoniteur,
  fetchAdminReservations,
  fetchMoniteurs,
  generateCreneaux,
  uploadVehiclePhoto,
  validateReservationPayment,
} from '../../api/reservations'
import { AdminSectionHeader } from '../../components/AdminSectionHeader'
import { getAdminToken, isAuthError } from '../../context/AdminAuthContext'
import type { Moniteur, ReservationAdmin } from '../../types/reservations'
import { resolveMediaUrl } from '../../utils/mediaUrl'

function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function plusDaysISO(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}


function mediaSrc(url: string) {
  return resolveMediaUrl(url)
}

export function ReservationsPage() {
  const [moniteurs, setMoniteurs] = useState<Moniteur[]>([])
  const [reservations, setReservations] = useState<ReservationAdmin[]>([])
  const [moniteurId, setMoniteurId] = useState('')
  const [fromDate, setFromDate] = useState(todayISO())
  const [toDate, setToDate] = useState(plusDaysISO(7))
  const [vehicleType, setVehicleType] = useState('voiture')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [savingMoniteur, setSavingMoniteur] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [moniteurName, setMoniteurName] = useState('')
  const [vehicleBrand, setVehicleBrand] = useState('')
  const [formVehicleType, setFormVehicleType] = useState('')
  const [vehiclePhotoUrl, setVehiclePhotoUrl] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingReservationId, setDeletingReservationId] = useState<string | null>(null)

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
    if (!selectedMoniteur) return
    const preferred = selectedMoniteur.vehicleTypes?.[0] || 'voiture'
    setVehicleType(preferred)
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
        vehicleTypes: [type.trim().toLowerCase()],
      })
      setMoniteurName('')
      setVehicleBrand('')
      setFormVehicleType('')
      setVehiclePhotoUrl('')
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

  const handleGenerate = async (e: FormEvent) => {
    e.preventDefault()
    const token = getAdminToken()
    if (!token || !moniteurId) return
    setGenerating(true)
    setError(null)
    try {
      const data = await generateCreneaux(token, {
        moniteurId,
        fromDate,
        toDate,
        vehicleType: vehicleType.trim().toLowerCase() || 'voiture',
        slotMinutes: 60,
      })
      setSuccess(`${data.createdCount} créneau(x) généré(s).`)
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Génération impossible')
    } finally {
      setGenerating(false)
    }
  }

  const markPaid = async (reservation: ReservationAdmin) => {
    const token = getAdminToken()
    if (!token) return
    try {
      await validateReservationPayment(token, reservation.id, {
        paymentStatus: 'paid',
        paymentRef: reservation.paymentRef,
      })
      setSuccess('Paiement validé — réservation confirmée.')
      await load({ silent: true })
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Validation impossible')
    }
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
        subtitle="Moniteurs, créneaux et validation des paiements."
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
            <label className="btn-outline btn-file">
              <ImagePlus size={15} />
              {uploadingPhoto ? 'Import…' : 'Photo'}
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
              disabled={savingMoniteur || uploadingPhoto}
            >
              <Plus size={16} />
              {savingMoniteur ? 'Ajout…' : 'Enregistrer'}
            </button>
          </div>

          {vehiclePhotoUrl ? (
            <div className="moniteur-vehicle-preview">
              <img src={mediaSrc(vehiclePhotoUrl)} alt="Véhicule" />
              <div>
                <p className="admin-muted">Aperçu photo</p>
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
          <h3 className="admin-section-label">2. Générer des créneaux</h3>
          <p className="admin-section-hint">Sélectionnez un moniteur, puis la période.</p>
        </div>
        <form onSubmit={handleGenerate} className="admin-section-body">
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
                        </span>
                      </div>
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

          {selectedMoniteur ? (
            <div className="moniteur-generate-bar">
              <div className="moniteur-generate-identity">
                {selectedMoniteur.vehiclePhotoUrl ? (
                  <img src={mediaSrc(selectedMoniteur.vehiclePhotoUrl)} alt="" />
                ) : (
                  <div className="moniteur-vehicle-placeholder">Véhicule</div>
                )}
                <div>
                  <p className="moniteur-generate-name">{selectedMoniteur.fullName}</p>
                  <p className="moniteur-generate-vehicle">
                    {selectedMoniteur.vehicleBrand || 'Véhicule'} ·{' '}
                    {selectedMoniteur.vehicleTypes?.[0] || vehicleType}
                  </p>
                </div>
              </div>

              <div className="admin-toolbar moniteur-generate-dates">
                <label className="moniteur-date-field">
                  <span>Du</span>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    required
                  />
                </label>
                <label className="moniteur-date-field">
                  <span>Au</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    required
                  />
                </label>
                <button
                  type="submit"
                  className="btn-primary btn-primary-inline"
                  disabled={generating || !moniteurId}
                >
                  <CalendarPlus size={16} />
                  {generating ? 'Génération…' : 'Générer'}
                </button>
              </div>
            </div>
          ) : null}
        </form>
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
                      {(reservation.priceFcfa || 0).toLocaleString('fr-FR')} FCFA
                      {reservation.paymentRef ? ` · Ref. ${reservation.paymentRef}` : ''}
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
                  <span className="admin-chip">{reservation.paymentStatus}</span>
                  {reservation.status !== 'cancelled' &&
                  reservation.paymentStatus !== 'paid' ? (
                    <button
                      type="button"
                      className="btn-outline-sm"
                      onClick={() => void markPaid(reservation)}
                    >
                      <Check size={15} />
                      Valider
                    </button>
                  ) : null}
                  {reservation.paymentStatus === 'paid' &&
                  reservation.status !== 'cancelled' ? (
                    <span className="admin-chip is-success">Payé</span>
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
