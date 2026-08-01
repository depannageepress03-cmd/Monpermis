import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { setStatusBarStyle } from 'expo-status-bar'
import {
  Bell,
  Calendar,
  CalendarOff,
  CalendarPlus,
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Images,
  MapPin,
  Pencil,
  Play,
  RefreshCw,
  ShieldCheck,
  User,
  Wallet,
  X,
} from 'lucide-react-native'
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
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
import { Bouncy } from '../../components/Bouncy'
import { EmptyState } from '../../components/EmptyState'
import { FadeUp } from '../../components/FadeUp'
import { LegalFooter } from '../../components/LegalFooter'
import {
  ReservationMobileMoneyCheckout,
  type ReservationCheckoutSlot,
} from '../../components/ReservationMobileMoneyCheckout'
import { ScreenLoader } from '../../components/ScreenLoader'
import { useHoldTimer } from '../../hooks/useHoldTimer'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications'
import type { RootStackParamList } from '../../navigation/types'
import { brand, dark, fonts, shadows } from '../../theme'
import { resolveMediaUrl } from '../../utils/mediaUrl'
import { resolveMoniteurVideoEmbed } from '../../utils/mediaEmbed'
import { safeOpenUrl } from '../../utils/safeOpenUrl'

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

const ORANGE = '#F97316'
const ORANGE_SOFT = '#FFF7ED'

const STEP_META = [
  { id: 'moniteur', label: 'Moniteur', Icon: User },
  { id: 'duration', label: 'Durée', Icon: Clock },
  { id: 'slots', label: 'Créneau', Icon: Calendar },
] as const

