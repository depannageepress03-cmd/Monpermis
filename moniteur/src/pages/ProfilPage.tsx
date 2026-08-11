import { FormEvent, useCallback, useEffect, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import {
  fetchProfile,
  updateProfile,
  uploadMoniteurPhoto,
  type MoniteurProfile,
} from '../api/portal'
import { getMoniteurToken, isAuthError, useMoniteurAuth } from '../context/MoniteurAuthContext'
import { resolveMediaUrl } from '../utils/mediaUrl'

function mediaSrc(url: string) {
  return resolveMediaUrl(url)
}

export function ProfilPage() {
  const { moniteur } = useMoniteurAuth()
  const [profile, setProfile] = useState<MoniteurProfile | null>(null)
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [bio, setBio] = useState('')
  const [vehicleBrand, setVehicleBrand] = useState('')
  const [vehicleType, setVehicleType] = useState('voiture')
  const [specialties, setSpecialties] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [vehiclePhotoUrl, setVehiclePhotoUrl] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [videos, setVideos] = useState<string[]>([])
  const [newVideoUrl, setNewVideoUrl] = useState('')
  const [defaultPriceFcfa, setDefaultPriceFcfa] = useState('5000')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const applyProfile = (data: MoniteurProfile) => {
    setProfile(data)
    setPhone(data.phone || '')
    setCity(data.city || '')
    setBio(data.bio || '')
    setVehicleBrand(data.vehicleBrand || '')
    setVehicleType((data.vehicleTypes && data.vehicleTypes[0]) || 'voiture')
    setSpecialties((data.specialties || []).join(', '))
    setPhotoUrl(data.photoUrl || '')
    setVehiclePhotoUrl(data.vehiclePhotoUrl || '')
    setPhotos(data.photos || [])
    setVideos(data.videos || [])
    setDefaultPriceFcfa(String(data.defaultPriceFcfa || 5000))
  }

  const load = useCallback(async () => {
    const token = getMoniteurToken()
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchProfile(token)
      applyProfile(data.profile)
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const uploadTo = async (file: File | null, target: 'portrait' | 'vehicle' | 'gallery') => {
    if (!file) return
    const token = getMoniteurToken()
    if (!token) return
    setUploading(target)
    setError(null)
    try {
      const { imageUrl } = await uploadMoniteurPhoto(token, file)
      if (target === 'portrait') setPhotoUrl(imageUrl)
      else if (target === 'vehicle') setVehiclePhotoUrl(imageUrl)
      else setPhotos((prev) => [...prev, imageUrl].slice(0, 12))
      setSuccess('Photo importée — pensez à enregistrer le profil.')
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Import photo impossible')
    } finally {
      setUploading(null)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const token = getMoniteurToken()
    if (!token) return
    if (newPassword && newPassword.length < 8) {
      setError('Nouveau mot de passe : minimum 8 caractères')
      return
    }
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const payload: Parameters<typeof updateProfile>[1] = {
        phone: phone.trim(),
        city: city.trim(),
        bio: bio.trim(),
        photoUrl,
        vehicleBrand: vehicleBrand.trim(),
        vehiclePhotoUrl,
        vehicleTypes: [vehicleType.trim().toLowerCase() || 'voiture'],
        specialties: specialties
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        photos,
        videos,
        defaultPriceFcfa: Math.max(0, Math.round(Number(defaultPriceFcfa) || 0)),
      }
      if (newPassword) {
        payload.currentPassword = currentPassword
        payload.newPassword = newPassword
      }
      const data = await updateProfile(token, payload)
      applyProfile(data.profile)
      setCurrentPassword('')
      setNewPassword('')
      setSuccess('Profil mis à jour. Ces infos apparaissent dans l’application apprenant.')
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Mise à jour impossible')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <p className="admin-kicker">Compte</p>
          <h1>Mon profil public</h1>
          <p className="admin-muted">
            Choisissez ce que les apprenants voient dans l’application : photo, véhicule, ville,
            présentation.
          </p>
        </div>
      </header>

      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}
      {loading ? <p className="admin-muted">Chargement…</p> : null}

      {!loading && profile ? (
        <form className="admin-card" onSubmit={handleSubmit}>
          <div className="reserv-create-grid">
            <label>
              Nom
              <input value={profile.fullName || moniteur?.fullName || ''} disabled readOnly />
            </label>
            <label>
              Identifiant de connexion
              <input value={profile.email} disabled readOnly />
            </label>
            <label>
              Téléphone
              <input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
            <label>
              Ville / zone
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="ex. Cotonou, Calavi…"
              />
            </label>
            <label>
              Marque du véhicule
              <input
                value={vehicleBrand}
                onChange={(e) => setVehicleBrand(e.target.value)}
                placeholder="ex. Toyota Corolla"
              />
            </label>
            <label>
              Type de véhicule
              <input
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                placeholder="voiture, moto…"
              />
            </label>
            <label>
              Spécialités (séparées par des virgules)
              <input
                value={specialties}
                onChange={(e) => setSpecialties(e.target.value)}
                placeholder="conduite ville, parking…"
              />
            </label>
            <label>
              Tarif horaire (FCFA)
              <input
                type="number"
                min={0}
                step={500}
                value={defaultPriceFcfa}
                onChange={(e) => setDefaultPriceFcfa(e.target.value)}
              />
            </label>
          </div>

          <label style={{ display: 'block', marginTop: 12 }}>
            Présentation
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              maxLength={2000}
              style={{ width: '100%' }}
              placeholder="Présentez-vous aux apprenants…"
            />
          </label>

          <h3 style={{ marginTop: 24 }}>Photos</h3>
          <div className="admin-actions-row" style={{ flexWrap: 'wrap' }}>
            <label className="btn-outline btn-file">
              <ImagePlus size={15} />
              {uploading === 'portrait' ? 'Import…' : 'Photo portrait'}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => void uploadTo(e.target.files?.[0] ?? null, 'portrait')}
              />
            </label>
            <label className="btn-outline btn-file">
              <ImagePlus size={15} />
              {uploading === 'vehicle' ? 'Import…' : 'Photo véhicule'}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => void uploadTo(e.target.files?.[0] ?? null, 'vehicle')}
              />
            </label>
            <label className="btn-outline btn-file">
              <ImagePlus size={15} />
              {uploading === 'gallery' ? 'Import…' : 'Ajouter à la galerie'}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => void uploadTo(e.target.files?.[0] ?? null, 'gallery')}
              />
            </label>
          </div>

          <div className="reserv-create-previews" style={{ marginTop: 12 }}>
            {photoUrl ? (
              <div className="moniteur-vehicle-preview">
                <img src={mediaSrc(photoUrl)} alt="Portrait" />
                <div>
                  <p className="admin-muted">Portrait</p>
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
                  <p className="admin-muted">Véhicule</p>
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
          </div>

          {photos.length > 0 ? (
            <ul className="upcoming-list" style={{ marginTop: 12 }}>
              {photos.map((url) => (
                <li key={url}>
                  <div className="upcoming-item-main">
                    <img
                      src={mediaSrc(url)}
                      alt=""
                      style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8 }}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn-text-danger"
                    onClick={() => setPhotos((prev) => prev.filter((item) => item !== url))}
                  >
                    <Trash2 size={14} />
                    Retirer
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <h3 style={{ marginTop: 24 }}>Vidéos (YouTube / Vimeo)</h3>
          <div className="reserv-create-grid">
            <input
              value={newVideoUrl}
              onChange={(e) => setNewVideoUrl(e.target.value)}
              placeholder="https://youtube.com/…"
            />
            <button
              type="button"
              className="btn-outline"
              onClick={() => {
                const url = newVideoUrl.trim()
                if (!url) return
                setVideos((prev) => [...prev, url].slice(0, 6))
                setNewVideoUrl('')
              }}
            >
              Ajouter
            </button>
          </div>
          {videos.length > 0 ? (
            <ul className="upcoming-list" style={{ marginTop: 8 }}>
              {videos.map((url) => (
                <li key={url}>
                  <div className="upcoming-item-main">
                    <span>{url}</span>
                  </div>
                  <button
                    type="button"
                    className="btn-text-danger"
                    onClick={() => setVideos((prev) => prev.filter((item) => item !== url))}
                  >
                    Retirer
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <h3 style={{ marginTop: 24 }}>Changer le mot de passe</h3>
          <div className="reserv-create-grid">
            <label>
              Mot de passe actuel
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </label>
            <label>
              Nouveau mot de passe
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
              />
            </label>
          </div>

          <div className="admin-actions-row" style={{ marginTop: 16 }}>
            <button type="submit" className="btn-primary" disabled={saving || Boolean(uploading)}>
              {saving ? 'Enregistrement…' : 'Enregistrer mon profil'}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  )
}
