import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { CalendarOff, CalendarPlus, Check, MapPin } from 'lucide-react-native'
import {
  ActivityIndicator,
  Animated,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import {
  computeDrivingAmount,
  createReservation,
  earliestBookableTime,
  fetchMoniteurAvailability,
  fetchMoniteurProfile,
  fetchPublicMoniteurs,
  HOURS_DISCOUNT_FCFA,
  HOURS_DISCOUNT_MIN_HOURS,
  requestReservationSlot,
  ReservationError,
  type AvailabilityDay,
  type AvailabilityWindow,
  type MoniteurProfile,
  type MoniteurPublic,
} from '../../api/reservations'
import { fetchAccessMe } from '../../api/accessRequests'
import { DarkScreen } from '../../components/DarkScreen'
import { EmptyState } from '../../components/EmptyState'
import { PageNavbar } from '../../components/PageNavbar'
import {
  ReservationMobileMoneyCheckout,
  type ReservationCheckoutSlot,
} from '../../components/ReservationMobileMoneyCheckout'
import { ScreenLoader } from '../../components/ScreenLoader'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import type { RootStackParamList } from '../../navigation/types'
import { dark, fonts } from '../../theme'
import { resolveMediaUrl } from '../../utils/mediaUrl'

type Nav = NativeStackNavigationProp<RootStackParamList, 'ReservationFlow'>
type Step = 'moniteur' | 'profile' | 'duration' | 'slots'

const DURATION_OPTIONS = [1, 2, 3, 4]

function timeToMinutes(value: string) {
  const [h, m] = value.split(':').map((v) => parseInt(v, 10) || 0)
  return h * 60 + m
}

function minutesToTime(total: number) {
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Créneaux de départ possibles pour une durée, dans les fenêtres libres.
 * `minStart` exclut les heures déjà passées si l'écran reste ouvert.
 */
function slotsForDuration(
  windows: AvailabilityWindow[],
  durationHours: number,
  minStart: string | null = null,
  stepMinutes = 30,
) {
  const durationMin = Math.round(durationHours * 60)
  const floorMin = minStart ? timeToMinutes(minStart) : -1
  const out: { start: string; end: string }[] = []
  for (const window of windows) {
    const startMin = Math.max(timeToMinutes(window.start), floorMin)
    const endMin = timeToMinutes(window.end)
    for (let t = startMin; t + durationMin <= endMin; t += stepMinutes) {
      out.push({
        start: minutesToTime(t),
        end: minutesToTime(t + durationMin),
      })
    }
  }
  return out
}

function formatDateLabel(date: string) {
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

function formatDayChip(date: string) {
  try {
    const d = new Date(`${date}T12:00:00`)
    return {
      weekday: d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace(/\.$/, ''),
      day: String(d.getDate()),
      month: d.toLocaleDateString('fr-FR', { month: 'short' }).replace(/\.$/, ''),
    }
  } catch {
    return { weekday: date, day: '', month: '' }
  }
}

export function ReservationFlowScreen() {
  const navigation = useNavigation<Nav>()
  const { user, loading } = useRequireAuth(navigation)
  const [step, setStep] = useState<Step>('moniteur')
  const [moniteurId, setMoniteurId] = useState<string | undefined>(undefined)
  const [moniteurs, setMoniteurs] = useState<MoniteurPublic[]>([])
  const [profile, setProfile] = useState<MoniteurProfile | null>(null)
  const [availabilityDays, setAvailabilityDays] = useState<AvailabilityDay[]>([])
  const [hourlyPriceFcfa, setHourlyPriceFcfa] = useState(5000)
  const [hoursDiscount, setHoursDiscount] = useState(HOURS_DISCOUNT_FCFA)
  const [hoursDiscountMin, setHoursDiscountMin] = useState(HOURS_DISCOUNT_MIN_HOURS)
  const [durationHours, setDurationHours] = useState(1)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedStart, setSelectedStart] = useState('')
  const [selectedEnd, setSelectedEnd] = useState('')
  const [soldeHeures, setSoldeHeures] = useState<number | null>(null)
  const [checkoutSlot, setCheckoutSlot] = useState<ReservationCheckoutSlot | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mmOpen, setMmOpen] = useState(false)
  const stepProgress = useRef(new Animated.Value(0)).current

  const stepOrder = step === 'moniteur' || step === 'profile' ? 0 : step === 'duration' ? 1 : 2

  useEffect(() => {
    Animated.timing(stepProgress, {
      toValue: stepOrder / 2,
      duration: 280,
      useNativeDriver: false,
    }).start()
  }, [stepOrder, stepProgress])

  const selectedMoniteur = useMemo(
    () => moniteurs.find((item) => item.id === moniteurId) ?? profile,
    [moniteurs, moniteurId, profile],
  )

  const vehicleType = selectedMoniteur?.vehicleTypes?.[0] || 'voiture'

  const daysWithSlots = useMemo(() => {
    return availabilityDays
      .map((day) => ({
        date: day.date,
        slots: slotsForDuration(day.windows, durationHours, earliestBookableTime(day.date)),
      }))
      .filter((day) => day.slots.length > 0)
  }, [availabilityDays, durationHours])

  const selectedDaySlots = useMemo(
    () => daysWithSlots.find((day) => day.date === selectedDate)?.slots ?? [],
    [daysWithSlots, selectedDate],
  )

  const priceFcfa = computeDrivingAmount(
    hourlyPriceFcfa,
    durationHours,
    hoursDiscount,
    hoursDiscountMin,
  )
  const priceDiscount = Math.max(0, Math.round(hourlyPriceFcfa * durationHours) - priceFcfa)

  const loadMoniteurs = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const data = await fetchPublicMoniteurs()
      setMoniteurs(data.moniteurs)
    } catch (err) {
      setError(err instanceof ReservationError ? err.message : 'Moniteurs indisponibles')
    } finally {
      setBusy(false)
    }
  }, [])

  const loadProfile = useCallback(async (id: string) => {
    setBusy(true)
    setError(null)
    try {
      const data = await fetchMoniteurProfile(id)
      setProfile(data.moniteur)
      setMoniteurId(data.moniteur.id)
      setStep('profile')
    } catch (err) {
      setError(err instanceof ReservationError ? err.message : 'Profil indisponible')
    } finally {
      setBusy(false)
    }
  }, [])

  const loadAvailability = useCallback(async () => {
    if (!moniteurId) return
    setBusy(true)
    setError(null)
    try {
      const data = await fetchMoniteurAvailability({ moniteurId, days: 14 })
      setAvailabilityDays(data.days)
      setHourlyPriceFcfa(data.hourlyPriceFcfa || data.moniteur.defaultPriceFcfa || 5000)
      if (data.hoursDiscountFcfa !== undefined) setHoursDiscount(data.hoursDiscountFcfa)
      if (data.hoursDiscountMinHours !== undefined) setHoursDiscountMin(data.hoursDiscountMinHours)
    } catch (err) {
      setError(err instanceof ReservationError ? err.message : 'Disponibilités indisponibles')
    } finally {
      setBusy(false)
    }
  }, [moniteurId])

  useEffect(() => {
    if (step === 'moniteur') void loadMoniteurs()
  }, [step, loadMoniteurs])

  useEffect(() => {
    if (step === 'duration' || step === 'slots') void loadAvailability()
  }, [step, loadAvailability])

  useEffect(() => {
    fetchAccessMe()
      .then((data) => setSoldeHeures(data.user.soldeHeures))
      .catch(() => setSoldeHeures(null))
  }, [])

  useEffect(() => {
    if (!daysWithSlots.length) {
      setSelectedDate('')
      setSelectedStart('')
      setSelectedEnd('')
      return
    }
    setSelectedDate((prev) =>
      daysWithSlots.some((day) => day.date === prev) ? prev : daysWithSlots[0].date,
    )
  }, [daysWithSlots])

  useEffect(() => {
    const slots = daysWithSlots.find((day) => day.date === selectedDate)?.slots ?? []
    if (!slots.length) {
      setSelectedStart('')
      setSelectedEnd('')
      return
    }
    setSelectedStart((prevStart) => {
      const still = slots.some((s) => s.start === prevStart)
      return still ? prevStart : slots[0].start
    })
    setSelectedEnd((prevEnd) => {
      const match = slots.find((s) => s.end === prevEnd && s.start === selectedStart)
      if (match) return prevEnd
      const byStart = slots.find((s) => s.start === selectedStart)
      return byStart?.end || slots[0].end
    })
  }, [daysWithSlots, selectedDate, selectedStart])

  const goConfirmPage = (params: {
    reservationId: string
    moniteurName: string
    vehicleBrand?: string
    date: string
    startTime: string
    endTime: string
    hours: number
    priceFcfa: number
    paymentMethod: 'solde' | 'mobile_money' | 'promo'
    whatsappLink?: string
  }) => {
    setMmOpen(false)
    setCheckoutSlot(null)
    navigation.replace('ReservationConfirm', { ...params, fromList: false })
  }

  const openPaymentCheckout = () => {
    if (!moniteurId || !selectedDate || !selectedStart || !selectedEnd) return
    setCheckoutSlot({
      moniteurId,
      date: selectedDate,
      startTime: selectedStart,
      endTime: selectedEnd,
      vehicleType: vehicleType || 'voiture',
      hours: durationHours,
      amount: priceFcfa,
    })
    setMmOpen(true)
  }

  const onContinue = async () => {
    if (!moniteurId || !selectedDate || !selectedStart || !selectedEnd) {
      setError('Choisissez un créneau disponible')
      return
    }
    setBusy(true)
    setError(null)
    try {
      let currentSolde = soldeHeures
      try {
        const access = await fetchAccessMe()
        currentSolde = access.user.soldeHeures
        setSoldeHeures(currentSolde)
      } catch {
        /* ignore */
      }

      // Solde déjà suffisant (ex. code promo déjà appliqué) → confirmation sans MM
      if (currentSolde !== null && currentSolde >= durationHours) {
        const data = await requestReservationSlot({
          moniteurId,
          date: selectedDate,
          startTime: selectedStart,
          endTime: selectedEnd,
          vehicleType: vehicleType || 'voiture',
        })
        const result = await createReservation({
          creneauIds: [String(data.creneau.id)],
          vehicleType: data.creneau.vehicleType || vehicleType || 'voiture',
          moniteurId,
          paymentMethod: 'solde',
        })
        const reservation = result.reservations?.[0] || result.reservation
        goConfirmPage({
          reservationId: reservation?.id || String(data.creneau.id),
          moniteurName: selectedMoniteur?.fullName || 'Moniteur',
          vehicleBrand: selectedMoniteur?.vehicleBrand || '',
          date: selectedDate,
          startTime: selectedStart,
          endTime: selectedEnd,
          hours: durationHours,
          priceFcfa: data.amountFcfa ?? priceFcfa,
          paymentMethod: 'solde',
          whatsappLink: result.whatsappLink,
        })
        return
      }

      openPaymentCheckout()
    } catch (err) {
      setError(err instanceof ReservationError ? err.message : 'Impossible de continuer')
      void loadAvailability()
    } finally {
      setBusy(false)
    }
  }

  if (loading || !user) return <ScreenLoader />

  return (
    <DarkScreen>
      <PageNavbar
        title="Nouvelle séance"
        icon={CalendarPlus}
        onBack={() => {
          if (step === 'profile') setStep('moniteur')
          else if (step === 'duration') setStep('profile')
          else if (step === 'slots') setStep('duration')
          else navigation.goBack()
        }}
        tone="drive"
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.stepper}>
          <View style={styles.stepperTrack}>
            <Animated.View
              style={[
                styles.stepperFill,
                {
                  width: stepProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
          <View style={styles.stepsRow}>
            {[
              { id: 'moniteur', label: 'Moniteur' },
              { id: 'duration', label: 'Durée' },
              { id: 'slots', label: 'Créneau' },
            ].map((item, index) => {
              const itemOrder = index
              const current = stepOrder === itemOrder
              const done = stepOrder > itemOrder
              return (
                <View key={item.id} style={styles.stepItem}>
                  <View
                    style={[
                      styles.stepDot,
                      (current || done) && styles.stepDotActive,
                      current && styles.stepDotCurrent,
                    ]}
                  >
                    {done ? (
                      <Check size={12} color="#0B0F1A" strokeWidth={3} />
                    ) : (
                      <Text style={[styles.stepDotText, (current || done) && styles.stepDotTextActive]}>
                        {index + 1}
                      </Text>
                    )}
                  </View>
                  <Text style={[styles.stepPillText, (current || done) && styles.stepPillTextActive]}>
                    {item.label}
                  </Text>
                </View>
              )
            })}
          </View>
        </View>

        {step === 'moniteur' ? (
          <View>
            <Text style={styles.introTitle}>Réserver une séance</Text>
            <Text style={styles.introText}>
              Consultez le profil du moniteur, choisissez la durée, puis un créneau libre.
            </Text>
            <Text style={styles.section}>Choisissez un moniteur</Text>
            {busy ? <ActivityIndicator color={dark.green} /> : null}
            {!busy && moniteurs.length === 0 ? (
              <Text style={styles.empty}>Aucun moniteur disponible pour le moment.</Text>
            ) : null}
            {moniteurs.map((moniteur) => (
              <Pressable
                key={moniteur.id}
                style={styles.choice}
                onPress={() => void loadProfile(moniteur.id)}
              >
                <View style={styles.moniteurRow}>
                  {moniteur.photoUrl ? (
                    <Image
                      source={{ uri: resolveMediaUrl(moniteur.photoUrl) }}
                      style={styles.listAvatar}
                    />
                  ) : moniteur.vehiclePhotoUrl ? (
                    <Image
                      source={{ uri: resolveMediaUrl(moniteur.vehiclePhotoUrl) }}
                      style={styles.carThumb}
                    />
                  ) : (
                    <View style={styles.carPlaceholder}>
                      <Text style={styles.carPlaceholderText}>Moniteur</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.choiceText}>{moniteur.fullName}</Text>
                    <Text style={styles.brandText}>
                      {moniteur.vehicleBrand || 'Marque non renseignée'}
                    </Text>
                    <Text style={styles.typeText}>{moniteur.vehicleTypes?.[0] || 'Véhicule'}</Text>
                    <Text style={styles.seeProfile}>Voir le profil →</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}

        {step === 'profile' && profile ? (
          <View>
            <Text style={styles.introTitle}>Profil du moniteur</Text>
            {busy ? <ActivityIndicator color={dark.green} /> : null}
            <View style={styles.profileHero}>
              {profile.photoUrl ? (
                <Image
                  source={{ uri: resolveMediaUrl(profile.photoUrl) }}
                  style={styles.profileAvatar}
                />
              ) : (
                <View style={[styles.profileAvatar, styles.coverPlaceholder]}>
                  <Text style={styles.avatarInitial}>
                    {profile.fullName.slice(0, 1).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.profileHeroCopy}>
                <Text style={styles.profileName}>{profile.fullName}</Text>
                {profile.city ? (
                  <View style={styles.metaRow}>
                    <MapPin size={14} color={dark.textMuted} />
                    <Text style={styles.brandText}>{profile.city}</Text>
                  </View>
                ) : null}
                <Text style={styles.typeText}>
                  {profile.vehicleTypes?.[0] || 'Véhicule'} ·{' '}
                  {profile.defaultPriceFcfa.toLocaleString('fr-FR')} FCFA/h
                </Text>
              </View>
            </View>

            <View style={styles.vehicleCard}>
              <Text style={styles.vehicleCardTitle}>Véhicule utilisé</Text>
              {profile.vehiclePhotoUrl ? (
                <Image
                  source={{ uri: resolveMediaUrl(profile.vehiclePhotoUrl) }}
                  style={styles.vehiclePhoto}
                />
              ) : (
                <View style={[styles.vehiclePhoto, styles.coverPlaceholder]}>
                  <Text style={styles.carPlaceholderText}>Photo véhicule non disponible</Text>
                </View>
              )}
              <Text style={styles.vehicleBrand}>
                {profile.vehicleBrand || 'Marque non renseignée'}
              </Text>
            </View>

            {profile.bio ? (
              <View style={styles.bioBox}>
                <Text style={styles.section}>Présentation</Text>
                <Text style={styles.bioText}>{profile.bio}</Text>
              </View>
            ) : null}

            {profile.specialties?.length ? (
              <View>
                <Text style={styles.section}>Spécialités</Text>
                <View style={styles.slotsRow}>
                  {profile.specialties.map((item) => (
                    <View key={item} style={styles.specialtyChip}>
                      <Text style={styles.specialtyText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {profile.photos?.length ? (
              <View>
                <Text style={styles.section}>Galerie</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10 }}
                >
                  {profile.photos.map((photo) => (
                    <Image
                      key={photo}
                      source={{ uri: resolveMediaUrl(photo) }}
                      style={styles.galleryPhoto}
                    />
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {profile.videos?.length
              ? profile.videos.map((video) => (
                  <Pressable
                    key={video}
                    style={styles.secondaryBtn}
                    onPress={() => void Linking.openURL(video)}
                  >
                    <Text style={styles.secondaryBtnText}>Ouvrir la vidéo</Text>
                  </Pressable>
                ))
              : null}

            <Pressable style={styles.primaryBtn} onPress={() => setStep('duration')}>
              <Text style={styles.primaryBtnText}>Choisir ce moniteur</Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={() => setStep('moniteur')}>
              <Text style={styles.secondaryBtnText}>Retour à la liste</Text>
            </Pressable>
          </View>
        ) : null}

        {step === 'duration' ? (
          <View>
            <Text style={styles.introTitle}>Durée de la séance</Text>
            <Text style={styles.introText}>
              Choisissez combien d’heures vous souhaitez. Nous afficherons ensuite uniquement les
              créneaux encore libres pour cette durée.
            </Text>

            {selectedMoniteur ? (
              <View style={styles.recapStrip}>
                {selectedMoniteur.photoUrl ? (
                  <Image
                    source={{ uri: resolveMediaUrl(selectedMoniteur.photoUrl) }}
                    style={styles.recapAvatar}
                  />
                ) : null}
                <View style={{ flex: 1 }}>
                  <Text style={styles.choiceText}>{selectedMoniteur.fullName}</Text>
                  <Text style={styles.brandText}>
                    {selectedMoniteur.vehicleBrand || 'Véhicule'} · {vehicleType}
                  </Text>
                </View>
              </View>
            ) : null}

            <Text style={styles.section}>Combien d’heures ?</Text>
            <View style={styles.slotsRow}>
              {DURATION_OPTIONS.map((hours) => {
                const active = durationHours === hours
                return (
                  <Pressable
                    key={hours}
                    style={[styles.durationChip, active && styles.durationChipActive]}
                    onPress={() => setDurationHours(hours)}
                  >
                    <Text style={[styles.durationChipText, active && styles.durationChipTextActive]}>
                      {hours} h
                    </Text>
                    <Text style={[styles.durationPrice, active && styles.durationChipTextActive]}>
                      {computeDrivingAmount(
                        hourlyPriceFcfa,
                        hours,
                        hoursDiscount,
                        hoursDiscountMin,
                      ).toLocaleString('fr-FR')}{' '}
                      F
                    </Text>
                  </Pressable>
                )
              })}
            </View>

            <Pressable
              style={[styles.primaryBtn, busy && styles.disabled]}
              disabled={busy}
              onPress={() => setStep('slots')}
            >
              <Text style={styles.primaryBtnText}>Voir les créneaux disponibles</Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={() => setStep('moniteur')}>
              <Text style={styles.secondaryBtnText}>Changer de moniteur</Text>
            </Pressable>
          </View>
        ) : null}

        {step === 'slots' ? (
          <View>
            <Text style={styles.introTitle}>Créneaux disponibles</Text>
            <Text style={styles.introText}>
              Durée choisie : {durationHours} h. Seuls les horaires où le moniteur est réellement
              libre s’affichent.
            </Text>

            <View style={styles.recapStrip}>
              <View style={{ flex: 1 }}>
                <Text style={styles.choiceText}>
                  {selectedMoniteur?.fullName || 'Moniteur'} · {durationHours} h
                </Text>
                <Text style={styles.brandText}>
                  ~ {priceFcfa.toLocaleString('fr-FR')} FCFA
                  {priceDiscount > 0 ? ` (−${priceDiscount.toLocaleString('fr-FR')})` : ''}
                  {soldeHeures !== null ? ` · solde ${soldeHeures} h` : ''}
                </Text>
              </View>
              <Pressable onPress={() => setStep('duration')}>
                <Text style={styles.seeProfile}>Modifier</Text>
              </Pressable>
            </View>

            {busy ? <ActivityIndicator color={dark.green} style={{ marginVertical: 12 }} /> : null}

            {daysWithSlots.length === 0 && !busy ? (
              <EmptyState
                icon={<CalendarOff size={30} color={dark.textMuted} />}
                title="Aucun créneau disponible"
                message={`Pas de plage de ${durationHours} h libre sur les 14 prochains jours.`}
                action={
                  <View style={{ width: '100%', gap: 8 }}>
                    <Pressable style={styles.primaryBtn} onPress={() => setStep('duration')}>
                      <Text style={styles.primaryBtnText}>Réduire la durée</Text>
                    </Pressable>
                    <Pressable style={styles.secondaryBtn} onPress={() => setStep('moniteur')}>
                      <Text style={styles.secondaryBtnText}>Voir un autre moniteur</Text>
                    </Pressable>
                  </View>
                }
              />
            ) : null}

            <Text style={styles.section}>Jour</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dayChipsRow}
            >
              {daysWithSlots.map((day) => {
                const active = selectedDate === day.date
                const chip = formatDayChip(day.date)
                return (
                  <Pressable
                    key={day.date}
                    onPress={() => {
                      setSelectedDate(day.date)
                      setSelectedStart(day.slots[0]?.start || '')
                      setSelectedEnd(day.slots[0]?.end || '')
                    }}
                    style={[styles.dayChip, active && styles.dayChipActive]}
                  >
                    <Text style={[styles.dayChipWeekday, active && styles.dayChipTextActive]}>
                      {chip.weekday}
                    </Text>
                    <Text style={[styles.dayChipDay, active && styles.dayChipTextActive]}>
                      {chip.day}
                    </Text>
                    <Text style={[styles.dayChipMonth, active && styles.dayChipTextActive]}>
                      {chip.month}
                    </Text>
                  </Pressable>
                )
              })}
            </ScrollView>

            {selectedDate ? (
              <View style={styles.dayCard}>
                <Text style={styles.dayTitle}>{formatDateLabel(selectedDate)}</Text>
                <Text style={styles.fieldLabel}>Horaires libres ({durationHours} h)</Text>
                {earliestBookableTime(selectedDate) ? (
                  <Text style={styles.brandText}>
                    Réservation possible à partir de {earliestBookableTime(selectedDate)}{' '}
                    aujourd’hui.
                  </Text>
                ) : null}
                {selectedDaySlots.length === 0 ? (
                  <Text style={styles.empty}>
                    Plus de créneau disponible aujourd’hui. Choisissez un autre jour.
                  </Text>
                ) : null}
                <View style={styles.slotsRow}>
                  {selectedDaySlots.map((slot) => {
                    const active = selectedStart === slot.start && selectedEnd === slot.end
                    return (
                      <Pressable
                        key={`${slot.start}-${slot.end}`}
                        onPress={() => {
                          setSelectedStart(slot.start)
                          setSelectedEnd(slot.end)
                          void import('../../utils/haptics').then((m) => m.hapticSelect())
                        }}
                        style={[styles.windowChip, active && styles.windowChipActive]}
                      >
                        <Text
                          style={[styles.windowChipText, active && styles.windowChipTextActive]}
                        >
                          {slot.start} – {slot.end}
                        </Text>
                      </Pressable>
                    )
                  })}
                </View>

                {selectedStart && selectedEnd ? (
                  <View style={styles.durationBadge}>
                    <Text style={styles.durationBadgeText}>
                      {selectedDate} · {selectedStart} – {selectedEnd} · {durationHours} h ·{' '}
                      {priceFcfa.toLocaleString('fr-FR')} FCFA
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            <Pressable style={styles.secondaryBtn} onPress={() => setStep('duration')}>
              <Text style={styles.secondaryBtnText}>Changer la durée</Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={() => setStep('moniteur')}>
              <Text style={styles.secondaryBtnText}>Changer de moniteur</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      {step === 'slots' && selectedStart && selectedEnd ? (
        <View style={styles.stickyBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.stickyTitle}>
              {selectedDate} · {selectedStart}–{selectedEnd}
            </Text>
            <Text style={styles.stickyPrice}>
              {priceFcfa.toLocaleString('fr-FR')} FCFA
              {priceDiscount > 0 ? ` (−${priceDiscount.toLocaleString('fr-FR')})` : ''}
            </Text>
          </View>
          <Pressable
            style={[styles.stickyBtn, busy && styles.disabled]}
            disabled={busy}
            onPress={() => void onContinue()}
          >
            <Text style={styles.stickyBtnText}>{busy ? '…' : 'Confirmer'}</Text>
          </Pressable>
        </View>
      ) : null}

      {checkoutSlot ? (
        <ReservationMobileMoneyCheckout
          visible={mmOpen}
          label={`${checkoutSlot.date} · ${checkoutSlot.startTime} – ${checkoutSlot.endTime}`}
          amount={checkoutSlot.amount || priceFcfa}
          slot={checkoutSlot}
          hoursNeeded={durationHours}
          defaultPhone={user.phone || ''}
          onClose={() => {
            setMmOpen(false)
            setCheckoutSlot(null)
          }}
          onSoldeSuccess={(result) => {
            const reservation = result.reservations?.[0]
            goConfirmPage({
              reservationId: reservation?.id || checkoutSlot.creneauId || 'ok',
              moniteurName: selectedMoniteur?.fullName || 'Moniteur',
              vehicleBrand: selectedMoniteur?.vehicleBrand || '',
              date: checkoutSlot.date,
              startTime: checkoutSlot.startTime,
              endTime: checkoutSlot.endTime,
              hours: durationHours,
              priceFcfa: checkoutSlot.amount || priceFcfa,
              paymentMethod: 'promo',
              whatsappLink: result.whatsappLink,
            })
          }}
          onSuccess={(reservations) => {
            const first = reservations[0]
            goConfirmPage({
              reservationId: first?.id || 'ok',
              moniteurName: selectedMoniteur?.fullName || first?.moniteur?.fullName || 'Moniteur',
              vehicleBrand:
                selectedMoniteur?.vehicleBrand || first?.moniteur?.vehicleBrand || '',
              date: first?.creneau?.date || checkoutSlot.date,
              startTime: first?.creneau?.startTime || checkoutSlot.startTime,
              endTime: first?.creneau?.endTime || checkoutSlot.endTime,
              hours: durationHours,
              priceFcfa: first?.priceFcfa || checkoutSlot.amount || priceFcfa,
              paymentMethod: 'mobile_money',
            })
          }}
        />
      ) : null}
    </DarkScreen>
  )
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 120 },
  stickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingBottom: 22,
    borderTopWidth: 1,
    borderTopColor: dark.border,
    backgroundColor: dark.bg,
  },
  stickyTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: dark.textPrimary,
  },
  stickyPrice: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: dark.green,
    marginTop: 2,
  },
  stickyBtn: {
    borderRadius: 14,
    backgroundColor: dark.green,
    paddingHorizontal: 18,
    paddingVertical: 14,
    minWidth: 110,
    alignItems: 'center',
  },
  stickyBtnText: {
    color: '#0B0F1A',
    fontFamily: fonts.displayBold,
    fontSize: 15,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  stepper: { marginBottom: 18, gap: 10 },
  stepperTrack: {
    height: 4,
    borderRadius: 999,
    backgroundColor: dark.border,
    overflow: 'hidden',
  },
  stepperFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: dark.green,
  },
  stepItem: { flex: 1, alignItems: 'center', gap: 6 },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: dark.border,
    backgroundColor: dark.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    borderColor: dark.green,
    backgroundColor: dark.green,
  },
  stepDotCurrent: {
    backgroundColor: dark.greenSoft,
    borderColor: dark.green,
  },
  stepDotText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: dark.textMuted,
  },
  stepDotTextActive: { color: dark.textPrimary },
  stepPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: dark.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: dark.surface,
  },
  stepPillCurrent: { borderColor: dark.green, backgroundColor: dark.greenSoft },
  stepPillDone: { borderColor: dark.border, opacity: 0.85 },
  stepPillText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: dark.textMuted },
  stepPillTextActive: { color: dark.textPrimary },
  introTitle: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 22,
    color: dark.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  introText: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: dark.textMuted,
    marginBottom: 14,
  },
  section: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: dark.textPrimary,
    marginTop: 12,
    marginBottom: 12,
  },
  choice: {
    borderWidth: 1.5,
    borderColor: dark.border,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    backgroundColor: dark.surface,
  },
  choiceText: { color: dark.textPrimary, fontFamily: fonts.bodyBold, fontSize: 15 },
  moniteurRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  listAvatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: dark.surfaceRaised,
    borderWidth: 2,
    borderColor: dark.green,
  },
  carThumb: {
    width: 68,
    height: 52,
    borderRadius: 10,
    backgroundColor: dark.surfaceRaised,
  },
  carPlaceholder: {
    width: 68,
    height: 52,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: dark.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dark.surfaceRaised,
  },
  carPlaceholderText: {
    fontSize: 10,
    color: dark.textMuted,
    fontFamily: fonts.bodySemiBold,
  },
  brandText: {
    marginTop: 2,
    fontSize: 12,
    color: dark.textMuted,
    fontFamily: fonts.bodySemiBold,
  },
  typeText: {
    marginTop: 2,
    fontSize: 12,
    color: dark.green,
    fontFamily: fonts.displayBold,
  },
  seeProfile: {
    marginTop: 6,
    fontSize: 12,
    color: dark.coral,
    fontFamily: fonts.bodyBold,
  },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: dark.border,
  },
  profileHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
    padding: 14,
    borderRadius: 18,
    backgroundColor: dark.surface,
    borderWidth: 1,
    borderColor: dark.border,
  },
  profileAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: dark.surfaceRaised,
    borderWidth: 2,
    borderColor: dark.green,
  },
  avatarInitial: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 36,
    color: dark.textPrimary,
  },
  profileHeroCopy: { flex: 1, gap: 4 },
  profileName: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 22,
    color: dark.textPrimary,
    marginBottom: 2,
  },
  vehicleCard: {
    marginBottom: 8,
    padding: 14,
    borderRadius: 18,
    backgroundColor: dark.surface,
    borderWidth: 1,
    borderColor: dark.border,
    gap: 8,
  },
  vehicleCardTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 14,
    color: dark.textPrimary,
  },
  vehiclePhoto: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    backgroundColor: dark.surfaceRaised,
  },
  vehicleBrand: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: dark.textPrimary,
  },
  recapAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: dark.surfaceRaised,
    borderWidth: 2,
    borderColor: dark.green,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  bioBox: { marginTop: 4 },
  bioText: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: dark.textMuted,
  },
  specialtyChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: dark.green,
    backgroundColor: dark.greenSoft,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  specialtyText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: dark.textPrimary,
  },
  galleryPhoto: {
    width: 140,
    height: 100,
    borderRadius: 12,
    backgroundColor: dark.surfaceRaised,
  },
  recapStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: dark.greenSoft,
    borderWidth: 1,
    borderColor: dark.border,
  },
  durationChip: {
    minWidth: 76,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: dark.border,
    backgroundColor: dark.surface,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 2,
  },
  durationChipActive: {
    borderColor: dark.green,
    backgroundColor: dark.greenSoft,
  },
  durationChipText: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 18,
    color: dark.textPrimary,
  },
  durationChipTextActive: { color: dark.textPrimary },
  durationPrice: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: dark.textMuted,
  },
  primaryBtn: {
    marginTop: 12,
    backgroundColor: dark.green,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#0B0F1A',
    fontFamily: fonts.displayBold,
    fontSize: 15,
  },
  secondaryBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: dark.border,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: dark.surface,
  },
  secondaryBtnText: {
    color: dark.textPrimary,
    fontFamily: fonts.bodyBold,
  },
  dayChipsRow: { gap: 10, paddingBottom: 4, paddingRight: 8 },
  dayChip: {
    width: 68,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: dark.border,
    backgroundColor: dark.surface,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 2,
  },
  dayChipActive: { borderColor: dark.green, backgroundColor: dark.greenSoft },
  dayChipWeekday: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: dark.textMuted,
    textTransform: 'capitalize',
  },
  dayChipDay: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 20,
    color: dark.textPrimary,
    lineHeight: 24,
  },
  dayChipMonth: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: dark.textMuted,
    textTransform: 'capitalize',
  },
  dayChipTextActive: { color: dark.textPrimary },
  dayCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: dark.border,
    padding: 14,
    marginTop: 14,
    marginBottom: 12,
    backgroundColor: dark.surface,
    gap: 8,
  },
  dayTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: dark.textPrimary,
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  fieldLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: dark.textMuted,
    marginTop: 4,
  },
  slotsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  windowChip: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: dark.green,
    backgroundColor: dark.surfaceRaised,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  windowChipActive: {
    backgroundColor: dark.coralSoft,
    borderColor: dark.coral,
  },
  windowChipText: {
    fontFamily: fonts.bodyBold,
    color: dark.green,
    fontSize: 13,
  },
  windowChipTextActive: { color: dark.textPrimary },
  durationBadge: {
    alignSelf: 'flex-start',
    marginTop: 4,
    marginBottom: 2,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: dark.greenSoft,
    borderWidth: 1,
    borderColor: dark.border,
  },
  durationBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: dark.textPrimary,
  },
  empty: {
    color: dark.textMuted,
    marginBottom: 12,
    fontFamily: fonts.body,
    lineHeight: 20,
  },
  error: {
    color: dark.coral,
    marginBottom: 10,
    fontFamily: fonts.bodySemiBold,
  },
  disabled: { opacity: 0.55 },
})
