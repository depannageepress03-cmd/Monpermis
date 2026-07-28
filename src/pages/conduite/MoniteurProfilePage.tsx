import { useEffect, useState } from 'react'
import { Car, CheckCircle2, User } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  fetchMoniteurProfile,
  ReservationError,
  type MoniteurProfile,
} from '../../api/reservations'
import { PageNavbar } from '../../components/PageNavbar'
import { useAuth } from '../../hooks/useAuth'
import { resolveMediaUrl } from '../../utils/mediaUrl'
import '../../styles/auth.css'
import '../../styles/learner.css'
import '../../styles/reservation.css'

function mediaSrc(url: string) {
  return resolveMediaUrl(url)
}

function toEmbedUrl(url: string) {
  const youtube = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([\w-]+)/)
  if (youtube) return `https://www.youtube.com/embed/${youtube[1]}`
  return url
}

export function MoniteurProfilePage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { user, loading } = useAuth()
  const [moniteur, setMoniteur] = useState<MoniteurProfile | null>(null)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setBusy(true)
    setError(null)
    fetchMoniteurProfile(id)
      .then((data) => setMoniteur(data.moniteur))
      .catch((err) => setError(err instanceof ReservationError ? err.message : 'Profil indisponible'))
      .finally(() => setBusy(false))
  }, [id])

  if (loading || !user) return null

  return (
    <div className="auth-page">
      <div className="auth-container learner-container">
        <PageNavbar
          title="Profil du moniteur"
          icon={<User size={22} />}
          tone="drive"
          onBack={() => navigate('/conduite/reservation')}
        />

        <div className="auth-card learner-card reservation-card">
          {error ? <p className="form-error">{error}</p> : null}
          {busy ? <p className="subtitle">Chargement du profil…</p> : null}

          {moniteur ? (
            <div className="reservation-step">
              <div className="moniteur-profile-head">
                {moniteur.vehiclePhotoUrl ? (
                  <img
                    className="moniteur-profile-cover"
                    src={mediaSrc(moniteur.vehiclePhotoUrl)}
                    alt=""
                  />
                ) : (
                  <div className="moniteur-profile-cover moniteur-choice-placeholder">Véhicule</div>
                )}
                <h2>{moniteur.fullName}</h2>
                <p className="subtitle">
                  <Car size={15} /> {moniteur.vehicleBrand || 'Véhicule'} ·{' '}
                  {moniteur.vehicleTypes?.[0] || 'Véhicule'}
                </p>
              </div>

              {moniteur.bio ? (
                <div className="moniteur-profile-bio">
                  <h3 className="section-title">Présentation</h3>
                  <p>{moniteur.bio}</p>
                </div>
              ) : null}

              {moniteur.specialties?.length ? (
                <div className="moniteur-profile-specialties">
                  {moniteur.specialties.map((item) => (
                    <span key={item} className="moniteur-specialty-chip">
                      <CheckCircle2 size={13} /> {item}
                    </span>
                  ))}
                </div>
              ) : null}

              {moniteur.photos?.length ? (
                <div className="moniteur-profile-section">
                  <h3 className="section-title">Photos</h3>
                  <div className="moniteur-profile-gallery">
                    {moniteur.photos.map((photo) => (
                      <img key={photo} src={mediaSrc(photo)} alt="" />
                    ))}
                  </div>
                </div>
              ) : null}

              {moniteur.videos?.length ? (
                <div className="moniteur-profile-section">
                  <h3 className="section-title">Vidéos de présentation</h3>
                  <div className="moniteur-profile-videos">
                    {moniteur.videos.map((video) => (
                      <div key={video} className="moniteur-profile-video">
                        <iframe
                          src={toEmbedUrl(video)}
                          title="Vidéo de présentation"
                          allowFullScreen
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <button
                type="button"
                className="btn-primary reservation-calendar-btn"
                onClick={() => navigate(`/conduite/reservation?moniteurId=${moniteur.id}`)}
              >
                Choisir ce moniteur
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
