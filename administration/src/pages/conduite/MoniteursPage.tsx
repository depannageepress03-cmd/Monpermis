import { FormEvent, useCallback, useEffect, useState } from 'react'
import { ImagePlus, Plus, Trash2, UserRound } from 'lucide-react'
import {
  createMoniteur,
  deleteMoniteur,
  fetchMoniteurs,
  updateMoniteur,
  uploadVehiclePhoto,
} from '../../api/reservations'
import { AdminSectionHeader } from '../../components/AdminSectionHeader'
import { PublishSwitch } from '../../components/PublishSwitch'
import { getAdminToken, isAuthError } from '../../context/AdminAuthContext'
import type { Moniteur } from '../../types/reservations'
import { resolveMediaUrl } from '../../utils/mediaUrl'

const VEHICLES = [
  { id: 'voiture', label: 'Voiture' },
  { id: 'moto', label: 'Moto' },
  { id: 'camion', label: 'Camion' },
]

export function MoniteursPage() {
  const [moniteurs, setMoniteurs] = useState<Moniteur[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [price, setPrice] = useState('5000')
  const [vehicleBrand, setVehicleBrand] = useState('')
  const [vehiclePhotoUrl, setVehiclePhotoUrl] = useState('')
  const [vehicleTypes, setVehicleTypes] = useState<string[]>(['voiture'])
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const load = useCallback(async () => {
    const token = getAdminToken()
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchMoniteurs(token)
      setMoniteurs(data.moniteurs)
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const toggleVehicle = (id: string) => {
    setVehicleTypes((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  const handlePhotoUpload = async (file: File | null) => {
    if (!file) return
    const token = getAdminToken()
    if (!token) return
    setUploadingPhoto(true)
    setError(null)
    try {
      const { imageUrl } = await uploadVehiclePhoto(token, file)
      setVehiclePhotoUrl(imageUrl)
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Import photo impossible')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    const token = getAdminToken()
    if (!token) return
    setSaving(true)
    setError(null)
    try {
      await createMoniteur(token, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        vehicleTypes,
        defaultPriceFcfa: Number(price) || 5000,
        vehicleBrand: vehicleBrand.trim(),
        vehiclePhotoUrl,
      })
      setFirstName('')
      setLastName('')
      setPhone('')
      setVehicleBrand('')
      setVehiclePhotoUrl('')
      setSuccess('Moniteur ajouté.')
      await load()
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Création impossible')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="revision-shell">
      <AdminSectionHeader
        backTo="/conduite"
        backLabel="Conduite"
        kicker="Gestion"
        title="Moniteurs"
        subtitle="Équipe pédagogique, marque et photo du véhicule, tarif par séance (FCFA)."
      />

      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}

      <form onSubmit={handleCreate} className="admin-panel" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Ajouter un moniteur</h3>
        <div className="revision-inline-form" style={{ flexWrap: 'wrap' }}>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Prénom"
            required
            minLength={2}
          />
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Nom"
            required
            minLength={2}
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Téléphone WhatsApp"
          />
          <input
            value={vehicleBrand}
            onChange={(e) => setVehicleBrand(e.target.value)}
            placeholder="Marque de la voiture"
          />
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Prix FCFA"
            type="number"
            min={0}
          />
          <label className="btn-outline btn-file">
            <ImagePlus size={15} />
            {uploadingPhoto ? 'Import…' : 'Photo voiture'}
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
            disabled={saving || uploadingPhoto}
          >
            <Plus size={16} />
            {saving ? 'Ajout…' : 'Ajouter'}
          </button>
        </div>
        {vehiclePhotoUrl ? (
          <div className="moniteur-vehicle-preview">
            <img src={resolveMediaUrl(vehiclePhotoUrl)} alt="Véhicule" />
            <button type="button" className="btn-text-danger" onClick={() => setVehiclePhotoUrl('')}>
              <Trash2 size={14} />
              Retirer la photo
            </button>
          </div>
        ) : null}
        <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
          {VEHICLES.map((vehicle) => (
            <label key={vehicle.id} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={vehicleTypes.includes(vehicle.id)}
                onChange={() => toggleVehicle(vehicle.id)}
              />
              {vehicle.label}
            </label>
          ))}
        </div>
      </form>

      <div className="admin-panel">
        {loading ? <p className="revision-empty">Chargement…</p> : null}
        {!loading && moniteurs.length === 0 ? (
          <p className="revision-empty">Aucun moniteur pour le moment.</p>
        ) : null}
        <div className="revision-courses-stack">
          {moniteurs.map((moniteur) => (
            <div key={moniteur.id} className="revision-course">
              <div className="revision-course-header">
                <div className="revision-course-toggle" style={{ cursor: 'default' }}>
                  <UserRound size={18} />
                  <span>{moniteur.fullName}</span>
                  <span className="revision-count">
                    {moniteur.defaultPriceFcfa.toLocaleString('fr-FR')} FCFA
                  </span>
                  {!moniteur.active ? <span className="revision-tag">Inactif</span> : null}
                </div>
                <div className="revision-item-actions">
                  <PublishSwitch
                    checked={moniteur.active}
                    onChange={(active) => {
                      const token = getAdminToken()
                      if (!token) return
                      void updateMoniteur(token, moniteur.id, { active }).then(load)
                    }}
                  />
                  <button
                    type="button"
                    className="btn-text-danger"
                    onClick={() => {
                      if (!window.confirm(`Supprimer ${moniteur.fullName} ?`)) return
                      const token = getAdminToken()
                      if (!token) return
                      void deleteMoniteur(token, moniteur.id).then(load)
                    }}
                  >
                    <Trash2 size={16} />
                    Supprimer
                  </button>
                </div>
              </div>
              <div className="revision-course-body">
                <div className="moniteur-vehicle-preview" style={{ margin: 0 }}>
                  {moniteur.vehiclePhotoUrl ? (
                    <img src={resolveMediaUrl(moniteur.vehiclePhotoUrl)} alt="" />
                  ) : null}
                  <p style={{ margin: 0, color: 'var(--navy-muted)', fontSize: 13 }}>
                    {moniteur.phone || 'Pas de téléphone'} ·{' '}
                    {moniteur.vehicleBrand || 'Marque non renseignée'} ·{' '}
                    {moniteur.vehicleTypes.join(', ') || 'voiture'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
