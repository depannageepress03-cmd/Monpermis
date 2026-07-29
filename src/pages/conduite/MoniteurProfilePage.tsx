import { useEffect, useMemo, useState } from 'react'
import { Car, CheckCircle2, MapPin, User, X } from 'lucide-react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  fetchMoniteurAvailability,
  fetchMoniteurProfile,
  ReservationError,
  type AvailabilityDay,
  type MoniteurProfile,
} from '../../api/reservations'
import { PageNavbar } from '../../components/PageNavbar'
import { useAuth } from '../../hooks/useAuth'
import { resolveMoniteurVideoEmbed } from '../../utils/mediaEmbed'
import { resolveMediaUrl } from '../../utils/mediaUrl'
import '../../styles/auth.css'
import '../../styles/learner.css'
import '../../styles/reservation.css'

function mediaSrc(url: string) {
  return resolveMediaUrl(url)
}

function formatDayLabel(date: string) {
  try {
    return new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
  } catch {
    return date
  }
}

export function MoniteurProfilePage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { user, loading } = useAuth()
  const [moniteur, setMoniteur] = useState<MoniteurProfile | null>(null)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [availabilityDays, setAvailabilityDays] = useState<AvailabilityDay[]>([])
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  useEffect(() => {
    if (!id || !user) return
    let cancelled = false
    setBusy(true)
    setError(null)
    setMoniteur(null)
    setAvailabilityDays([])

    Promise.all([
      fetchMoniteurProfile(id),
      fetchMoniteurAvailability({ moniteurId: id, days: 14 }).catch(() => null),
    ])
      .then(([profileData, availability]) => {
        if (cancelled) return
        setMoniteur(profileData.moniteur)
        const days = availability?.days?.filter((d) => d.windows?.length) ?? []
        setAvailabilityDays(days.slice(0, 5))
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof ReservationError ? err.message : 'Profil indisponible')
      })
      .finally(() => {
        if (!cancelled) setBusy(false)
      })

    return () => {
      cancelled = true
    }
  }, [id, user])

  const vehicleTypesLabel = useMemo(() => {
    const types = moniteur?.vehicleTypes?.filter(Boolean) ?? []
    return types.length ? types.join(' · ') : 'Véhicule'
  }, [moniteur])

  const safeVideos = useMemo(() => {
    return (moniteur?.videos ?? [])
      .map((video) => ({ video, embed: resolveMoniteurVideoEmbed(video) }))
      .filter((item): item is { video: string; embed: NonNullable<typeof item.embed> } =>
        Boolean(item.embed),
      )
  }, [moniteur])

  if (loading) {
    return (
      <div className="auth-page">
        <div className="auth-container learner-container">
          <p className="subtitle">Chargement…</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/" replace state={{ message: 'Connecte-toi pour voir les moniteurs.' }} />
  }

  const photos = moniteur?.photos ?? []
  const lightboxPhoto = lightboxIndex != null ? photos[lightboxIndex] : null

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

          {!busy && !error && !moniteur ? (
            <p className="subtitle">Moniteur introuvable.</p>
          ) : null}

          {moniteur ? (
            <div className="reservation-step">
              <div className="moniteur-profile-head moniteur-profile-head--split">
                <div className="moniteur-profile-portrait">
                  {moniteur.photoUrl ? (
                    <img
                      className="moniteur-profile-avatar"
                      src={mediaSrc(moniteur.photoUrl)}
                      alt={`Portrait de ${moniteur.fullName}`}
                    />
                  ) : (
                    <div className="moniteur-profile-avatar moniteur-choice-placeholder" aria-hidden>
                      {moniteur.fullName.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="moniteur-profile-identity">
                    <h2>{moniteur.fullName}</h2>
                    {moniteur.city ? (
                      <p className="subtitle">
                        <MapPin size={15} /> {moniteur.city}
                      </p>
                    ) : null}
                    <p className="subtitle moniteur-profile-price">
                      {moniteur.defaultPriceFcfa.toLocaleString('fr-FR')} FCFA/h
                    </p>
                    <p className="subtitle">
                      <Car size={15} /> {vehicleTypesLabel}
                    </p>
                  </div>
                </div>
              </div>

              <div className="moniteur-profile-section moniteur-vehicle-card">
                <h3 className="section-title">Véhicule utilisé</h3>
                {moniteur.vehiclePhotoUrl ? (
                  <img
                    className="moniteur-vehicle-photo"
                    src={mediaSrc(moniteur.vehiclePhotoUrl)}
                    alt={`Véhicule ${moniteur.vehicleBrand || ''}`.trim()}
                  />
                ) : (
                  <div className="moniteur-vehicle-photo moniteur-choice-placeholder">
                    Photo véhicule non disponible
                  </div>
                )}
                <p className="subtitle">{moniteur.vehicleBrand || 'Marque non renseignée'}</p>
              </div>

              {moniteur.bio ? (
                <div className="moniteur-profile-bio">
                  <h3 className="section-title">Présentation</h3>
                  <p>{moniteur.bio}</p>
                </div>
              ) : (
                <p className="moniteur-profile-empty">Présentation non renseignée pour le moment.</p>
              )}

              {moniteur.specialties?.length ? (
                <div className="moniteur-profile-specialties">
                  {moniteur.specialties.map((item) => (
                    <span key={item} className="moniteur-specialty-chip">
                      <CheckCircle2 size={13} /> {item}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="moniteur-profile-section">
                <h3 className="section-title">Prochaines disponibilités</h3>
                {availabilityDays.length ? (
                  <ul className="moniteur-availability-list">
                    {availabilityDays.map((day) => (
                      <li key={day.date}>
                        <strong>{formatDayLabel(day.date)}</strong>
                        <span>
                          {day.windows
                            .slice(0, 3)
                            .map((w) => `${w.start}–${w.end}`)
                            .join(' · ')}
                          {day.windows.length > 3 ? '…' : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="moniteur-profile-empty">
                    Aucune plage libre sur les 14 prochains jours (ou calendrier non chargé).
                  </p>
                )}
              </div>

              <div className="moniteur-profile-section">
                <h3 className="section-title">Photos</h3>
                {photos.length ? (
                  <div className="moniteur-profile-gallery">
                    {photos.map((photo, index) => (
                      <button
                        key={photo}
                        type="button"
                        className="moniteur-gallery-thumb"
                        onClick={() => setLightboxIndex(index)}
                      >
                        <img src={mediaSrc(photo)} alt={`Photo ${index + 1} de ${moniteur.fullName}`} />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="moniteur-profile-empty">Pas encore de galerie photo.</p>
                )}
              </div>

              <div className="moniteur-profile-section">
                <h3 className="section-title">Vidéos de présentation</h3>
                {safeVideos.length ? (
                  <div className="moniteur-profile-videos">
                    {safeVideos.map(({ video, embed }, index) => (
                      <div key={video} className="moniteur-profile-video">
                        <iframe
                          src={embed.src}
                          title={`Vidéo de présentation ${index + 1} — ${moniteur.fullName}`}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          sandbox="allow-scripts allow-same-origin allow-presentation"
                          referrerPolicy="strict-origin-when-cross-origin"
                          loading="lazy"
                        />
                        <a
                          className="moniteur-video-external"
                          href={embed.watchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Ouvrir la vidéo
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="moniteur-profile-empty">Pas encore de vidéo de présentation.</p>
                )}
              </div>

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

      {lightboxPhoto ? (
        <div
          className="moniteur-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Aperçu photo"
          onClick={() => setLightboxIndex(null)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setLightboxIndex(null)
          }}
        >
          <button
            type="button"
            className="moniteur-lightbox-close"
            aria-label="Fermer"
            onClick={() => setLightboxIndex(null)}
          >
            <X size={20} />
          </button>
          <img
            src={mediaSrc(lightboxPhoto)}
            alt={`Photo ${(lightboxIndex ?? 0) + 1} de ${moniteur?.fullName || 'moniteur'}`}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  )
}
