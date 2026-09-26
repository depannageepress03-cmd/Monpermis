import { useEffect, useMemo, useState } from 'react';
import { Car, CheckCircle2, MapPin, X } from 'lucide-react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { fetchMoniteurAvailability, fetchMoniteurProfile, ReservationError, type AvailabilityDay, type MoniteurProfile } from '../../api/reservations';
;
import { useAuth } from '../../hooks/useAuth';
import { Badge, Button, Card, IconButton, SectionTitle, StatCard } from '../../components/ui';
import { MainTabBar } from '../../components/MainTabBar';
import { resolveMoniteurVideoEmbed } from '../../utils/mediaEmbed';
import { resolveMediaUrl } from '../../utils/mediaUrl';
;


function mediaSrc(url: string) {
  return resolveMediaUrl(url);
}

function formatDayLabel(date: string) {
  try {
    return new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return date;
  }
}

function formatTime(time: string) {
  try {
    return new Date(`1970-01-01T${time}`).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return time;
  }
}

export function MoniteurProfilePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const [moniteur, setMoniteur] = useState<MoniteurProfile | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availabilityDays, setAvailabilityDays] = useState<AvailabilityDay[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!id || !user) return;
    let cancelled = false;
    setBusy(true);
    setError(null);
    setMoniteur(null);
    setAvailabilityDays([]);

    Promise.all([
      fetchMoniteurProfile(id),
      fetchMoniteurAvailability({ moniteurId: id, days: 14 }).catch(() => null),
    ])
      .then(([profileData, availability]) => {
        if (cancelled) return;
        setMoniteur(profileData.moniteur);
        const days = availability?.days?.filter((d) => d.windows?.length) ?? [];
        setAvailabilityDays(days.slice(0, 5));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ReservationError ? err.message : 'Profil indisponible');
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, user]);

  const vehicleTypesLabel = useMemo(() => {
    const types = moniteur?.vehicleTypes?.filter(Boolean) ?? [];
    return types.length ? types.join(' · ') : 'Véhicule';
  }, [moniteur]);

  const safeVideos = useMemo(() => {
    return (moniteur?.videos ?? [])
      .map((video) => ({ video, embed: resolveMoniteurVideoEmbed(video) }))
      .filter((item): item is { video: string; embed: NonNullable<typeof item.embed> } =>
        Boolean(item.embed),
      );
  }, [moniteur]);

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', background: '#F5F7FB' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
          <p style={{ color: '#5B6680' }}>Chargement…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace state={{ message: 'Connecte-toi pour voir les moniteurs.' }} />;
  }

  const photos = moniteur?.photos ?? [];
  const lightboxPhoto = lightboxIndex != null ? photos[lightboxIndex] : null;

  return (
    <div style={{ minHeight: '100dvh', background: '#F5F7FB', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -100, right: -100, width: 280, height: 280, borderRadius: '50%', background: 'rgba(255,180,0,0.16)', filter: 'blur(60px)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', boxSizing: 'border-box', padding: '56px 20px 0', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1120, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <IconButton
            icon={({ size, color }) => (
              <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 6-6 6 6 6" />
              </svg>
            )}
            ariaLabel="Retour"
            onPress={() => navigate('/conduite/reservation')}
          />
          <h1 style={{ margin: 0, fontFamily: 'Sora, sans-serif', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', flex: 1, textAlign: 'center', color: '#0A1B3D' }}>
            Profil du moniteur
          </h1>
          <div style={{ width: 46 }} />
        </div>

        <div style={{ borderRadius: 26, background: '#FFFFFF', padding: 18, boxShadow: '0 10px 30px -18px rgba(10,27,61,0.3)', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {error && <p style={{ color: '#C2410C', fontSize: 12.5, fontWeight: 600 }}>{error}</p>}
          {busy && <p style={{ color: '#5B6680', fontSize: 14, fontWeight: 600 }}>Chargement du profil…</p>}

          {!busy && !error && !moniteur ? (
            <p style={{ color: '#5B6680' }}>Moniteur introuvable.</p>
          ) : moniteur ? (
            <>
              {/* Profile Head */}
              <Card style={{ background: '#0A1B3D', color: '#FFFFFF', padding: '20px', borderRadius: 24, display: 'flex', gap: 16 }}>
                <div style={{ width: 80, height: 80, borderRadius: 20, overflow: 'hidden', flexShrink: 0 }}>
                  {moniteur.photoUrl ? (
                    <img
                      src={mediaSrc(moniteur.photoUrl)}
                      alt={`Portrait de ${moniteur.fullName}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', borderRadius: 20, background: '#FFB400', color: '#0A1B3D', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 24 }}>
                      {moniteur.fullName.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <h2 style={{ margin: 0, fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 700 }}>{moniteur.fullName}</h2>
                  {moniteur.city && (
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                      <MapPin size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> {moniteur.city}
                    </p>
                  )}
                  <StatCard
                    icon={<Car size={14} />}
                    label="Tarif horaire"
                    value={`${moniteur.defaultPriceFcfa.toLocaleString('fr-FR')} XOF/h`}
                  />
                  <p style={{ marginTop: 8, fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                    <Car size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> {vehicleTypesLabel}
                  </p>
                </div>
              </Card>

              {/* Vehicle */}
              <Card style={{ padding: '20px' }}>
                <SectionTitle>Véhicule utilisé</SectionTitle>
                {moniteur.vehiclePhotoUrl ? (
                  <img
                    src={mediaSrc(moniteur.vehiclePhotoUrl)}
                    alt={`Véhicule ${moniteur.vehicleBrand || ''}`.trim()}
                    style={{ width: '100%', borderRadius: 16, objectFit: 'cover', marginTop: 12 }}
                  />
                ) : (
                  <div style={{ height: 160, borderRadius: 16, background: '#F1F4F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8A93A8', marginTop: 12 }}>
                    Photo véhicule non disponible
                  </div>
                )}
                <p style={{ marginTop: 12, fontSize: 14, fontWeight: 600, color: '#0A1B3D' }}>{moniteur.vehicleBrand || 'Marque non renseignée'}</p>
              </Card>

              {/* Bio */}
              {moniteur.bio ? (
                <Card style={{ padding: '20px' }}>
                  <SectionTitle>Présentation</SectionTitle>
                  <p style={{ marginTop: 12, color: '#0A1B3D', lineHeight: 1.6 }}>{moniteur.bio}</p>
                </Card>
              ) : (
                <p style={{ color: '#8A93A8', marginTop: 12 }}>Présentation non renseignée pour le moment.</p>
              )}

              {/* Specialties */}
              {moniteur.specialties?.length ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {moniteur.specialties.map((item) => (
                    <Badge key={item} variant="green" icon={<CheckCircle2 size={13} />}>{item}</Badge>
                  ))}
                </div>
              ) : null}

              {/* Availability */}
              <Card style={{ padding: '20px' }}>
                <SectionTitle>Prochaines disponibilités</SectionTitle>
                {availabilityDays.length ? (
                  <ul className="mp-grid-desktop" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                    {availabilityDays.map((day) => (
                      <li key={day.date} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#F5F7FB', borderRadius: 14 }}>
                        <strong style={{ fontSize: 14 }}>{formatDayLabel(day.date)}</strong>
                        <span>
                          <Badge variant="yellow" size="sm">
                            {day.windows
                              .slice(0, 3)
                              .map((w) => `${formatTime(w.start)}–${formatTime(w.end)}`)
                              .join(' · ')}
                            {day.windows.length > 3 ? '…' : ''}
                          </Badge>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ color: '#8A93A8', marginTop: 12 }}>Aucune plage libre sur les 14 prochains jours (ou calendrier non chargé).</p>
                )}
              </Card>

              {/* Photos */}
              <Card style={{ padding: '20px' }}>
                <SectionTitle>Photos</SectionTitle>
                {photos.length ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginTop: 12 }}>
                    {photos.map((photo, index) => (
                      <button
                        key={photo}
                        type="button"
                        style={{ aspectRatio: '1', borderRadius: 14, overflow: 'hidden', border: 0, background: 'none', padding: 0, cursor: 'pointer' }}
                        onClick={() => setLightboxIndex(index)}
                      >
                        <img src={mediaSrc(photo)} alt={`Photo ${index + 1} de ${moniteur.fullName}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#8A93A8', marginTop: 12 }}>Pas encore de galerie photo.</p>
                )}
              </Card>

              {/* Videos */}
              <Card style={{ padding: '20px' }}>
                <SectionTitle>Vidéos de présentation</SectionTitle>
                {safeVideos.length ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
                    {safeVideos.map(({ video, embed }, index) => (
                      <div key={video} style={{ borderRadius: 16, overflow: 'hidden', background: '#000' }}>
                        <iframe
                          src={embed.src}
                          title={`Vidéo de présentation ${index + 1} — ${moniteur.fullName}`}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          sandbox="allow-scripts allow-same-origin allow-presentation"
                          referrerPolicy="strict-origin-when-cross-origin"
                          loading="lazy"
                          style={{ width: '100%', aspectRatio: '16/9', border: 0 }}
                        />
                        <a
                          href={embed.watchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'block', marginTop: 8, textAlign: 'center', color: '#067A37', fontWeight: 700, textDecoration: 'none' }}
                        >
                          Ouvrir la vidéo
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#8A93A8', marginTop: 12 }}>Pas encore de vidéo de présentation.</p>
                )}
              </Card>

              <Button
                variant="accent"
                fullWidth
                icon={<Car size={16} />}
                onClick={() => navigate(`/conduite/reservation?moniteurId=${moniteur.id}`)}
              >
                Choisir ce moniteur
              </Button>
            </>
          ) : null}
        </div>

      </div>

      {/* TabBar flottante (TabBar.html) */}
      <MainTabBar activeId="conduite" />

      {/* Lightbox */}
      {lightboxPhoto ? (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          role="dialog"
          aria-modal="true"
          aria-label="Aperçu photo"
          onClick={() => setLightboxIndex(null)}
          onKeyDown={(e) => { if (e.key === 'Escape') setLightboxIndex(null) }}
        >
          <button
            style={{ position: 'absolute', top: 20, right: 20, width: 44, height: 44, borderRadius: 22, background: 'rgba(255,255,255,0.1)', border: 0, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            aria-label="Fermer"
            onClick={() => setLightboxIndex(null)}
          >
            <X size={20} />
          </button>
          <img
            src={mediaSrc(lightboxPhoto)}
            alt={`Photo ${(lightboxIndex ?? 0) + 1} de ${moniteur?.fullName || 'moniteur'}`}
            style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  );
}

export default MoniteurProfilePage;