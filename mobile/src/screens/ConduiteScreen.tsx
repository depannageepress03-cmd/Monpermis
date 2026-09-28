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
  Plus,
  User,
} from 'lucide-react-native'
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
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
  type AccessMe,
  type AccessModule,
  type CheckoutCartItem,
} from '../api/accessRequests'
import { LegalFooter } from '../components/LegalFooter'
import { MobileMoneyCheckout } from '../components/MobileMoneyCheckout'
import { ScreenLoader } from '../components/ScreenLoader'
import { useRequireAuth } from '../hooks/useRequireAuth'
import type { RootStackParamList } from '../navigation/types'
import { formatPrice } from '../utils/money'
import { colors } from '../theme/tokens'
import { LogoTile } from '../components/ui-kit-core'
import { HeroCard, NotchedCard, PlanCard } from '../components/ui-kit-cards'
import { MainTabBar } from '../components/ui-kit-nav'

type Nav = NativeStackNavigationProp<RootStackParamList, 'Conduite'>

const SEGMENT_COUNT = 20

function statusLabel(item: ReservationItem) {
  if (item.paymentStatus === 'paid' || item.status === 'confirmed') return 'Confirmée'
  if (item.paymentStatus === 'pending_validation') return 'Paiement à valider'
  if (item.status === 'pending_payment') return 'En attente'
  return item.status
}

function reservationHours(item: ReservationItem) {
  if (!item.creneau) return 0
  const [sh, sm] = item.creneau.startTime.split(':').map((v) => parseInt(v, 10) || 0)
  const [eh, em] = item.creneau.endTime.split(':').map((v) => parseInt(v, 10) || 0)
  return Math.max(0.5, Math.round((eh - sh + (em - sm) / 60) * 2) / 2)
}

