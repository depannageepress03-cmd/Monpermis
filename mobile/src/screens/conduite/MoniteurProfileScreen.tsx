import { useCallback, useMemo, useState } from 'react'
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack'
import {
  Calendar,
  Car,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  MapPin,
  User,
  X,
} from 'lucide-react-native'
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import {
  fetchMoniteurAvailability,
  fetchMoniteurProfile,
  ReservationError,
  type AvailabilityDay,
  type MoniteurProfile,
} from '../../api/reservations'
import { DarkHeader, DarkScreen } from '../../components/DarkScreen'
import { Bouncy } from '../../components/Bouncy'
import { ScreenLoader } from '../../components/ScreenLoader'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import type { RootStackParamList } from '../../navigation/types'
import { dark, fonts } from '../../theme'
import { resolveMoniteurVideoEmbed } from '../../utils/mediaEmbed'
import { resolveMediaUrl } from '../../utils/mediaUrl'
import { formatPrice } from '../../utils/money'
import { safeOpenUrl } from '../../utils/safeOpenUrl'

type Props = NativeStackScreenProps<RootStackParamList, 'MoniteurProfile'>
type Nav = NativeStackNavigationProp<RootStackParamList, 'MoniteurProfile'>

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

export function MoniteurProfileScreen() {
  const navigation = useNavigation<Nav>()
  const route = useRoute<Props['route']>()
  const { user, loading } = useRequireAuth(navigation)
  const moniteurId = route.params?.id ?? ''
  const [moniteur, setMoniteur] = useState<MoniteurProfile | null>(null)
  const [availabilityDays, setAvailabilityDays] = useState<AvailabilityDay[]>([])
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const load = useCallback(async () => {
    setFetching(true)
    setError(null)
    try {
      const [profileData, availability] = await Promise.all([
        fetchMoniteurProfile(moniteurId),
        fetchMoniteurAvailability({ moniteurId, days: 14 }).catch(() => null),
      ])
      setMoniteur(profileData.moniteur)
      const days = availability?.days?.filter((d) => d.windows?.length) ?? []
      setAvailabilityDays(days.slice(0, 5))
    } catch (err) {
      setMoniteur(null)
      setError(err instanceof ReservationError ? err.message : 'Profil indisponible')
    } finally {
      setFetching(false)
    }
  }, [moniteurId])

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load]),
  )

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

  if (loading || !user) return <ScreenLoader />

  if (!moniteurId) {
    return (
      <DarkScreen>
        <DarkHeader title="Profil du moniteur" onBack={() => navigation.goBack()} icon={User} />
        <View style={styles.empty}>
          <User size={28} color={dark.textMuted} />
          <Text style={styles.emptyTitle}>Moniteur introuvable</Text>
        </View>
      </DarkScreen>
    )
  }

  const photos = moniteur?.photos ?? []
  const lightboxPhoto = lightboxIndex != null ? photos[lightboxIndex] : null
  const portrait = moniteur ? resolveMediaUrl(moniteur.photoUrl) : undefined
  const vehiclePhoto = moniteur ? resolveMediaUrl(moniteur.vehiclePhotoUrl) : undefined

  return (
    <DarkScreen>
      <DarkHeader title="Profil du moniteur" onBack={() => navigation.goBack()} icon={User} />
      {fetching ? (
        <ScreenLoader />
      ) : error ? (
        <View style={styles.empty}>
          <User size={28} color={dark.textMuted} />
          <Text style={styles.emptyTitle}>Profil indisponible</Text>
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : !moniteur ? (
        <View style={styles.empty}>
          <User size={28} color={dark.textMuted} />
          <Text style={styles.emptyTitle}>Moniteur introuvable</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.card}>
            <View style={styles.head}>
              {portrait ? (
                <Image source={{ uri: portrait }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarLetter}>
                    {(moniteur.fullName || '?').slice(0, 1).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.identity}>
                <Text style={styles.name}>{moniteur.fullName || 'Moniteur'}</Text>
                {moniteur.city ? (
                  <Text style={styles.meta}>
                    <MapPin size={13} color={dark.textMuted} /> {moniteur.city}
                  </Text>
                ) : null}
                <Text style={styles.price}>
                  {formatPrice(moniteur.defaultPriceFcfa)}/h
                </Text>
                <Text style={styles.meta}>
                  <Car size={13} color={dark.textMuted} /> {vehicleTypesLabel}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Véhicule utilisé</Text>
            {vehiclePhoto ? (
              <Image source={{ uri: vehiclePhoto }} style={styles.vehiclePhoto} />
            ) : (
              <View style={[styles.vehiclePhoto, styles.vehiclePlaceholder]}>
                <Text style={styles.emptyText}>Photo véhicule non disponible</Text>
              </View>
            )}
            <Text style={styles.body}>{moniteur.vehicleBrand || 'Marque non renseignée'}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Présentation</Text>
            {moniteur.bio ? (
              <Text style={styles.body}>{moniteur.bio}</Text>
            ) : (
              <Text style={styles.emptyText}>Présentation non renseignée pour le moment.</Text>
            )}
            {moniteur.specialties?.length ? (
              <View style={styles.chips}>
                {moniteur.specialties.map((item) => (
                  <View key={item} style={styles.chip}>
                    <CheckCircle2 size={12} color={dark.green} />
                    <Text style={styles.chipText}>{item}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Prochaines disponibilités</Text>
            {availabilityDays.length ? (
              availabilityDays.map((day) => (
                <View key={day.date} style={styles.availRow}>
                  <Text style={styles.availDate}>{formatDayLabel(day.date)}</Text>
                  <Text style={styles.availWindows} numberOfLines={2}>
                    {day.windows
                      .slice(0, 3)
                      .map((w) => `${w.start}–${w.end}`)
                      .join(' · ')}
                    {day.windows.length > 3 ? '…' : ''}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>
                Aucune plage libre sur les 14 prochains jours (ou calendrier non chargé).
              </Text>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Photos</Text>
            {photos.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.gallery}>
                  {photos.map((photo, index) => {
                    const uri = resolveMediaUrl(photo)
                    if (!uri) return null
                    return (
                      <Pressable key={photo} onPress={() => setLightboxIndex(index)}>
                        <Image source={{ uri }} style={styles.thumb} />
                      </Pressable>
                    )
                  })}
                </View>
              </ScrollView>
            ) : (
              <Text style={styles.emptyText}>Pas encore de galerie photo.</Text>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Vidéos de présentation</Text>
            {safeVideos.length ? (
              safeVideos.map(({ video, embed }, index) => (
                <Pressable
                  key={video}
                  style={styles.videoRow}
                  onPress={() => void safeOpenUrl(embed.watchUrl)}
                >
                  <Text style={styles.videoText} numberOfLines={1}>
                    Vidéo de présentation {index + 1}
                  </Text>
                  <ExternalLink size={14} color={dark.green} />
                </Pressable>
              ))
            ) : (
              <Text style={styles.emptyText}>Pas encore de vidéo de présentation.</Text>
            )}
          </View>

          <Bouncy
            scaleTo={0.97}
            style={styles.cta}
            innerStyle={styles.ctaInner}
            onPress={() => navigation.navigate('ReservationFlow', { moniteurId: moniteur.id })}
          >
            <Text style={styles.ctaText}>Choisir ce moniteur</Text>
            <ChevronRight size={16} color="#0B0F1A" />
          </Bouncy>
          <View style={styles.bottomSpace} />
        </ScrollView>
      )}

      <Modal visible={lightboxPhoto != null} transparent animationType="fade">
        <Pressable style={styles.lightbox} onPress={() => setLightboxIndex(null)}>
          <Pressable style={styles.lightboxClose} onPress={() => setLightboxIndex(null)}>
            <X size={20} color="#FFFFFF" />
          </Pressable>
          {lightboxPhoto ? (
            (() => {
              const uri = resolveMediaUrl(lightboxPhoto)
              return uri ? (
                <Image source={{ uri }} style={styles.lightboxImage} resizeMode="contain" />
              ) : null
            })()
          ) : null}
        </Pressable>
      </Modal>
    </DarkScreen>
  )
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 12,
  },
  card: {
    backgroundColor: dark.surface,
    borderWidth: 1,
    borderColor: dark.border,
    borderRadius: 16,
    padding: 16,
  },
  head: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: dark.surfaceRaised,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontFamily: fonts.displayBold,
    fontSize: 28,
    color: dark.green,
  },
  identity: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: dark.textPrimary,
  },
  meta: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: dark.textMuted,
  },
  price: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: dark.green,
  },
  sectionTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: dark.textPrimary,
    marginBottom: 10,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: dark.textPrimary,
  },
  vehiclePhoto: {
    width: '100%',
    height: 170,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: dark.surfaceRaised,
  },
  vehiclePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: dark.green,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: dark.textPrimary,
  },
  availRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: dark.border,
  },
  availDate: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: dark.textPrimary,
    textTransform: 'capitalize',
  },
  availWindows: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: dark.textMuted,
    flex: 1,
    textAlign: 'right',
  },
  gallery: {
    flexDirection: 'row',
    gap: 10,
  },
  thumb: {
    width: 120,
    height: 90,
    borderRadius: 10,
    backgroundColor: dark.surfaceRaised,
  },
  videoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: dark.border,
  },
  videoText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: dark.textPrimary,
    flex: 1,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: dark.green,
    borderRadius: 999,
    paddingVertical: 14,
  },
  ctaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  ctaText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: '#0B0F1A',
  },
  bottomSpace: { height: 32 },
  empty: {
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: dark.textPrimary,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: dark.textMuted,
    textAlign: 'center',
  },
  lightbox: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  lightboxClose: {
    position: 'absolute',
    top: 56,
    right: 24,
    padding: 8,
  },
  lightboxImage: {
    width: '100%',
    height: '70%',
  },
})
