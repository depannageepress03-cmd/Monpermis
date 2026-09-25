import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack'
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
import { colors } from '../../theme/tokens'
import { DayPill } from '../../components/ui-kit-nav'
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

function monthLabelFor(dates: string[]) {
  try {
    const labels = dates.map((date) => {
      const label = new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', { month: 'long' })
      return label.charAt(0).toUpperCase() + label.slice(1)
    })
    const unique = [...new Set(labels)]
    return unique.join(' – ')
  } catch {
    return ''
  }
}

const STEP_META = [
  { id: 'moniteur', label: 'Moniteur', Icon: User },
  { id: 'duration', label: 'Durée', Icon: Clock },
  { id: 'slots', label: 'Créneau', Icon: Calendar },
] as const

export function ReservationFlowScreen() {
  const navigation = useNavigation<Nav>()
  const route = useRoute<NativeStackScreenProps<RootStackParamList, 'ReservationFlow'>['route']>()
  const { width: windowWidth } = useWindowDimensions()
  const { user, loading } = useRequireAuth(navigation)
  const unreadCount = useUnreadNotifications(Boolean(user))
  const [step, setStep] = useState<Step>('moniteur')
  const vehicleSlideWidth = Math.max(windowWidth - 40 - 32, 260)
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
  // URIs résolues une fois : jamais d'Image avec uri undefined (crash natif).
  const profilePhotoUri = resolveMediaUrl(profile?.photoUrl)
  const selectedPhotoUri = resolveMediaUrl(selectedMoniteur?.photoUrl)

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

  const daysMonthLabel = useMemo(
    () => monthLabelFor(daysWithSlots.map((day) => day.date)),
    [daysWithSlots],
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
      setAvailabilityDays(data.days ?? [])
      setHourlyPriceFcfa(data.hourlyPriceFcfa || data.moniteur?.defaultPriceFcfa || 5000)
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

  // Présélection depuis la fiche moniteur (« Choisir ce moniteur »).
  const initialMoniteurId = route.params?.moniteurId
  const appliedInitialMoniteur = useRef<string | null>(null)
  useEffect(() => {
    if (!initialMoniteurId || appliedInitialMoniteur.current === initialMoniteurId) return
    appliedInitialMoniteur.current = initialMoniteurId
    void loadProfile(initialMoniteurId)
  }, [initialMoniteurId, loadProfile])

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

      if (!data.creneau) {
        throw new ReservationError(
          'Ce créneau vient d’être pris. Choisissez un autre horaire.',
        )
      }

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
      <View style={styles.halo} pointerEvents="none" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable
            style={({ pressed }) => [styles.roundBtn, pressed && styles.pressed]}
            onPress={handleBack}
            accessibilityLabel="Retour"
            hitSlop={8}
          >
            <ChevronLeft size={22} color={colors.navy} />
          </Pressable>
          <View style={styles.topBarCenter}>
            <View style={styles.topBarIcon}>
              <CalendarPlus size={15} color={colors.greenDark} />
            </View>
            <Text style={styles.topBarTitle}>Nouvelle séance</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.roundBtn, pressed && styles.pressed]}
            onPress={() => navigation.navigate('Notifications')}
            accessibilityLabel="Notifications"
            hitSlop={8}
          >
            <Bell size={19} color={colors.muted} />
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
                        color={current || done ? colors.greenDark : colors.subtle}
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
                    <User size={16} color={colors.greenDark} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.section}>Choisissez un moniteur</Text>
                    <Text style={styles.sectionHint}>
                      Tous nos moniteurs sont certifiés et expérimentés.
                    </Text>
                  </View>
                </View>
              </FadeUp>

              {busy ? <ActivityIndicator color={colors.green} style={{ marginVertical: 12 }} /> : null}
              {!busy && moniteurs.length === 0 ? (
                <Text style={styles.empty}>Aucun moniteur disponible pour le moment.</Text>
              ) : null}

              {moniteurs.map((moniteur, index) => {
                const typeLabel = moniteur.vehicleTypes?.[0] || 'Véhicule'
                const priceLabel = moniteur.defaultPriceFcfa
                  ? `${moniteur.defaultPriceFcfa.toLocaleString('fr-FR')} F/h`
                  : null
                const displayName = moniteur.fullName || 'Moniteur'
                const photoUri = resolveMediaUrl(moniteur.photoUrl)
                const vehicleUri = resolveMediaUrl(moniteur.vehiclePhotoUrl)
                return (
                  <FadeUp key={moniteur.id} delay={100 + index * 40}>
                    <Bouncy scaleTo={0.98} onPress={() => void loadProfile(moniteur.id)}>
                      <View style={styles.choice}>
                        <View style={styles.moniteurRow}>
                          <View style={styles.avatarWrap}>
                            {photoUri ? (
                              <Image
                                source={{ uri: photoUri }}
                                style={styles.listAvatar}
                              />
                            ) : vehicleUri ? (
                              <Image
                                source={{ uri: vehicleUri }}
                                style={styles.listAvatar}
                              />
                            ) : (
                              <View style={[styles.listAvatar, styles.carPlaceholder]}>
                                <Text style={styles.avatarInitial}>
                                  {displayName.slice(0, 1).toUpperCase()}
                                </Text>
                              </View>
                            )}
                            <View style={styles.avatarBadge}>
                              <Check size={10} color="#FFFFFF" strokeWidth={3} />
                            </View>
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.choiceText}>{displayName}</Text>
                            <Text style={styles.brandText}>
                              {moniteur.vehicleBrand || 'Marque non renseignée'}
                            </Text>
                            <View style={styles.typePill}>
                              <Car size={12} color={colors.greenDark} />
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
                          <ChevronRight size={16} color={colors.greenDark} />
                        </View>
                      </View>
                    </Bouncy>
                  </FadeUp>
                )
              })}

              <FadeUp delay={180}>
                <View style={styles.trustCard}>
                  <ShieldCheck size={22} color={colors.greenDark} />
                  <View style={styles.trustCopy}>
                    <Text style={styles.trustTitle}>Votre sécurité, notre priorité</Text>
                    <Text style={styles.trustText}>
                      Tous nos moniteurs sont vérifiés et évalués par nos apprenants.
                    </Text>
                  </View>
                  <View style={styles.trustCheck}>
                    <Check size={14} color={colors.greenDark} strokeWidth={3} />
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

              {busy ? <ActivityIndicator color={colors.green} style={{ marginVertical: 12 }} /> : null}

              <FadeUp delay={100}>
                <View style={styles.profileHero}>
                  <View style={styles.avatarWrap}>
                    {profilePhotoUri ? (
                      <Image
                        source={{ uri: profilePhotoUri }}
                        style={styles.profileAvatar}
                      />
                    ) : (
                      <View style={[styles.profileAvatar, styles.coverPlaceholder]}>
                        <Text style={styles.avatarInitial}>
                          {(profile.fullName || '?').slice(0, 1).toUpperCase()}
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
                        <MapPin size={14} color={colors.subtle} />
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
                ]
                  .map((raw) => resolveMediaUrl(raw))
                  .filter((uri): uri is string => Boolean(uri))
                const safeIndex = Math.min(vehicleImageIndex, Math.max(0, vehicleImages.length - 1))
                const currentVehicleUri = vehicleImages[safeIndex]

                return (
                  <FadeUp delay={140}>
                    <View style={styles.vehicleCard}>
                      <View style={styles.vehicleCardHead}>
                        <Car size={18} color={colors.greenDark} />
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
                              source={{ uri }}
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
                              <ShieldCheck size={14} color={colors.greenDark} />
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
                    <FileText size={18} color={colors.greenDark} />
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
                  <ChevronRight size={18} color={colors.subtle} />
                </Pressable>

                <View style={styles.infoRowCard}>
                  <View style={styles.infoRowIcon}>
                    <Images size={18} color={colors.greenDark} />
                  </View>
                  <View style={styles.infoRowCopy}>
                    <Text style={styles.infoRowTitle}>Galerie photo</Text>
                    {profile.photos?.length ? (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.galleryRow}
                      >
                        {(profile.photos || []).map((photo) => {
                          const galleryUri = resolveMediaUrl(photo)
                          return galleryUri ? (
                            <Image
                              key={photo}
                              source={{ uri: galleryUri }}
                              style={styles.galleryPhoto}
                            />
                          ) : null
                        })}
                      </ScrollView>
                    ) : (
                      <Text style={styles.infoRowSubtitle}>Pas encore de galerie photo.</Text>
                    )}
                  </View>
                  <ChevronRight size={18} color={colors.subtle} />
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
                        <ChevronRight size={18} color={colors.subtle} />
                      </Pressable>
                    )
                  })
                ) : (
                  <View style={styles.infoRowCard}>
                    <View style={styles.infoRowIcon}>
                      <Play size={18} color={colors.greenDark} />
                    </View>
                    <View style={styles.infoRowCopy}>
                      <Text style={styles.infoRowTitle}>Vidéo de présentation</Text>
                      <Text style={styles.infoRowSubtitle}>
                        Pas encore de vidéo de présentation.
                      </Text>
                    </View>
                    <ChevronRight size={18} color={colors.subtle} />
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
                      {selectedPhotoUri ? (
                        <Image
                          source={{ uri: selectedPhotoUri }}
                          style={styles.durationMoniteurAvatar}
                        />
                      ) : (
                        <View style={[styles.durationMoniteurAvatar, styles.coverPlaceholder]}>
                          <Text style={styles.avatarInitial}>
                            {(selectedMoniteur.fullName || '?').slice(0, 1).toUpperCase()}
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
                    <Clock size={16} color={colors.greenDark} />
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
                      <ChevronRight size={16} color={colors.greenDark} />
                    </View>
                  </View>
                </Bouncy>

                <Bouncy scaleTo={0.98} onPress={() => setStep('moniteur')}>
                  <View style={styles.changeMoniteurCard}>
                    <View style={styles.changeMoniteurIcon}>
                      <RefreshCw size={18} color={colors.greenDark} />
                    </View>
                    <Text style={styles.changeMoniteurText}>Changer de moniteur</Text>
                    <ChevronRight size={18} color={colors.subtle} />
                  </View>
                </Bouncy>

                {durationHelpVisible ? (
                  <View style={styles.helpCard}>
                    <View style={styles.helpIcon}>
                      <Check size={14} color={colors.navy} strokeWidth={3} />
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
                      <X size={16} color={colors.subtle} />
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
                      {selectedPhotoUri ? (
                        <Image
                          source={{ uri: selectedPhotoUri }}
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
                        <Car size={14} color={colors.greenDark} />
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
                          <Wallet size={12} color={colors.greenDark} />
                          <Text style={styles.slotsRecapTagText}>
                            {hourlyPriceFcfa.toLocaleString('fr-FR')} FCFA / h
                          </Text>
                        </View>
                        <View style={styles.slotsRecapTag}>
                          <Clock size={12} color={colors.greenDark} />
                          <Text style={styles.slotsRecapTagText}>{durationHours} h</Text>
                        </View>
                        {soldeHeures !== null ? (
                          <View style={styles.slotsRecapTag}>
                            <ShieldCheck size={12} color={colors.greenDark} />
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
                    <Pencil size={14} color={colors.greenDark} />
                    <Text style={styles.slotsEditText}>Modifier</Text>
                  </Pressable>
                </View>
              </FadeUp>

              {busy ? <ActivityIndicator color={colors.green} style={{ marginVertical: 12 }} /> : null}

              {daysWithSlots.length === 0 && !busy ? (
                <EmptyState
                  icon={<CalendarOff size={30} color={colors.subtle} />}
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
                      <Calendar size={16} color={colors.greenDark} />
                    </View>
                    <Text style={[styles.section, { marginBottom: 0, marginTop: 4 }]}>Jour</Text>
                    {daysMonthLabel ? (
                      <Text style={styles.sectionMonth}>{daysMonthLabel}</Text>
                    ) : null}
                  </View>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.dayChipsRow}
                  >
                    {daysWithSlots.map((day) => {
                      const chip = formatDayChip(day.date)
                      return (
                        <DayPill
                          key={day.date}
                          day={chip.weekday}
                          date={Number(chip.day) || 0}
                          selected={selectedDate === day.date}
                          onPress={() => {
                            setSelectedDate(day.date)
                            setSelectedStart(day.slots[0]?.start || '')
                            setSelectedEnd(day.slots[0]?.end || '')
                          }}
                        />
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
                          <Clock size={16} color={colors.greenDark} />
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
            <Pressable
              style={styles.secondaryBtn}
              onPress={() =>
                navigation.navigate('MoniteurProfile', {
                  id: profile.id,
                  name: profile.fullName,
                })
              }
            >
              <Text style={styles.secondaryBtnText}>Voir la fiche complète</Text>
            </Pressable>
            <Bouncy scaleTo={0.98} onPress={() => setStep('duration')}>
              <View style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>Continuer</Text>
                <View style={styles.primaryBtnArrow}>
                  <ChevronRight size={16} color={colors.greenDark} />
                </View>
              </View>
            </Bouncy>
          </View>
        ) : null}

        {step === 'slots' && selectedStart && selectedEnd ? (
          <View style={styles.stickyBar}>
            <View style={styles.stickyLeft}>
              <View style={styles.stickyCalIcon}>
                <Calendar size={16} color={colors.greenDark} />
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
                  <ChevronRight size={16} color="#FFFFFF" />
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
    backgroundColor: '#FFFFFF',
  },
  halo: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: colors.yellow,
    opacity: 0.16,
  },
  safe: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.7,
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
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: 17,
    color: colors.navy,
  },
  notifDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.yellow,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 12,
  },
  scrollWithProfileSticky: {
    paddingBottom: 180,
  },
  error: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.wrong,
  },
  stepperCard: {
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 12,
    overflow: 'hidden',
  },
  stepsRow: {
    flexDirection: 'row',
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
  },
  stepConnector: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.track,
  },
  stepConnectorLeft: {
    marginRight: 6,
  },
  stepConnectorRight: {
    marginLeft: 6,
  },
  stepConnectorSpacer: {
    flex: 1,
  },
  stepConnectorActive: {
    backgroundColor: colors.green,
  },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.track,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: {
    backgroundColor: colors.green,
  },
  stepDotCurrent: {
    backgroundColor: colors.navy,
  },
  stepDotText: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 13,
    color: colors.subtle,
  },
  stepDotTextCurrent: {
    color: '#FFFFFF',
  },
  stepPillText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11.5,
    color: colors.subtle,
  },
  stepPillTextActive: {
    color: colors.navy,
  },
  stepperFillHidden: {
    height: 0,
  },
  introTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: 22,
    letterSpacing: -0.44,
    color: colors.navy,
  },
  titleAccent: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.green,
    marginTop: 8,
  },
  introText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13.5,
    color: colors.muted,
    lineHeight: 19,
    marginTop: 8,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    fontFamily: 'Sora_700Bold',
    fontSize: 16,
    color: colors.navy,
  },
  sectionHint: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12.5,
    color: colors.muted,
    marginTop: 2,
  },
  sectionMonth: {
    marginLeft: 'auto',
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12.5,
    color: colors.muted,
  },
  empty: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13.5,
    color: colors.muted,
  },
  choice: {
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  moniteurRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarWrap: {
    position: 'relative',
  },
  listAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.greenTint,
  },
  carPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: 'Sora_700Bold',
    fontSize: 20,
    color: colors.greenDark,
  },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.green,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceText: {
    fontFamily: 'Sora_700Bold',
    fontSize: 16,
    color: colors.navy,
  },
  brandText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12.5,
    color: colors.muted,
    marginTop: 2,
  },
  typePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: colors.greenTint,
    marginTop: 6,
  },
  typePillText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    color: colors.greenDark,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  statItem: {
    flex: 1,
    gap: 2,
  },
  statValue: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 13.5,
    color: colors.navy,
  },
  statLabel: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 11.5,
    color: colors.subtle,
  },
  seeProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seeProfile: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13.5,
    color: colors.greenDark,
  },
  trustCard: {
    borderRadius: 22,
    backgroundColor: colors.greenTint,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trustCopy: {
    flex: 1,
    gap: 2,
  },
  trustTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: 15,
    color: colors.greenInk,
  },
  trustText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12.5,
    color: colors.ink2,
    lineHeight: 17,
  },
  trustCheck: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileWrap: {
    gap: 12,
  },
  profileHero: {
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  profileAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.greenTint,
  },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileHeroCopy: {
    flex: 1,
    gap: 6,
  },
  profileName: {
    fontFamily: 'Sora_700Bold',
    fontSize: 20,
    color: colors.navy,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  priceTypePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: colors.navy,
  },
  priceTypePillText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  vehicleCard: {
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
    overflow: 'hidden',
  },
  vehicleCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vehicleCardTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: 16,
    color: colors.navy,
  },
  vehicleCarousel: {
    marginHorizontal: -16,
  },
  vehiclePhoto: {
    height: 190,
    marginHorizontal: 16,
    borderRadius: 18,
    backgroundColor: colors.bg,
  },
  carPlaceholderText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.subtle,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.track,
  },
  dotActive: {
    width: 22,
    backgroundColor: colors.green,
  },
  vehicleBrand: {
    fontFamily: 'Sora_700Bold',
    fontSize: 16,
    color: colors.navy,
  },
  featureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    backgroundColor: colors.greenTint,
  },
  featureChipText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12.5,
    color: colors.greenInk,
  },
  infoRowCard: {
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  infoRowIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPlayIcon: {
    backgroundColor: colors.green,
  },
  infoRowCopy: {
    flex: 1,
    gap: 3,
  },
  infoRowTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: 15,
    color: colors.navy,
  },
  infoRowSubtitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12.5,
    color: colors.muted,
    lineHeight: 17,
  },
  seeMore: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12.5,
    color: colors.greenDark,
    marginTop: 2,
  },
  galleryRow: {
    gap: 8,
    paddingTop: 6,
  },
  galleryPhoto: {
    width: 96,
    height: 72,
    borderRadius: 12,
    backgroundColor: colors.bg,
  },
  secondaryBtn: {
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  secondaryBtnText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: colors.navy,
  },
  durationMoniteurCard: {
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  durationMoniteurAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.greenTint,
  },
  durationMoniteurCopy: {
    flex: 1,
    gap: 2,
  },
  vehicleTypeAccent: {
    color: colors.greenDark,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  durationCardWrap: {
    width: '48%',
    flexGrow: 1,
  },
  durationCard: {
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 4,
    position: 'relative',
  },
  durationCardActive: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  durationCardHours: {
    fontFamily: 'Sora_700Bold',
    fontSize: 22,
    color: colors.navy,
  },
  durationCardHoursActive: {
    color: '#FFFFFF',
  },
  durationCardPrice: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12.5,
    color: colors.muted,
  },
  durationCardPriceActive: {
    color: 'rgba(255,255,255,0.85)',
  },
  durationCheck: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    minHeight: 56,
    borderRadius: 28,
    backgroundColor: colors.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  durationPrimaryBtn: {
    marginTop: 12,
  },
  primaryBtnText: {
    flex: 1,
    textAlign: 'center',
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 15,
    color: '#FFFFFF',
  },
  primaryBtnArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeMoniteurCard: {
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
  },
  changeMoniteurIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeMoniteurText: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: colors.navy,
  },
  helpCard: {
    borderRadius: 22,
    backgroundColor: colors.yellowTint,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 10,
  },
  helpIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpCopy: {
    flex: 1,
    gap: 2,
  },
  helpTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: 14,
    color: colors.navy,
  },
  helpText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12.5,
    color: colors.ink2,
    lineHeight: 17,
  },
  slotsRecapCard: {
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  slotsRecapMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  slotsRecapAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.greenTint,
  },
  slotsRecapCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0,
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
  },
  slotsRecapTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: colors.greenTint,
  },
  slotsRecapTagText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11.5,
    color: colors.greenDark,
  },
  slotsEditBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  slotsEditText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
    color: colors.greenDark,
  },
  dayChipsRow: {
    gap: 8,
    paddingRight: 4,
    marginTop: 10,
  },
  slotsHoursCard: {
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
    marginTop: 12,
  },
  slotsHoursHead: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slotsHoursTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: 16,
    color: colors.navy,
  },
  fieldLabel: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12.5,
    color: colors.muted,
    marginTop: 3,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  slotCardWrap: {
    width: '48%',
    flexGrow: 1,
  },
  slotCard: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  slotCardActive: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  slotCardText: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 13.5,
    color: colors.navy,
  },
  slotCardTextActive: {
    color: '#FFFFFF',
  },
  profileSticky: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 8,
  },
  stickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stickyLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  stickyCalIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.greenTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickyTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: 13.5,
    color: colors.navy,
  },
  stickyPrice: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 14,
    color: colors.greenDark,
    marginTop: 2,
  },
  stickyBtn: {
    height: 52,
    paddingHorizontal: 18,
    borderRadius: 26,
    backgroundColor: colors.green,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stickyBtnText: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 15,
    color: '#FFFFFF',
  },
  stickyBtnArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
})