export function ConduiteScreen() {
  const navigation = useNavigation<Nav>()
  const { user, loading } = useRequireAuth(navigation)
  const [progress, setProgress] = useState<DrivingProgress | null>(null)
  const [upcoming, setUpcoming] = useState<ReservationItem[]>([])
  const [loadingDash, setLoadingDash] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
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

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoadingDash(true)
    else setRefreshing(true)
    setError(null)
    try {
      const data = await fetchDrivingDashboard()
      setProgress(data.progress)
      setUpcoming(data.upcoming || [])
    } catch (err) {
      setError(err instanceof ReservationError ? err.message : 'Chargement impossible')
    } finally {
      setLoadingDash(false)
      setRefreshing(false)
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
      await load(true)
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
        accessMe.access?.conduite_heures),
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
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.accessState}>
            <ActivityIndicator color={colors.green} />
            <Text style={styles.accessStateCopy}>Vérification de ton accès…</Text>
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

    return (
      <View style={styles.root}>
        <View style={styles.halo} pointerEvents="none" />
        <SafeAreaView style={styles.safe} edges={['top']}>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.headRow}>
              <Pressable
                style={({ pressed }) => [styles.roundBtn, pressed && styles.pressed]}
                onPress={goHome}
                accessibilityLabel="Retour"
                hitSlop={8}
              >
                <ChevronLeft size={22} color={colors.navy} />
              </Pressable>
              <LogoTile size="sm" />
            </View>
            <View style={styles.lockIcon}>
              <Lock size={28} color={colors.subtle} />
            </View>
            <Text style={styles.h1}>Choisir tes accès conduite</Text>
            <Text style={styles.sub}>
              Les accès s’activent après confirmation du paiement correspondant.
            </Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}

            {!accessMe?.access?.conduite_videos ? (
              <PlanCard
                name="Cours vidéo de conduite"
                description="Inactif · aucun paiement confirmé"
                price="Inactif"
              />
            ) : null}

            <PlanCard
              name="Heure avec moniteur"
              description={`${formatPrice(hoursModule?.price || 5000)} / heure${qty >= 2 ? ` · total ${formatPrice(hoursPrice)} (−1 000)` : ''}`}
              price={formatPrice(hoursPrice)}
              selected={pickHours}
              onPress={() => setPickHours((v) => !v)}
            />

            {pickHours ? (
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={hoursQty}
                onChangeText={setHoursQty}
                placeholder="Nombre d’heures"
                placeholderTextColor={colors.subtle}
              />
            ) : null}

            {pickHours ? (
              <Pressable
                style={({ pressed }) => [styles.payBtn, pressed && styles.pressed]}
                onPress={() => setCheckoutOpen(true)}
              >
                <Text style={styles.payText}>Payer {formatPrice(hoursPrice)}</Text>
              </Pressable>
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

  const soldeHeures = progress?.soldeHeures ?? accessMe?.user.soldeHeures ?? 0
  const heuresEffectuees = progress?.heuresEffectuees ?? 0
  const heuresObjectif = progress?.heuresObjectif ?? 20
  const doneSegments = Math.round((heuresEffectuees / heuresObjectif) * SEGMENT_COUNT)

  return (
    <View style={styles.root}>
      <View style={styles.halo} pointerEvents="none" />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.green} />
          }
        >
          <View style={styles.headRow}>
            <View>
              <Text style={styles.h1}>Conduite</Text>
              <Text style={styles.sub}>Réserve ton prochain créneau</Text>
            </View>
            <View style={styles.headActions}>
              <Pressable
                style={({ pressed }) => [styles.roundBtn, pressed && styles.pressed]}
                onPress={goProfile}
                accessibilityLabel="Profil"
                hitSlop={8}
              >
                <User size={19} color={colors.muted} />
              </Pressable>
              <LogoTile size="sm" />
            </View>
          </View>

          {loadingDash ? <ActivityIndicator color={colors.green} /> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <HeroCard variant="conduite">
            <View style={styles.heroTop}>
              <View>
                <Text style={styles.heroLabel}>Solde d'heures</Text>
                <Text style={styles.heroHours}>
                  {soldeHeures} h<Text style={styles.heroHoursDim}> restantes</Text>
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.glassBtn, pressed && styles.pressed]}
                onPress={() => navigation.navigate('Abonnement')}
                accessibilityRole="button"
                accessibilityLabel="Acheter des heures"
              >
                <Plus size={14} color="#FFFFFF" strokeWidth={2.6} />
                <Text style={styles.glassBtnText}>Heures</Text>
              </Pressable>
            </View>
            <View style={styles.segments} accessibilityLabel={`${heuresEffectuees} heures effectuées sur ${heuresObjectif}`}>
              {Array.from({ length: SEGMENT_COUNT }, (_, index) => (
                <View
                  key={index}
                  style={[styles.segment, index < doneSegments && styles.segmentDone]}
                />
              ))}
            </View>
            <View style={styles.heroBottom}>
              <Text style={styles.heroMeta}>{heuresEffectuees} h effectuées</Text>
              <Text style={styles.heroMeta}>Forfait {heuresObjectif} h</Text>
            </View>
          </HeroCard>

          <Pressable
            style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}
            onPress={() => navigation.navigate('LeconsChapitres')}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.yellowTint }]}>
              <BookOpen size={22} color={colors.yellowInk} />
            </View>
            <View style={styles.actionCopy}>
              <Text style={styles.actionTitle}>Leçons</Text>
              <Text style={styles.actionHint}>Manœuvres, circulation et examen</Text>
            </View>
            <ChevronRight size={20} color={colors.yellowInk} />
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}
            onPress={() => navigation.navigate('ReservationFlow')}
          >
            <View style={[styles.actionIcon, { backgroundColor: colors.greenTint }]}>
              <CalendarPlus size={22} color={colors.greenDark} />
            </View>
            <View style={styles.actionCopy}>
              <Text style={styles.actionTitle}>Réserver une séance</Text>
              <Text style={styles.actionHint}>Choisir un créneau avec un moniteur</Text>
            </View>
            <ChevronRight size={20} color={colors.greenDark} />
          </Pressable>

          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Mes réservations</Text>
            <Pressable onPress={() => navigation.navigate('MesReservations')} hitSlop={8}>
              <Text style={styles.seeAll}>Voir tout</Text>
            </Pressable>
          </View>

          {upcoming.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Calendar size={22} color={colors.navyLight} />
              </View>
              <Text style={styles.emptyText}>Aucune séance réservée pour le moment.</Text>
            </View>
          ) : (
            upcoming.slice(0, 3).map((item) => (
              <NotchedCard
                key={String(item.id)}
                tabLabel={statusLabel(item)}
                tabColor={colors.greenTint2}
                tone="light"
                tabIcon={<View style={styles.tabDot} />}
              >
                <Pressable
                  onPress={() => {
                    navigation.navigate('ReservationConfirm', {
                      reservationId: item.id,
                      moniteurName: item.moniteur?.fullName || 'Moniteur',
                      vehicleBrand: item.moniteur?.vehicleBrand || '',
                      date: item.creneau?.date || '',
                      startTime: item.creneau?.startTime || '',
                      endTime: item.creneau?.endTime || '',
                      hours: reservationHours(item),
                      priceFcfa: item.priceFcfa || item.creneau?.priceFcfa || 0,
                      paymentMethod: item.paymentStatus === 'paid' ? 'solde' : 'mobile_money',
                      fromList: true,
                    })
                  }}
                >
                  <Text style={styles.resaTitle}>
                    {item.creneau
                      ? `${item.creneau.date} · ${item.creneau.startTime} – ${item.creneau.endTime}`
                      : 'Séance'}
                  </Text>
                  <Text style={styles.resaMeta}>{item.moniteur?.fullName || 'Moniteur'}</Text>
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
              </NotchedCard>
            ))
          )}

          <View style={styles.infoCard}>
            <View style={styles.infoIcon}>
              <Info size={20} color={colors.navyLight} />
            </View>
            <Text style={styles.infoText}>
              Tu peux annuler une séance jusqu’à 24 h avant, avec une justification transmise à
              l’administration.
            </Text>
          </View>

          <LegalFooter />
          <View style={{ height: 120 }} />
        </ScrollView>
      </SafeAreaView>
      <MainTabBar activeId="conduite" />

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
              placeholderTextColor={colors.subtle}
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
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 56,
    gap: 12,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  h1: {
    fontFamily: 'Sora_700Bold',
    fontSize: 26,
    letterSpacing: -0.52,
    color: colors.navy,
  },
  sub: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.muted,
    marginTop: 3,
  },
  headActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  error: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.wrong,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  heroLabel: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.75)',
  },
  heroHours: {
    fontFamily: 'Sora_700Bold',
    fontSize: 44,
    lineHeight: 48,
    letterSpacing: -1.3,
    color: '#FFFFFF',
    marginTop: 6,
  },
  heroHoursDim: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.5)',
  },
  glassBtn: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  glassBtnText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12.5,
    color: '#FFFFFF',
  },
  segments: {
    flexDirection: 'row',
    gap: 4,
  },
  segment: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  segmentDone: {
    backgroundColor: colors.green,
  },
  heroBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroMeta: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    color: 'rgba(255,255,255,0.78)',
  },
  actionCard: {
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCopy: {
    flex: 1,
    gap: 2,
  },
  actionTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: 16,
    color: colors.navy,
  },
  actionHint: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12.5,
    color: colors.muted,
  },
  sectionHead: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: 18,
    color: colors.navy,
  },
  seeAll: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
    color: colors.greenDark,
  },
  emptyCard: {
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.navyTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13.5,
    color: colors.muted,
  },
  resaTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: 15.5,
    color: colors.greenInk,
  },
  resaMeta: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12.5,
    color: colors.ink2,
    marginTop: 2,
  },
  tabDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.green,
  },
  cancelLink: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  cancelLinkText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
    color: colors.wrong,
  },
  infoCard: {
    borderRadius: 20,
    backgroundColor: colors.navyTint,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12.5,
    color: colors.ink2,
    lineHeight: 18,
  },
  accessState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  accessStateCopy: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13.5,
    color: colors.muted,
  },
  lockIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.bg,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
    color: colors.navy,
  },
  payBtn: {
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payText: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  disabled: {
    opacity: 0.45,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(6,18,42,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    padding: 20,
    gap: 10,
  },
  modalTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: 18,
    color: colors.navy,
  },
  modalMeta: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.muted,
  },
  modalLabel: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12.5,
    color: colors.navy,
  },
  modalInput: {
    minHeight: 96,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 14,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: colors.navy,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 8,
  },
  modalSecondary: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSecondaryText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: colors.muted,
  },
  modalPrimary: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
})
