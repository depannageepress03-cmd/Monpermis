import { useCallback, useEffect, useState } from 'react'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { setStatusBarStyle } from 'expo-status-bar'
import {
  BookOpen,
  Calendar,
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Info,
  Lock,
  User,
} from 'lucide-react-native'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Circle } from 'react-native-svg'
import {
  cancelReservation,
  fetchDrivingDashboard,
  type DrivingProgress,
  type ReservationItem,
  ReservationError,
} from '../api/reservations'
import {
  fetchAccessMe,
  fetchAccessModules,
  computeModuleAmount,
  claimFreeAccess,
  type AccessMe,
  type AccessModule,
  type CheckoutCartItem,
} from '../api/accessRequests'
import { Bouncy } from '../components/Bouncy'
import { FadeUp } from '../components/FadeUp'
import { LegalFooter } from '../components/LegalFooter'
import { DriveModuleIcon } from '../components/ModuleIcons'
import { MobileMoneyCheckout } from '../components/MobileMoneyCheckout'
import { ProgressBar } from '../components/ProgressBar'
import { ScreenLoader } from '../components/ScreenLoader'
import { useRequireAuth } from '../hooks/useRequireAuth'
import type { RootStackParamList } from '../navigation/types'
import { brand, dark, fonts, shadows } from '../theme'

type Nav = NativeStackNavigationProp<RootStackParamList, 'Conduite'>

const ORANGE = '#F97316'
const ORANGE_SOFT = '#FFF7ED'
const BLUE_SOFT = '#EFF6FF'
const BLUE_INFO = '#3B82F6'

function statusLabel(item: ReservationItem) {
  if (item.paymentStatus === 'paid' || item.status === 'confirmed') return 'Confirmée'
  if (item.paymentStatus === 'pending_validation') return 'Paiement à valider'
  if (item.status === 'pending_payment') return 'En attente'
  return item.status
}

function HoursRing({ percent }: { percent: number }) {
  const size = 80
  const stroke = 7
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(1, percent / 100))
  const offset = c * (1 - clamped)
  const label = `${Math.round(percent)}%`

  return (
    <View style={styles.ringWrap} accessibilityLabel={`Progression ${label}`}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(0,16,48,0.08)"
          strokeWidth={stroke}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={dark.green}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={styles.ringValue}>{label}</Text>
    </View>
  )
}

function ConduiteHeader({
  onBack,
  onProfile,
}: {
  onBack: () => void
  onProfile: () => void
}) {
  return (
    <View style={styles.topBar}>
      <Pressable
        style={({ pressed }) => [styles.roundBtn, pressed && styles.pressed]}
        onPress={onBack}
        accessibilityLabel="Retour"
        hitSlop={8}
      >
        <ChevronLeft size={22} color={dark.textPrimary} />
      </Pressable>
      <View style={styles.topBarCenter}>
        <DriveModuleIcon size={22} />
        <Text style={styles.topBarTitle}>Conduite</Text>
      </View>
      <Pressable
        style={({ pressed }) => [styles.roundBtn, pressed && styles.pressed]}
        onPress={onProfile}
        accessibilityLabel="Profil"
        hitSlop={8}
      >
        <User size={19} color={dark.textMuted} />
      </Pressable>
    </View>
  )
}