export function ReservationFlowScreen() {
  const navigation = useNavigation<Nav>()
  const { width: windowWidth } = useWindowDimensions()
  const { user, loading } = useRequireAuth(navigation)
  const unreadCount = useUnreadNotifications(Boolean(user))
  const [step, setStep] = useState<Step>('moniteur')
  const vehicleSlideWidth = Math.max(windowWidth - 48 - 40, 260)
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
  const [bioExpanded, setBioExpanded] = useState(false)
  const [vehicleImageIndex, setVehicleImageIndex] = useState(0)
  const [durationHelpVisible, setDurationHelpVisible] = useState(true)
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
      setBioExpanded(false)
      setVehicleImageIndex(0)
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

  const onHoldExpired = useCallback(() => {
    setMmOpen(false)
    setCheckoutSlot(null)
    setError('Créneau libéré — le délai de réservation est écoulé. Choisissez un autre horaire.')
    void loadAvailability()
  }, [loadAvailability])

  const hold = useHoldTimer(
    mmOpen && checkoutSlot?.lockedUntil ? checkoutSlot.lockedUntil : null,
    onHoldExpired,
  )

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

      const data = await requestReservationSlot({
        moniteurId,
        date: selectedDate,
        startTime: selectedStart,
        endTime: selectedEnd,
        vehicleType: vehicleType || 'voiture',
      })

      if (currentSolde !== null && currentSolde >= durationHours) {
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

      setCheckoutSlot({
        moniteurId,
        date: selectedDate,
        startTime: selectedStart,
        endTime: selectedEnd,
        vehicleType: vehicleType || 'voiture',
        hours: durationHours,
        amount: data.amountFcfa ?? priceFcfa,
        creneauId: String(data.creneau.id),
        lockedUntil: data.lockedUntil || null,
      })
      setMmOpen(true)
    } catch (err) {
      setError(err instanceof ReservationError ? err.message : 'Impossible de continuer')
      void loadAvailability()
    } finally {
      setBusy(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('dark')
      return () => setStatusBarStyle('dark')
    }, []),
  )

  if (loading || !user) return <ScreenLoader />

  const handleBack = () => {
    if (step === 'profile') setStep('moniteur')
    else if (step === 'duration') setStep('profile')
    else if (step === 'slots') setStep('duration')
    else navigation.goBack()
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable
            style={({ pressed }) => [styles.roundBtn, pressed && styles.pressed]}
            onPress={handleBack}
            accessibilityLabel="Retour"
            hitSlop={8}
          >
            <ChevronLeft size={22} color={dark.textPrimary} />
          </Pressable>
          <View style={styles.topBarCenter}>
            <View style={styles.topBarIcon}>
              <CalendarPlus size={15} color={ORANGE} />
            </View>
            <Text style={styles.topBarTitle}>Nouvelle séance</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.roundBtn, pressed && styles.pressed]}
            onPress={() => navigation.navigate('Notifications')}
            accessibilityLabel="Notifications"
            hitSlop={8}
          >
            <Bell size={19} color={dark.textMuted} />
            {unreadCount > 0 ? <View style={styles.notifDot} /> : null}
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            step === 'profile' && styles.scrollWithProfileSticky,
            step === 'slots' && selectedStart && selectedEnd && styles.scrollWithProfileSticky,
          ]}
          showsVerticalScrollIndicator={false}
        >
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <FadeUp delay={40}>
            <View style={styles.stepperCard}>
              <View style={styles.stepsRow}>
                {STEP_META.map((item, index) => {
                  const current = stepOrder === index
                  const done = stepOrder > index
                  const Icon = item.Icon
                  return (
                    <View key={item.id} style={styles.stepItem}>
                      <View style={styles.stepTop}>
                        {index > 0 ? (
                          <View
                            style={[
                              styles.stepConnector,
                              styles.stepConnectorLeft,
                              stepOrder >= index && styles.stepConnectorActive,
                            ]}
                          />
                        ) : (
                          <View style={styles.stepConnectorSpacer} />
                        )}
                        <View
                          style={[
                            styles.stepDot,
                            done && styles.stepDotDone,
                            current && !done && styles.stepDotCurrent,
                          ]}
                        >
                          {done ? (
                            <Check size={14} color="#FFFFFF" strokeWidth={3} />
                          ) : (
                            <Text
                              style={[
                                styles.stepDotText,
                                current && styles.stepDotTextCurrent,
                              ]}
                            >
                              {index + 1}
                            </Text>
                          )}
                        </View>
                        {index < STEP_META.length - 1 ? (
                          <View
                            style={[
                              styles.stepConnector,
                              styles.stepConnectorRight,
                              stepOrder > index && styles.stepConnectorActive,
                            ]}
                          />
                        ) : (
                          <View style={styles.stepConnectorSpacer} />
                        )}
                      </View>
                      <Icon
                        size={16}
                        color={current || done ? dark.green : dark.textMuted}
                      />
                      <Text
                        style={[
                          styles.stepPillText,
                          (current || done) && styles.stepPillTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </View>
                  )
                })}
              </View>
              <Animated.View
                style={[
                  styles.stepperFillHidden,
                  {
                    width: stepProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
          </FadeUp>

          {step === 'moniteur' ? (
            <View>
              <FadeUp delay={80}>
                <Text style={styles.introTitle}>Réserver une séance</Text>
                <Text style={styles.introText}>
                  Consultez le profil du moniteur, choisissez la durée, puis un créneau libre.
                </Text>
                <View style={styles.sectionRow}>
                  <View style={styles.sectionIcon}>
                    <User size={16} color={dark.green} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.section}>Choisissez un moniteur</Text>
                    <Text style={styles.sectionHint}>
                      Tous nos moniteurs sont certifiés et expérimentés.
                    </Text>
                  </View>
                </View>
              </FadeUp>

              {busy ? <ActivityIndicator color={dark.green} style={{ marginVertical: 12 }} /> : null}
              {!busy && moniteurs.length === 0 ? (
                <Text style={styles.empty}>Aucun moniteur disponible pour le moment.</Text>
              ) : null}

              {moniteurs.map((moniteur, index) => {
                const typeLabel = moniteur.vehicleTypes?.[0] || 'Véhicule'
                const priceLabel = moniteur.defaultPriceFcfa
                  ? `${moniteur.defaultPriceFcfa.toLocaleString('fr-FR')} F/h`
                  : null
                return (
                  <FadeUp key={moniteur.id} delay={100 + index * 40}>
                    <Bouncy scaleTo={0.98} onPress={() => void loadProfile(moniteur.id)}>
                      <View style={styles.choice}>
                        <View style={styles.moniteurRow}>
                          <View style={styles.avatarWrap}>
                            {moniteur.photoUrl ? (
                              <Image
                                source={{ uri: resolveMediaUrl(moniteur.photoUrl) }}
                                style={styles.listAvatar}
                              />
                            ) : moniteur.vehiclePhotoUrl ? (
                              <Image
                                source={{ uri: resolveMediaUrl(moniteur.vehiclePhotoUrl) }}
                                style={styles.listAvatar}
                              />
                            ) : (
                              <View style={[styles.listAvatar, styles.carPlaceholder]}>
                                <Text style={styles.avatarInitial}>
                                  {moniteur.fullName.slice(0, 1).toUpperCase()}
                                </Text>
                              </View>
                            )}
                            <View style={styles.avatarBadge}>
                              <Check size={10} color="#FFFFFF" strokeWidth={3} />
                            </View>
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.choiceText}>{moniteur.fullName}</Text>
                            <Text style={styles.brandText}>
                              {moniteur.vehicleBrand || 'Marque non renseignée'}
                            </Text>
                            <View style={styles.typePill}>
                              <Car size={12} color={dark.green} />
                              <Text style={styles.typePillText}>{typeLabel}</Text>
                            </View>
                          </View>
                        </View>

                        {(priceLabel || moniteur.city) ? (
                          <View style={styles.statsRow}>
                            {priceLabel ? (
                              <View style={styles.statItem}>
                                <Text style={styles.statValue}>{priceLabel}</Text>
                                <Text style={styles.statLabel}>Tarif</Text>
                              </View>
                            ) : null}
                            {moniteur.city ? (
                              <View style={styles.statItem}>
                                <Text style={styles.statValue} numberOfLines={1}>
                                  {moniteur.city}
                                </Text>
                                <Text style={styles.statLabel}>Ville</Text>
                              </View>
                            ) : null}
                            <View style={styles.statItem}>
                              <Text style={styles.statValue} numberOfLines={1}>
                                {typeLabel}
                              </Text>
                              <Text style={styles.statLabel}>Véhicule</Text>
                            </View>
                          </View>
                        ) : null}

                        <View style={styles.seeProfileBtn}>
                          <Text style={styles.seeProfile}>Voir le profil du moniteur</Text>
                          <ChevronRight size={16} color={ORANGE} />
                        </View>
                      </View>
                    </Bouncy>
                  </FadeUp>
                )
              })}

              <FadeUp delay={180}>
                <View style={styles.trustCard}>
                  <ShieldCheck size={22} color={dark.green} />
                  <View style={styles.trustCopy}>
                    <Text style={styles.trustTitle}>Votre sécurité, notre priorité</Text>
                    <Text style={styles.trustText}>
                      Tous nos moniteurs sont vérifiés et évalués par nos apprenants.
                    </Text>
                  </View>
                  <View style={styles.trustCheck}>
                    <Check size={14} color={dark.green} strokeWidth={3} />
                  </View>
                </View>
              </FadeUp>
            </View>
          ) : null}

        {step === 'profile' && profile ? (
          <View style={styles.profileWrap}>
            <FadeUp delay={60}>
              <Text style={styles.introTitle}>Profil du moniteur</Text>
              <View style={styles.titleAccent} />
            </FadeUp>

            {busy ? <ActivityIndicator color={dark.green} style={{ marginVertical: 12 }} /> : null}

            <FadeUp delay={100}>
              <View style={styles.profileHero}>
                <View style={styles.avatarWrap}>
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
                  <View style={styles.avatarBadge}>
                    <Check size={12} color="#FFFFFF" strokeWidth={3} />
                  </View>
                </View>
                <View style={styles.profileHeroCopy}>
                  <Text style={styles.profileName}>{profile.fullName}</Text>
                  {profile.city ? (
                    <View style={styles.metaRow}>
                      <MapPin size={14} color={dark.textMuted} />
                      <Text style={styles.brandText}>{profile.city}</Text>
                    </View>
                  ) : null}
                  <View style={styles.priceTypePill}>
                    <Car size={13} color="#FFFFFF" />
                    <Text style={styles.priceTypePillText}>
                      {(profile.vehicleTypes?.[0] || 'Véhicule').replace(/^./, (c) =>
                        c.toUpperCase(),
                      )}
                      {profile.defaultPriceFcfa
                        ? ` · ${profile.defaultPriceFcfa.toLocaleString('fr-FR')} FCFA/h`
                        : ''}
                    </Text>
                  </View>
                </View>
              </View>
            </FadeUp>

            {(() => {
              const vehicleImages = [
                profile.vehiclePhotoUrl,
                ...(profile.photos || []),
              ].filter((uri): uri is string => Boolean(uri?.trim()))
              const safeIndex = Math.min(vehicleImageIndex, Math.max(0, vehicleImages.length - 1))
              const currentVehicleUri = vehicleImages[safeIndex]

              return (
                <FadeUp delay={140}>
                  <View style={styles.vehicleCard}>
                    <View style={styles.vehicleCardHead}>
                      <Car size={18} color={dark.green} />
                      <Text style={styles.vehicleCardTitle}>Véhicule utilisé</Text>
                    </View>

                    {currentVehicleUri ? (
                      <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={(e) => {
                          const next = Math.round(
                            e.nativeEvent.contentOffset.x / Math.max(vehicleSlideWidth, 1),
                          )
                          setVehicleImageIndex(next)
                        }}
                        style={styles.vehicleCarousel}
                        decelerationRate="fast"
                        snapToInterval={vehicleSlideWidth}
                        snapToAlignment="start"
                      >
                        {vehicleImages.map((uri) => (
                          <Image
                            key={uri}
                            source={{ uri: resolveMediaUrl(uri) }}
                            style={[styles.vehiclePhoto, { width: vehicleSlideWidth }]}
                          />
                        ))}
                      </ScrollView>
                    ) : (
                      <View style={[styles.vehiclePhoto, styles.coverPlaceholder]}>
                        <Text style={styles.carPlaceholderText}>Photo véhicule non disponible</Text>
                      </View>
                    )}

                    {vehicleImages.length > 1 ? (
                      <View style={styles.dotsRow}>
                        {vehicleImages.map((uri, i) => (
                          <View
                            key={`dot-${uri}`}
                            style={[styles.dot, i === safeIndex && styles.dotActive]}
                          />
                        ))}
                      </View>
                    ) : null}

                    <Text style={styles.vehicleBrand}>
                      {profile.vehicleBrand || 'Marque non renseignée'}
                    </Text>

                    {profile.specialties?.length ? (
                      <View style={styles.featureRow}>
                        {profile.specialties.map((item) => (
                          <View key={item} style={styles.featureChip}>
                            <ShieldCheck size={14} color={dark.green} />
                            <Text style={styles.featureChipText}>{item}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                </FadeUp>
              )
            })()}

            <FadeUp delay={180}>
              <Pressable
                style={styles.infoRowCard}
                onPress={() => {
                  if (profile.bio?.trim()) setBioExpanded((v) => !v)
                }}
                disabled={!profile.bio?.trim()}
              >
                <View style={styles.infoRowIcon}>
                  <FileText size={18} color={dark.green} />
                </View>
                <View style={styles.infoRowCopy}>
                  <Text style={styles.infoRowTitle}>Présentation</Text>
                  {profile.bio?.trim() ? (
                    <>
                      <Text style={styles.infoRowSubtitle} numberOfLines={bioExpanded ? undefined : 2}>
                        {profile.bio.trim()}
                      </Text>
                      {profile.bio.trim().length > 80 ? (
                        <Text style={styles.seeMore}>
                          {bioExpanded ? 'Voir moins' : 'Voir plus'}
                        </Text>
                      ) : null}
                    </>
                  ) : (
                    <Text style={styles.infoRowSubtitle}>Aucune présentation disponible.</Text>
                  )}
                </View>
                <ChevronRight size={18} color={dark.textMuted} />
              </Pressable>

              <View style={styles.infoRowCard}>
                <View style={styles.infoRowIcon}>
                  <Images size={18} color={dark.green} />
                </View>
                <View style={styles.infoRowCopy}>
                  <Text style={styles.infoRowTitle}>Galerie photo</Text>
                  {profile.photos?.length ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.galleryRow}
                    >
                      {profile.photos.map((photo) => (
                        <Image
                          key={photo}
                          source={{ uri: resolveMediaUrl(photo) }}
                          style={styles.galleryPhoto}
                        />
                      ))}
                    </ScrollView>
                  ) : (
                    <Text style={styles.infoRowSubtitle}>Pas encore de galerie photo.</Text>
                  )}
                </View>
                <ChevronRight size={18} color={dark.textMuted} />
              </View>

              {profile.videos?.length ? (
                profile.videos.map((video) => {
                  const embed = resolveMoniteurVideoEmbed(video)
                  if (!embed) return null
                  return (
                    <Pressable
                      key={video}
                      style={styles.infoRowCard}
                      onPress={() => void safeOpenUrl(embed.watchUrl)}
                    >
                      <View style={[styles.infoRowIcon, styles.videoPlayIcon]}>
                        <Play size={16} color="#FFFFFF" fill="#FFFFFF" />
                      </View>
                      <View style={styles.infoRowCopy}>
                        <Text style={styles.infoRowTitle}>Vidéo de présentation</Text>
                        <Text style={styles.infoRowSubtitle}>Touchez pour ouvrir la vidéo</Text>
                      </View>
                      <ChevronRight size={18} color={dark.textMuted} />
                    </Pressable>
                  )
                })
              ) : (
                <View style={styles.infoRowCard}>
                  <View style={styles.infoRowIcon}>
                    <Play size={18} color={dark.green} />
                  </View>
                  <View style={styles.infoRowCopy}>
                    <Text style={styles.infoRowTitle}>Vidéo de présentation</Text>
                    <Text style={styles.infoRowSubtitle}>
                      Pas encore de vidéo de présentation.
                    </Text>
                  </View>
                  <ChevronRight size={18} color={dark.textMuted} />
                </View>
              )}
            </FadeUp>

            <Pressable style={styles.secondaryBtn} onPress={() => setStep('moniteur')}>
              <Text style={styles.secondaryBtnText}>Retour à la liste</Text>
            </Pressable>
          </View>
        ) : null}

        {step === 'duration' ? (
          <View>
            <FadeUp delay={60}>
              <Text style={styles.introTitle}>Durée de la séance</Text>
              <View style={styles.titleAccent} />
              <Text style={styles.introText}>
                Choisissez combien d’heures vous souhaitez. Nous afficherons ensuite uniquement les
                créneaux encore libres pour cette durée.
              </Text>
            </FadeUp>

            {selectedMoniteur ? (
              <FadeUp delay={100}>
                <View style={styles.durationMoniteurCard}>
                  <View style={styles.avatarWrap}>
                    {selectedMoniteur.photoUrl ? (
                      <Image
                        source={{ uri: resolveMediaUrl(selectedMoniteur.photoUrl) }}
                        style={styles.durationMoniteurAvatar}
                      />
                    ) : (
                      <View style={[styles.durationMoniteurAvatar, styles.coverPlaceholder]}>
                        <Text style={styles.avatarInitial}>
                          {selectedMoniteur.fullName.slice(0, 1).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.avatarBadge}>
                      <Check size={10} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  </View>
                  <View style={styles.durationMoniteurCopy}>
                    <Text style={styles.choiceText}>{selectedMoniteur.fullName}</Text>
                    <Text style={styles.brandText}>
                      {selectedMoniteur.vehicleBrand || 'Véhicule'}
                      {vehicleType ? (
                        <>
                          {' · '}
                          <Text style={styles.vehicleTypeAccent}>
                            {vehicleType.replace(/^./, (c) => c.toUpperCase())}
                          </Text>
                        </>
                      ) : null}
                    </Text>
                  </View>
                </View>
              </FadeUp>
            ) : null}

            <FadeUp delay={140}>
              <View style={styles.sectionRow}>
                <View style={styles.sectionIcon}>
                  <Clock size={16} color={dark.green} />
                </View>
                <Text style={[styles.section, { marginBottom: 0, marginTop: 4 }]}>
                  Combien d’heures ?
                </Text>
              </View>

              <View style={styles.durationGrid}>
                {DURATION_OPTIONS.map((hours) => {
                  const active = durationHours === hours
                  const amount = computeDrivingAmount(
                    hourlyPriceFcfa,
                    hours,
                    hoursDiscount,
                    hoursDiscountMin,
                  )
                  return (
                    <Bouncy
                      key={hours}
                      scaleTo={0.97}
                      style={styles.durationCardWrap}
                      onPress={() => setDurationHours(hours)}
                    >
                      <View
                        style={[styles.durationCard, active && styles.durationCardActive]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={`${hours} heures, ${amount.toLocaleString('fr-FR')} FCFA`}
                      >
                        <Text
                          style={[styles.durationCardHours, active && styles.durationCardHoursActive]}
                        >
                          {hours} h
                        </Text>
                        <Text
                          style={[styles.durationCardPrice, active && styles.durationCardPriceActive]}
                        >
                          {amount.toLocaleString('fr-FR')} FCFA
                        </Text>
                        {active ? (
                          <View style={styles.durationCheck}>
                            <Check size={14} color="#FFFFFF" strokeWidth={3} />
                          </View>
                        ) : null}
                      </View>
                    </Bouncy>
                  )
                })}
              </View>
            </FadeUp>

            <FadeUp delay={180}>
              <Bouncy scaleTo={0.98} disabled={busy} onPress={() => setStep('slots')}>
                <View style={[styles.primaryBtn, styles.durationPrimaryBtn, busy && styles.disabled]}>
                  <Calendar size={18} color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>Voir les créneaux disponibles</Text>
                  <View style={styles.primaryBtnArrow}>
                    <ChevronRight size={16} color={dark.green} />
                  </View>
                </View>
              </Bouncy>

              <Bouncy scaleTo={0.98} onPress={() => setStep('moniteur')}>
                <View style={styles.changeMoniteurCard}>
                  <View style={styles.changeMoniteurIcon}>
                    <RefreshCw size={18} color={dark.green} />
                  </View>
                  <Text style={styles.changeMoniteurText}>Changer de moniteur</Text>
                  <ChevronRight size={18} color={dark.textMuted} />
                </View>
              </Bouncy>

              {durationHelpVisible ? (
                <View style={styles.helpCard}>
                  <View style={styles.helpIcon}>
                    <Check size={14} color="#FFFFFF" strokeWidth={3} />
                  </View>
                  <View style={styles.helpCopy}>
                    <Text style={styles.helpTitle}>Besoin d’aide ?</Text>
                    <Text style={styles.helpText}>
                      Vous pourrez modifier ces informations à tout moment avant la confirmation.
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setDurationHelpVisible(false)}
                    hitSlop={10}
                    accessibilityLabel="Fermer"
                  >
                    <X size={16} color={dark.textMuted} />
                  </Pressable>
                </View>
              ) : null}
            </FadeUp>
          </View>
        ) : null}

        {step === 'slots' ? (
          <View>
            <FadeUp delay={60}>
              <Text style={styles.introTitle}>Choix du créneau</Text>
              <View style={styles.titleAccent} />
              <Text style={styles.introText}>
                Durée choisie : {durationHours} h. Seuls les horaires où le moniteur est réellement
                libre s’affichent.
              </Text>
            </FadeUp>

            <FadeUp delay={100}>
              <View style={styles.slotsRecapCard}>
                <View style={styles.slotsRecapMain}>
                  <View style={styles.avatarWrap}>
                    {selectedMoniteur?.photoUrl ? (
                      <Image
                        source={{ uri: resolveMediaUrl(selectedMoniteur.photoUrl) }}
                        style={styles.slotsRecapAvatar}
                      />
                    ) : (
                      <View style={[styles.slotsRecapAvatar, styles.coverPlaceholder]}>
                        <Text style={styles.avatarInitial}>
                          {(selectedMoniteur?.fullName || 'M').slice(0, 1).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={styles.avatarBadge}>
                      <Check size={10} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  </View>
                  <View style={styles.slotsRecapCopy}>
                    <Text style={styles.choiceText}>
                      {selectedMoniteur?.fullName || 'Moniteur'}
                    </Text>
                    <View style={styles.slotsRecapVehicleRow}>
                      <Car size={14} color={dark.green} />
                      <Text style={styles.brandText}>
                        {selectedMoniteur?.vehicleBrand || 'Véhicule'}
                        {vehicleType ? (
                          <>
                            {' · '}
                            <Text style={styles.vehicleTypeAccent}>
                              {vehicleType.replace(/^./, (c) => c.toUpperCase())}
                            </Text>
                          </>
                        ) : null}
                      </Text>
                    </View>
                    <View style={styles.slotsRecapTags}>
                      <View style={styles.slotsRecapTag}>
                        <Wallet size={12} color={dark.green} />
                        <Text style={styles.slotsRecapTagText}>
                          {hourlyPriceFcfa.toLocaleString('fr-FR')} FCFA / h
                        </Text>
                      </View>
                      <View style={styles.slotsRecapTag}>
                        <Clock size={12} color={dark.green} />
                        <Text style={styles.slotsRecapTagText}>{durationHours} h</Text>
                      </View>
                      {soldeHeures !== null ? (
                        <View style={styles.slotsRecapTag}>
                          <ShieldCheck size={12} color={dark.green} />
                          <Text style={styles.slotsRecapTagText}>Solde : {soldeHeures} h</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </View>
                <Pressable
                  style={styles.slotsEditBtn}
                  onPress={() => setStep('duration')}
                  accessibilityLabel="Modifier"
                >
                  <Pencil size={14} color={dark.green} />
                  <Text style={styles.slotsEditText}>Modifier</Text>
                </Pressable>
              </View>
            </FadeUp>

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

            {daysWithSlots.length > 0 ? (
              <FadeUp delay={140}>
                <View style={styles.sectionRow}>
                  <View style={styles.sectionIcon}>
                    <Calendar size={16} color={dark.green} />
                  </View>
                  <Text style={[styles.section, { marginBottom: 0, marginTop: 4 }]}>Jour</Text>
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.dayChipsRow}
                >
                  {daysWithSlots.map((day) => {
                    const active = selectedDate === day.date
                    const chip = formatDayChip(day.date)
                    return (
                      <Bouncy
                        key={day.date}
                        scaleTo={0.97}
                        onPress={() => {
                          setSelectedDate(day.date)
                          setSelectedStart(day.slots[0]?.start || '')
                          setSelectedEnd(day.slots[0]?.end || '')
                        }}
                      >
                        <View
                          style={[styles.dayChip, active && styles.dayChipActive]}
                          accessibilityRole="button"
                          accessibilityState={{ selected: active }}
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
                          {active ? (
                            <View style={styles.dayChipCheck}>
                              <Check size={12} color="#FFFFFF" strokeWidth={3} />
                            </View>
                          ) : null}
                        </View>
                      </Bouncy>
                    )
                  })}
                </ScrollView>
              </FadeUp>
            ) : null}

            {selectedDate ? (
              <FadeUp delay={180}>
                <View style={styles.slotsHoursCard}>
                  <View style={styles.slotsHoursHead}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={styles.slotsHoursTitleRow}>
                        <Clock size={16} color={dark.green} />
                        <Text style={styles.dayTitle}>{formatDateLabel(selectedDate)}</Text>
                      </View>
                      <Text style={styles.fieldLabel}>
                        Horaires libres ({durationHours} h)
                      </Text>
                    </View>
                  </View>

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

                  <View style={styles.slotsGrid}>
                    {selectedDaySlots.map((slot) => {
                      const active = selectedStart === slot.start && selectedEnd === slot.end
                      return (
                        <Bouncy
                          key={`${slot.start}-${slot.end}`}
                          scaleTo={0.97}
                          style={styles.slotCardWrap}
                          onPress={() => {
                            setSelectedStart(slot.start)
                            setSelectedEnd(slot.end)
                            void import('../../utils/haptics').then((m) => m.hapticSelect())
                          }}
                        >
                          <View
                            style={[styles.slotCard, active && styles.slotCardActive]}
                            accessibilityRole="button"
                            accessibilityState={{ selected: active }}
                          >
                            <Text style={[styles.slotCardText, active && styles.slotCardTextActive]}>
                              {slot.start} – {slot.end}
                            </Text>
                            {active ? (
                              <Check size={14} color="#FFFFFF" strokeWidth={3} />
                            ) : null}
                          </View>
                        </Bouncy>
                      )
                    })}
                  </View>
                </View>
              </FadeUp>
            ) : null}

            <Pressable style={styles.secondaryBtn} onPress={() => setStep('duration')}>
              <Text style={styles.secondaryBtnText}>Changer la durée</Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={() => setStep('moniteur')}>
              <Text style={styles.secondaryBtnText}>Changer de moniteur</Text>
            </Pressable>
          </View>
        ) : null}

          <LegalFooter />
        </ScrollView>

        {step === 'profile' && profile ? (
          <View style={styles.profileSticky}>
            <Bouncy scaleTo={0.98} onPress={() => setStep('duration')}>
              <View style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>Continuer</Text>
                <View style={styles.primaryBtnArrow}>
                  <ChevronRight size={16} color={dark.green} />
                </View>
              </View>
            </Bouncy>
          </View>
        ) : null}

        {step === 'slots' && selectedStart && selectedEnd ? (
          <View style={styles.stickyBar}>
            <View style={styles.stickyLeft}>
              <View style={styles.stickyCalIcon}>
                <Calendar size={16} color={dark.green} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.stickyTitle} numberOfLines={1}>
                  {formatDateLabel(selectedDate)} · {selectedStart} – {selectedEnd}
                </Text>
                <Text style={styles.stickyPrice}>
                  {priceFcfa.toLocaleString('fr-FR')} FCFA
                  {priceDiscount > 0 ? ` (−${priceDiscount.toLocaleString('fr-FR')})` : ''}
                </Text>
              </View>
            </View>
            <Bouncy scaleTo={0.98} disabled={busy} onPress={() => void onContinue()}>
              <View style={[styles.stickyBtn, busy && styles.disabled]}>
                <Text style={styles.stickyBtnText}>{busy ? '…' : 'Confirmer'}</Text>
                <View style={styles.stickyBtnArrow}>
                  <ChevronRight size={16} color={dark.green} />
                </View>
              </View>
            </Bouncy>
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
            holdLabel={hold.label}
            holdExpired={hold.expired}
            holdUrgent={(hold.remainingMs ?? 0) <= 60_000}
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
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  safe: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,16,48,0.05)',
  },
  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    ...shadows.sm,
  },
  topBarCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  topBarIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: ORANGE_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 18,
    color: dark.textPrimary,
  },
  notifDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ORANGE,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 120,
  },
  stickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,16,48,0.06)',
    backgroundColor: '#FFFFFF',
    ...shadows.lg,
  },
  stickyLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  stickyCalIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: brand.greenPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickyTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: dark.textPrimary,
    textTransform: 'capitalize',
  },
  stickyPrice: {
    fontFamily: fonts.displayBold,
    fontSize: 17,
    color: dark.green,
    marginTop: 2,
  },
  stickyBtn: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: dark.green,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 128,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  stickyBtnText: {
    color: '#FFFFFF',
    fontFamily: fonts.displayBold,
    fontSize: 15,
  },
  stickyBtnArrow: {
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 12,
    marginBottom: 20,
    ...shadows.card,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepperFillHidden: {
    height: 0,
    opacity: 0,
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  stepTop: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 2,
  },
  stepConnector: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(0,16,48,0.1)',
  },
  stepConnectorLeft: {
    marginRight: 4,
  },
  stepConnectorRight: {
    marginLeft: 4,
  },
  stepConnectorActive: {
    backgroundColor: dark.green,
  },
  stepConnectorSpacer: {
    flex: 1,
  },
  stepDot: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: 'rgba(0,16,48,0.12)',
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: {
    borderColor: dark.green,
    backgroundColor: dark.green,
  },
  stepDotCurrent: {
    backgroundColor: '#FFFFFF',
    borderColor: dark.green,
    borderWidth: 2,
  },
  stepDotText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: dark.textMuted,
  },
  stepDotTextCurrent: {
    color: dark.green,
  },
  stepDotTextActive: {
    color: '#FFFFFF',
  },
  stepPillText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: dark.textMuted,
  },
  stepPillTextActive: {
    color: dark.green,
  },
  introTitle: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 28,
    lineHeight: 34,
    color: dark.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  introText: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: dark.textMuted,
    marginBottom: 20,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 14,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: brand.greenPale,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  section: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: dark.textPrimary,
    marginTop: 0,
    marginBottom: 2,
  },
  sectionHint: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: dark.textMuted,
  },
  choice: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    backgroundColor: '#FFFFFF',
    ...shadows.card,
  },
  choiceText: {
    color: dark.textPrimary,
    fontFamily: fonts.displayBold,
    fontSize: 17,
  },
  moniteurRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarWrap: {
    position: 'relative',
  },
  listAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: dark.surfaceRaised,
    borderWidth: 3,
    borderColor: dark.green,
  },
  avatarBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: dark.green,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarInitial: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 28,
    color: dark.textPrimary,
  },
  carPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brand.greenPale,
  },
  carPlaceholderText: {
    fontSize: 10,
    color: dark.textMuted,
    fontFamily: fonts.bodySemiBold,
  },
  brandText: {
    marginTop: 4,
    fontSize: 14,
    color: dark.textMuted,
    fontFamily: fonts.body,
  },
  typeText: {
    marginTop: 2,
    fontSize: 12,
    color: dark.green,
    fontFamily: fonts.displayBold,
  },
  typePill: {
    alignSelf: 'flex-start',
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: brand.greenPale,
  },
  typePillText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: dark.green,
    textTransform: 'capitalize',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,16,48,0.06)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 4,
  },
  statValue: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: dark.textPrimary,
  },
  statLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: dark.textMuted,
  },
  seeProfileBtn: {
    marginTop: 14,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.25)',
    backgroundColor: ORANGE_SOFT,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seeProfile: {
    fontSize: 14,
    color: ORANGE,
    fontFamily: fonts.bodyBold,
  },
  trustCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
    marginBottom: 8,
    padding: 16,
    borderRadius: 18,
    backgroundColor: brand.greenPale,
  },
  trustCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  trustTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: dark.textPrimary,
  },
  trustText: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: dark.textMuted,
  },
  trustCheck: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.9,
  },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: dark.border,
  },
  profileWrap: {
    paddingBottom: 8,
  },
  scrollWithProfileSticky: {
    paddingBottom: 120,
  },
  titleAccent: {
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: dark.green,
    marginTop: -8,
    marginBottom: 20,
  },
  profileHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    ...shadows.card,
  },
  profileAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: dark.surfaceRaised,
    borderWidth: 3,
    borderColor: dark.green,
  },
  profileHeroCopy: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  profileName: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 22,
    color: dark.textPrimary,
  },
  priceTypePill: {
    alignSelf: 'flex-start',
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: dark.green,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  priceTypePillText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  vehicleCard: {
    marginBottom: 14,
    padding: 16,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    gap: 10,
    ...shadows.card,
  },
  vehicleCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vehicleCardTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: dark.textPrimary,
  },
  vehicleCarousel: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  vehiclePhoto: {
    height: 190,
    borderRadius: 18,
    backgroundColor: dark.surfaceRaised,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(0,16,48,0.15)',
  },
  dotActive: {
    backgroundColor: dark.green,
    width: 16,
  },
  vehicleBrand: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: dark.textPrimary,
  },
  featureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: brand.greenPale,
    minWidth: '30%',
    flexGrow: 1,
  },
  featureChipText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: dark.textPrimary,
    flexShrink: 1,
  },
  infoRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
    ...shadows.sm,
  },
  infoRowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: brand.greenPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPlayIcon: {
    backgroundColor: dark.green,
  },
  infoRowCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  infoRowTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: dark.textPrimary,
  },
  infoRowSubtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: dark.textMuted,
  },
  seeMore: {
    marginTop: 2,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: dark.green,
  },
  galleryRow: {
    gap: 8,
    paddingTop: 4,
  },
  profileSticky: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,16,48,0.06)',
    ...shadows.md,
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
    width: 96,
    height: 72,
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
  durationMoniteurCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 22,
    padding: 18,
    borderRadius: 24,
    backgroundColor: brand.greenPale,
    ...shadows.sm,
  },
  durationMoniteurAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: dark.green,
  },
  durationMoniteurCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  vehicleTypeAccent: {
    color: dark.green,
    fontFamily: fonts.bodyBold,
  },
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
    marginTop: 4,
  },
  durationCardWrap: {
    width: '47%',
    flexGrow: 1,
    minWidth: 140,
  },
  durationCard: {
    minHeight: 96,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(0,16,48,0.1)',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    ...shadows.sm,
  },
  durationCardActive: {
    borderColor: dark.green,
    backgroundColor: brand.greenPale,
  },
  durationCardHours: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 24,
    color: dark.textPrimary,
  },
  durationCardHoursActive: {
    color: dark.textPrimary,
  },
  durationCardPrice: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: dark.textMuted,
  },
  durationCardPriceActive: {
    color: dark.textPrimary,
  },
  durationCheck: {
    marginTop: 6,
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: dark.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationPrimaryBtn: {
    minHeight: 58,
    borderRadius: 20,
  },
  changeMoniteurCard: {
    marginTop: 12,
    minHeight: 56,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...shadows.sm,
  },
  changeMoniteurIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: brand.greenPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeMoniteurText: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: dark.textPrimary,
  },
  helpCard: {
    marginTop: 16,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: brand.greenPale,
  },
  helpIcon: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: dark.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  helpCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  helpTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: dark.textPrimary,
  },
  helpText: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: dark.textMuted,
  },
  primaryBtn: {
    marginTop: 12,
    minHeight: 56,
    backgroundColor: dark.green,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    ...shadows.sm,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontFamily: fonts.displayBold,
    fontSize: 16,
  },
  primaryBtnArrow: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: dark.border,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  secondaryBtnText: {
    color: dark.textPrimary,
    fontFamily: fonts.bodyBold,
  },
  slotsRecapCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 20,
    padding: 18,
    borderRadius: 24,
    backgroundColor: brand.greenPale,
    ...shadows.sm,
  },
  slotsRecapMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
  },
  slotsRecapAvatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: dark.green,
  },
  slotsRecapCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  slotsRecapVehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  slotsRecapTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  slotsRecapTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  slotsRecapTagText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: dark.textPrimary,
  },
  slotsEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,176,80,0.35)',
    backgroundColor: '#FFFFFF',
  },
  slotsEditText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: dark.green,
  },
  dayChipsRow: {
    gap: 10,
    paddingBottom: 4,
    paddingRight: 8,
    marginBottom: 16,
  },
  dayChip: {
    width: 76,
    minHeight: 96,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(0,16,48,0.1)',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    alignItems: 'center',
    gap: 2,
    ...shadows.sm,
  },
  dayChipActive: {
    borderColor: dark.green,
    backgroundColor: brand.greenPale,
  },
  dayChipWeekday: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: dark.textMuted,
    textTransform: 'capitalize',
  },
  dayChipDay: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 22,
    color: dark.textPrimary,
    lineHeight: 26,
  },
  dayChipMonth: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: dark.textMuted,
    textTransform: 'capitalize',
  },
  dayChipTextActive: {
    color: dark.textPrimary,
  },
  dayChipCheck: {
    marginTop: 6,
    width: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: dark.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotsHoursCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    gap: 12,
    ...shadows.card,
  },
  slotsHoursHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  slotsHoursTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  dayTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 17,
    color: dark.textPrimary,
    textTransform: 'capitalize',
  },
  fieldLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: dark.textMuted,
  },
  slotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  slotCardWrap: {
    width: '47%',
    flexGrow: 1,
    minWidth: 140,
  },
  slotCard: {
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: dark.green,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  slotCardActive: {
    backgroundColor: dark.green,
    borderColor: dark.green,
  },
  slotCardText: {
    fontFamily: fonts.bodyBold,
    color: dark.green,
    fontSize: 14,
  },
  slotCardTextActive: {
    color: '#FFFFFF',
  },
  windowChip: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: dark.green,
    backgroundColor: dark.surfaceRaised,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  windowChipActive: {
    backgroundColor: dark.green,
    borderColor: dark.green,
  },
  windowChipText: {
    fontFamily: fonts.bodyBold,
    color: dark.green,
    fontSize: 13,
  },
  windowChipTextActive: {
    color: '#FFFFFF',
  },
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
