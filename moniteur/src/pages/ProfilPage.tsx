import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Camera, Car, ImagePlus, KeyRound, Link2, NotebookPen, Save, Trash2, UserRound, Video } from 'lucide-react'
import { fetchProfile, updateProfile, uploadMoniteurPhoto, type MoniteurProfile } from '../api/portal'
import { getMoniteurToken, isAuthError, useMoniteurAuth } from '../context/MoniteurAuthContext'
import { resolveMediaUrl } from '../utils/mediaUrl'
import { PageSection } from '../components/model/PageSection'
import { formatMoney, Notice, PanelHead } from '../components/model/Kit'

type UploadTarget = 'portrait' | 'vehicle' | 'gallery'

function initialsOf(fullName?: string) {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return (parts[0] || 'MO').slice(0, 2).toUpperCase()
}

function UploadButton({
  label,
  busy,
  onFile,
}: {
  label: string
  busy: boolean
  onFile: (file: File | null) => void
}) {
  return (
    <label className="cx-btn cx-btn-sm cx-upload">
      <ImagePlus aria-hidden />
      {busy ? 'Import…' : label}
      <input type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0] ?? null)} disabled={busy} />
    </label>
  )
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
  const [uploading, setUploading] = useState<UploadTarget | null>(null)
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

  const uploadTo = async (file: File | null, target: UploadTarget) => {
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

  const fullName = profile?.fullName || moniteur?.fullName || ''
  const saveButton = (
    <button type="submit" form="moniteur-profile" className="cx-btn cx-btn-fill" disabled={saving || Boolean(uploading) || !profile}>
      <Save aria-hidden />
      {saving ? 'Enregistrement…' : 'Enregistrer mon profil'}
    </button>
  )

  return (
    <PageSection
      kicker="Compte"
      title="Mon profil public"
      subtitle="Ce que les apprenants voient de vous dans l’application : photo, véhicule, ville et présentation."
      actions={profile ? saveButton : undefined}
    >
      <Notice error={error} success={success} />
      {loading ? <p className="cx-loading">Chargement…</p> : null}

      {!loading && profile ? (
        <form id="moniteur-profile" className="cx-split" onSubmit={handleSubmit}>
          <aside className="cx-panel cx-sticky cx-prof-card">
            {photoUrl ? (
              <img className="cx-prof-photo" src={resolveMediaUrl(photoUrl)} alt={`Portrait de ${fullName}`} />
            ) : (
              <span className="cx-prof-initials" aria-hidden="true">
                {initialsOf(fullName)}
              </span>
            )}
            <h2>{fullName || 'Moniteur'}</h2>
            <p>{city || 'Ville non renseignée'}</p>
            <UploadButton
              label={photoUrl ? 'Changer la photo' : 'Ajouter une photo'}
              busy={uploading === 'portrait'}
              onFile={(file) => void uploadTo(file, 'portrait')}
            />
            <div className="cx-prof-facts">
              <div>
                <span>Identifiant</span>
                <b>{profile.email}</b>
              </div>
              <div>
                <span>Tarif horaire</span>
                <b>{formatMoney(Number(defaultPriceFcfa) || 0)}</b>
              </div>
              <div>
                <span>Véhicule</span>
                <b>{vehicleBrand || vehicleType || '—'}</b>
              </div>
              <div>
                <span>Médias</span>
                <b>
                  {photos.length} photo{photos.length > 1 ? 's' : ''} · {videos.length} vidéo{videos.length > 1 ? 's' : ''}
                </b>
              </div>
            </div>
          </aside>

          <div className="cx-view">
            <section className="cx-panel">
              <PanelHead icon={<UserRound aria-hidden />} title="Informations" sub="Coordonnées et conditions de vos séances" />
              <div className="cx-form-grid">
                <label>
                  Nom
                  <input value={fullName} disabled readOnly />
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
                  <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="ex. Cotonou, Calavi…" />
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
                  <input value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} placeholder="voiture, moto…" />
                </label>
                <label>
                  Spécialités (séparées par des virgules)
                  <input
                    value={specialties}
                    onChange={(e) => setSpecialties(e.target.value)}
                    placeholder="conduite en ville, créneau…"
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
            </section>

            <section className="cx-panel">
              <PanelHead icon={<NotebookPen aria-hidden />} title="Présentation" sub="Quelques lignes pour rassurer les apprenants" />
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={5}
                maxLength={2000}
                aria-label="Présentation"
                placeholder="Présentez-vous aux apprenants : expérience, méthode, zones desservies…"
              />
            </section>

            <section className="cx-panel">
              <PanelHead
                icon={<Camera aria-hidden />}
                title="Photos"
                sub="Portrait, véhicule et galerie (12 photos maximum)"
                extra={
                  <div className="cx-page-actions">
                    <UploadButton
                      label="Photo du véhicule"
                      busy={uploading === 'vehicle'}
                      onFile={(file) => void uploadTo(file, 'vehicle')}
                    />
                    <UploadButton
                      label="Ajouter à la galerie"
                      busy={uploading === 'gallery'}
                      onFile={(file) => void uploadTo(file, 'gallery')}
                    />
                  </div>
                }
              />
              {!photoUrl && !vehiclePhotoUrl && photos.length === 0 ? (
                <p className="cx-empty">Aucune photo pour le moment.</p>
              ) : (
                <div className="cx-media-grid">
                  {photoUrl ? (
                    <figure className="cx-media">
                      <img src={resolveMediaUrl(photoUrl)} alt="Portrait" />
                      <figcaption>Portrait</figcaption>
                      <button type="button" aria-label="Retirer le portrait" onClick={() => setPhotoUrl('')}>
                        <Trash2 aria-hidden />
                      </button>
                    </figure>
                  ) : null}
                  {vehiclePhotoUrl ? (
                    <figure className="cx-media">
                      <img src={resolveMediaUrl(vehiclePhotoUrl)} alt="Véhicule" />
                      <figcaption>
                        <Car aria-hidden style={{ width: '.8rem', height: '.8rem', verticalAlign: '-.1rem' }} /> Véhicule
                      </figcaption>
                      <button type="button" aria-label="Retirer la photo du véhicule" onClick={() => setVehiclePhotoUrl('')}>
                        <Trash2 aria-hidden />
                      </button>
                    </figure>
                  ) : null}
                  {photos.map((url, index) => (
                    <figure key={url} className="cx-media">
                      <img src={resolveMediaUrl(url)} alt={`Galerie ${index + 1}`} />
                      <button
                        type="button"
                        aria-label={`Retirer la photo ${index + 1}`}
                        onClick={() => setPhotos((prev) => prev.filter((item) => item !== url))}
                      >
                        <Trash2 aria-hidden />
                      </button>
                    </figure>
                  ))}
                </div>
              )}
            </section>

            <section className="cx-panel">
              <PanelHead icon={<Video aria-hidden />} title="Vidéos" sub="Liens YouTube ou Vimeo (6 maximum)" />
              <div className="cx-field-row">
                <input
                  className="cx-input"
                  value={newVideoUrl}
                  onChange={(e) => setNewVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/…"
                  aria-label="Lien de la vidéo"
                />
                <button
                  type="button"
                  className="cx-btn"
                  onClick={() => {
                    const url = newVideoUrl.trim()
                    if (!url) return
                    setVideos((prev) => [...prev, url].slice(0, 6))
                    setNewVideoUrl('')
                  }}
                >
                  <Link2 aria-hidden />
                  Ajouter
                </button>
              </div>
              {videos.length > 0 ? (
                <ul className="cx-video-list">
                  {videos.map((url) => (
                    <li key={url}>
                      <Video aria-hidden style={{ width: '1rem', height: '1rem', color: '#4d6a82', flex: 'none' }} />
                      <a href={url} target="_blank" rel="noreferrer">
                        {url}
                      </a>
                      <button
                        type="button"
                        className="cx-btn cx-btn-danger cx-btn-sm"
                        onClick={() => setVideos((prev) => prev.filter((item) => item !== url))}
                      >
                        Retirer
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>

            <section className="cx-panel">
              <PanelHead
                icon={<KeyRound aria-hidden />}
                title="Changer le mot de passe"
                sub="Laissez vide pour conserver le mot de passe actuel"
              />
              <div className="cx-form-grid">
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
              <div className="cx-form-actions">{saveButton}</div>
            </section>
          </div>
        </form>
      ) : null}
    </PageSection>
  )
}