export function ConduiteScreen() {
  const navigation = useNavigation<Nav>()
  const { user, loading } = useRequireAuth(navigation)
  const [progress, setProgress] = useState<DrivingProgress | null>(null)
  const [upcoming, setUpcoming] = useState<ReservationItem[]>([])
  const [loadingDash, setLoadingDash] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancelTarget, setCancelTarget] = useState<ReservationItem | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [accessMe, setAccessMe] = useState<AccessMe | null>(null)
  const [modules, setModules] = useState<AccessModule[]>([])
  const [accessLoading, setAccessLoading] = useState(true)
  const [pickHours, setPickHours] = useState(false)
  const [hoursQty, setHoursQty] = useState('1')
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [claimingFree, setClaimingFree] = useState(false)

  const load = useCallback(async () => {
    setLoadingDash(true)
    setError(null)
    try {
      const data = await fetchDrivingDashboard()
      setProgress(data.progress)
      setUpcoming(data.upcoming || [])
    } catch (err) {
      setError(err instanceof ReservationError ? err.message : 'Chargement impossible')
    } finally {
      setLoadingDash(false)
    }
  }, [])

  const submitCancel = async () => {
    if (!cancelTarget) return
    const reason = cancelReason.trim()
    if (reason.length < 5) {
      setError('Indiquez une justification d’au moins 5 caractères')
      return
    }
    setCancelling(true)
    setError(null)
    try {
      await cancelReservation(String(cancelTarget.id), reason)
      setCancelTarget(null)
      setCancelReason('')
      await load()
    } catch (err) {
      setError(err instanceof ReservationError ? err.message : 'Annulation impossible')
    } finally {
      setCancelling(false)
    }
  }

  useEffect(() => {
    if (!user) return
    void Promise.all([fetchAccessMe(), fetchAccessModules()])
      .then(([me, catalog]) => {
        setAccessMe(me)
        setModules(catalog)
      })
      .catch(() => {
        setAccessMe(null)
        setModules([])
      })
      .finally(() => setAccessLoading(false))
  }, [user])

  const conduiteUnlocked = Boolean(
    accessMe &&
      (accessMe.access?.conduite_videos ||
        accessMe.access?.conduite_heures ||
        (accessMe.user?.soldeHeures || 0) > 0),
  )

  useEffect(() => {
    if (conduiteUnlocked) void load()
  }, [conduiteUnlocked, load])

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('dark')
      return () => setStatusBarStyle('dark')
    }, []),
  )

  if (loading || !user) return <ScreenLoader />

  const goHome = () => navigation.navigate('Home')
  const goProfile = () => navigation.navigate('Profile')

  if (accessLoading) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <ConduiteHeader onBack={goHome} onProfile={goProfile} />
          <View style={styles.accessState}>
            <ActivityIndicator color={dark.green} />
            <Text style={styles.accessStateCopy}>Vérification de ton accès…</Text>
          </View>
          <View style={styles.footerPad}>
            <LegalFooter />
          </View>
        </SafeAreaView>
      </View>
    )
  }

  if (!conduiteUnlocked) {
    const hoursModule = modules.find((m) => m.key === 'conduite_heures')
    const qty = Math.max(1, Number(hoursQty) || 1)
    const hoursPrice = hoursModule
      ? computeModuleAmount('conduite_heures', hoursModule.price, qty)
      : qty >= 2
        ? qty * 5000 - 1000
        : qty * 5000
    const cartItems: CheckoutCartItem[] = pickHours
      ? [{ module: 'conduite_heures', quantity: qty }]
      : []
    const cartTotal = pickHours ? hoursPrice : 0
    const formatPrice = (amount: number) =>
      new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'XOF',
        maximumFractionDigits: 0,
      }).format(amount)

    const activateFreeVideos = async () => {
      setClaimingFree(true)
      setError(null)
      try {
        const result = await claimFreeAccess(['conduite_videos'])
        setAccessMe(result.access)
        navigation.navigate('LeconsChapitres')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Activation impossible')
      } finally {
        setClaimingFree(false)
      }
    }

    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <ConduiteHeader onBack={goHome} onProfile={goProfile} />
          <ScrollView contentContainerStyle={styles.accessScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.accessLock}>
              <Lock size={28} color={dark.textMuted} />
            </View>
            <Text style={styles.accessStateTitle}>Choisir tes accès conduite</Text>
            <Text style={styles.accessStateCopy}>
              Les cours vidéo sont gratuits. Les heures avec moniteur restent payantes.
            </Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            {!accessMe?.access?.conduite_videos ? (
              <Pressable
                style={[styles.offerCard, styles.offerCardSelected]}
                disabled={claimingFree}
                onPress={() => void activateFreeVideos()}
              >
                <Text style={styles.offerTitle}>Cours vidéo de conduite</Text>
                {claimingFree ? <Text style={styles.offerPrice}>Activation…</Text> : null}
              </Pressable>
            ) : null}

            <Pressable
              style={[styles.offerCard, pickHours && styles.offerCardSelected]}
              onPress={() => setPickHours((v) => !v)}
            >
              <Text style={styles.offerTitle}>Heure avec moniteur</Text>
              <Text style={styles.offerPrice}>
                {formatPrice(hoursModule?.price || 5000)} / heure
                {qty >= 2 ? ` · total ${formatPrice(hoursPrice)} (−1 000)` : ''}
              </Text>
            </Pressable>

            {pickHours ? (
              <TextInput
                style={styles.hoursInput}
                keyboardType="number-pad"
                value={hoursQty}
                onChangeText={setHoursQty}
                placeholder="Nombre d’heures"
                placeholderTextColor={dark.textMuted}
              />
            ) : null}

            {pickHours ? (
              <Bouncy scaleTo={0.97} disabled={claimingFree} onPress={() => setCheckoutOpen(true)}>
                <View style={[styles.accessButton, claimingFree && { opacity: 0.5 }]}>
                  <Text style={styles.accessButtonText}>Payer {formatPrice(cartTotal)}</Text>
                </View>
              </Bouncy>
            ) : null}
            <LegalFooter />
          </ScrollView>
          <MobileMoneyCheckout
            visible={checkoutOpen}
            items={cartItems}
            modules={modules}
            defaultPhone={user.phone}
            onClose={() => setCheckoutOpen(false)}
            onSuccess={(access) => {
              setAccessMe(access)
              setCheckoutOpen(false)
            }}
          />
        </SafeAreaView>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ConduiteHeader onBack={goHome} onProfile={goProfile} />

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <FadeUp delay={60} style={styles.hero}>
            <Text style={styles.heroEyebrow}>Ton parcours</Text>
            <Text style={styles.heroTitle}>Prends la route</Text>
            <Text style={styles.heroSubtitle}>
              Suis tes heures, réserve tes séances avec un moniteur et progresse jusqu’à l’examen.
            </Text>
          </FadeUp>

          {loadingDash ? <ActivityIndicator color={dark.green} style={{ marginBottom: 16 }} /> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {progress ? (
            <FadeUp delay={120}>
              <View style={styles.progressCard}>
                <HoursRing percent={progress.percent} />
                <View style={styles.progressCopy}>
                  <Text style={styles.progressLabel}>
                    {progress.heuresEffectuees} / {progress.heuresObjectif} h de conduite
                  </Text>
                  <ProgressBar
                    progress={progress.percent / 100}
                    color={dark.green}
                    trackColor="rgba(0,16,48,0.08)"
                    height={8}
                  />
                  <Text style={styles.progressMeta}>
                    Solde heures moniteur : {progress.soldeHeures} h{' '}
                    <Text style={styles.progressMetaHint}>(≠ abonnement Code)</Text>
                  </Text>
                </View>
              </View>
            </FadeUp>
          ) : null}

          <FadeUp delay={180}>
            <Bouncy scaleTo={0.97} onPress={() => navigation.navigate('LeconsChapitres')}>
              <View style={[styles.actionCard, styles.actionLessons]}>
                <View style={[styles.actionIcon, styles.actionIconLessons]}>
                  <BookOpen size={22} color={ORANGE} />
                </View>
                <View style={styles.actionCopy}>
                  <Text style={styles.actionTitle}>Leçons</Text>
                  <Text style={styles.actionHint}>Manœuvres, circulation et examen</Text>
                </View>
                <ChevronRight size={20} color={ORANGE} />
              </View>
            </Bouncy>

            <Bouncy
              scaleTo={0.97}
              style={styles.secondAction}
              onPress={() => navigation.navigate('ReservationFlow')}
            >
              <View style={[styles.actionCard, styles.actionReserve]}>
                <View style={[styles.actionIcon, styles.actionIconReserve]}>
                  <CalendarPlus size={22} color={dark.green} />
                </View>
                <View style={styles.actionCopy}>
                  <Text style={styles.actionTitle}>Réserver une séance</Text>
                  <Text style={styles.actionHint}>Choisir un créneau avec un moniteur</Text>
                </View>
                <ChevronRight size={20} color={dark.green} />
              </View>
            </Bouncy>
          </FadeUp>

          <FadeUp delay={240}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionLabel}>Mes réservations</Text>
              <Pressable
                onPress={() => navigation.navigate('MesReservations')}
                hitSlop={8}
                accessibilityRole="link"
              >
                <Text style={styles.seeAll}>Voir tout</Text>
              </Pressable>
            </View>

            {upcoming.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <Calendar size={22} color={BLUE_INFO} />
                </View>
                <Text style={styles.emptyText}>Aucune séance réservée pour le moment.</Text>
              </View>
            ) : (
              upcoming.slice(0, 3).map((item) => (
                <View key={String(item.id)} style={styles.reservationItem}>
                  <Pressable
                    style={{ flex: 1, minWidth: 0 }}
                    onPress={() => {
                      const hours = item.creneau
                        ? (() => {
                            const [sh, sm] = item.creneau!.startTime
                              .split(':')
                              .map((v) => parseInt(v, 10) || 0)
                            const [eh, em] = item.creneau!.endTime
                              .split(':')
                              .map((v) => parseInt(v, 10) || 0)
                            return Math.max(0.5, Math.round((eh - sh + (em - sm) / 60) * 2) / 2)
                          })()
                        : 0
                      navigation.navigate('ReservationConfirm', {
                        reservationId: item.id,
                        moniteurName: item.moniteur?.fullName || 'Moniteur',
                        vehicleBrand: item.moniteur?.vehicleBrand || '',
                        date: item.creneau?.date || '',
                        startTime: item.creneau?.startTime || '',
                        endTime: item.creneau?.endTime || '',
                        hours,
                        priceFcfa: item.priceFcfa || item.creneau?.priceFcfa || 0,
                        paymentMethod: item.paymentStatus === 'paid' ? 'solde' : 'mobile_money',
                        fromList: true,
                      })
                    }}
                  >
                    <Text style={styles.reservationTitle}>
                      {item.creneau
                        ? `${item.creneau.date} · ${item.creneau.startTime} – ${item.creneau.endTime}`
                        : 'Séance'}
                    </Text>
                    <Text style={styles.reservationMeta}>
                      {item.moniteur?.fullName || 'Moniteur'} · {statusLabel(item)}
                    </Text>
                  </Pressable>
                  {item.canCancel ? (
                    <Pressable
                      style={styles.cancelLink}
                      onPress={() => {
                        setError(null)
                        setCancelReason('')
                        setCancelTarget(item)
                      }}
                    >
                      <Text style={styles.cancelLinkText}>Annuler</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))
            )}

            <View style={styles.infoCard}>
              <View style={styles.infoIcon}>
                <Info size={20} color={BLUE_INFO} />
              </View>
              <Text style={styles.infoText}>
                Tu peux annuler une séance jusqu’à 24 h avant, avec une justification transmise à
                l’administration.
              </Text>
            </View>
          </FadeUp>

          <LegalFooter />
        </ScrollView>

        <Modal
          visible={Boolean(cancelTarget)}
          transparent
          animationType="fade"
          onRequestClose={() => !cancelling && setCancelTarget(null)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => !cancelling && setCancelTarget(null)}>
            <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>Annuler la séance</Text>
              <Text style={styles.modalMeta}>
                {cancelTarget?.creneau
                  ? `${cancelTarget.creneau.date} · ${cancelTarget.creneau.startTime}`
                  : 'Séance'}{' '}
                — {cancelTarget?.moniteur?.fullName || 'Moniteur'}
              </Text>
              <Text style={styles.modalLabel}>Justification (obligatoire)</Text>
              <TextInput
                style={styles.modalInput}
                value={cancelReason}
                onChangeText={setCancelReason}
                placeholder="Ex. Empêchement, maladie, transport…"
                placeholderTextColor={dark.textMuted}
                multiline
                maxLength={500}
                editable={!cancelling}
              />
              <View style={styles.modalActions}>
                <Pressable
                  style={styles.modalSecondary}
                  disabled={cancelling}
                  onPress={() => setCancelTarget(null)}
                >
                  <Text style={styles.modalSecondaryText}>Fermer</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.modalPrimary,
                    (cancelling || cancelReason.trim().length < 5) && styles.disabled,
                  ]}
                  disabled={cancelling || cancelReason.trim().length < 5}
                  onPress={() => void submitCancel()}
                >
                  <Text style={styles.modalPrimaryText}>
                    {cancelling ? 'Annulation…' : 'Confirmer'}
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
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
  topBarTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 22,
    color: dark.textPrimary,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 28,
  },
  footerPad: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },

  hero: {
    marginBottom: 24,
  },
  heroEyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    color: ORANGE,
    marginBottom: 6,
  },
  heroTitle: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 36,
    lineHeight: 42,
    color: dark.textPrimary,
    letterSpacing: -0.8,
  },
  heroSubtitle: {
    marginTop: 10,
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 24,
    color: dark.textMuted,
  },

  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    ...shadows.card,
  },
  ringWrap: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: {
    position: 'absolute',
    fontFamily: fonts.displayExtraBold,
    fontSize: 18,
    color: dark.green,
  },
  progressCopy: {
    flex: 1,
    minWidth: 0,
    gap: 10,
  },
  progressLabel: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    lineHeight: 28,
    color: dark.textPrimary,
  },
  progressMeta: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: dark.textMuted,
  },
  progressMetaHint: {
    color: dark.textMuted,
  },

  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    ...shadows.sm,
  },
  actionReserve: {
    borderColor: 'rgba(0,176,80,0.22)',
  },
  actionLessons: {
    borderColor: 'rgba(249,115,22,0.28)',
  },
  secondAction: {
    marginTop: 12,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  actionIconReserve: {
    backgroundColor: brand.greenPale,
  },
  actionIconLessons: {
    backgroundColor: ORANGE_SOFT,
  },
  actionCopy: {
    flex: 1,
    minWidth: 0,
  },
  actionTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 17,
    color: dark.textPrimary,
    marginBottom: 3,
  },
  actionHint: {
    fontFamily: fonts.body,
    fontSize: 13.5,
    lineHeight: 19,
    color: dark.textMuted,
  },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 28,
    marginBottom: 12,
  },
  sectionLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: dark.textPrimary,
  },
  seeAll: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: dark.green,
  },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.18)',
    backgroundColor: '#FFFFFF',
    padding: 16,
    ...shadows.sm,
  },
  emptyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: BLUE_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: dark.textMuted,
  },
  reservationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 10,
    ...shadows.sm,
  },
  reservationTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: dark.textPrimary,
  },
  reservationMeta: {
    marginTop: 3,
    fontFamily: fonts.body,
    fontSize: 13,
    color: dark.textMuted,
  },
  cancelLink: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(232,93,59,0.4)',
  },
  cancelLinkText: {
    color: dark.coral,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: BLUE_SOFT,
    borderRadius: 16,
    padding: 16,
  },
  infoIcon: {
    marginTop: 1,
  },
  infoText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: dark.textPrimary,
  },

  accessScroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 28,
  },
  accessState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 14,
  },
  accessLock: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    ...shadows.sm,
  },
  accessStateTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: dark.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  accessStateCopy: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: dark.textMuted,
    textAlign: 'center',
    maxWidth: 300,
  },
  accessButton: {
    marginTop: 18,
    borderRadius: 16,
    backgroundColor: dark.green,
    paddingHorizontal: 22,
    paddingVertical: 14,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  accessButtonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
  offerCard: {
    width: '100%',
    borderWidth: 1,
    borderColor: dark.border,
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    ...shadows.sm,
  },
  offerCardSelected: {
    borderColor: dark.green,
  },
  offerTitle: {
    color: dark.textPrimary,
    fontFamily: fonts.displayBold,
    fontSize: 16,
  },
  offerPrice: {
    color: dark.textMuted,
    fontFamily: fonts.body,
    fontSize: 14,
    marginTop: 4,
  },
  hoursInput: {
    width: '100%',
    marginTop: 12,
    borderWidth: 1,
    borderColor: dark.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: dark.textPrimary,
    fontFamily: fonts.body,
    backgroundColor: '#FFFFFF',
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,16,48,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    ...shadows.lg,
  },
  modalTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: dark.textPrimary,
    marginBottom: 6,
  },
  modalMeta: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: dark.textMuted,
    marginBottom: 14,
  },
  modalLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: dark.textPrimary,
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: dark.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 96,
    textAlignVertical: 'top',
    color: dark.textPrimary,
    backgroundColor: '#F8FAFC',
    fontFamily: fonts.body,
    marginBottom: 14,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalSecondary: {
    borderWidth: 1,
    borderColor: dark.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  modalSecondaryText: {
    color: dark.textPrimary,
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  modalPrimary: {
    backgroundColor: dark.green,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  modalPrimaryText: {
    color: '#FFFFFF',
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  error: {
    color: dark.coral,
    fontFamily: fonts.bodyMedium,
    marginBottom: 10,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.9,
  },
})
