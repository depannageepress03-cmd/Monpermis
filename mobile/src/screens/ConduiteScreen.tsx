import { useCallback, useEffect, useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import {
  BookOpen,
  CalendarPlus,
  ChevronRight,
  Lock,
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
import {
  cancelReservation,
  fetchDrivingDashboard,
  type DrivingProgress,
  type ReservationItem,
  ReservationError,
} from '../api/reservations'
import { fetchAccessMe, fetchAccessModules, computeModuleAmount, claimFreeAccess, type AccessMe, type AccessModule, type CheckoutCartItem } from '../api/accessRequests'
import { Bouncy } from '../components/Bouncy'
import { DarkHeader, DarkScreen } from '../components/DarkScreen'
import { ProgressBar } from '../components/ProgressBar'
import { DriveModuleIcon } from '../components/ModuleIcons'
import { MobileMoneyCheckout } from '../components/MobileMoneyCheckout'
import { ScreenLoader } from '../components/ScreenLoader'
import { FadeUp } from '../components/FadeUp'
import { useRequireAuth } from '../hooks/useRequireAuth'
import type { RootStackParamList } from '../navigation/types'
import { dark, fonts } from '../theme'

type Nav = NativeStackNavigationProp<RootStackParamList, 'Conduite'>

function statusLabel(item: ReservationItem) {
  if (item.paymentStatus === 'paid' || item.status === 'confirmed') return 'Confirmée'
  if (item.paymentStatus === 'pending_validation') return 'Paiement à valider'
  if (item.status === 'pending_payment') return 'En attente'
  return item.status
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

  if (loading || !user) return <ScreenLoader />

  const header = (
    <DarkHeader title="Conduite" icon={DriveModuleIcon} onBack={() => navigation.navigate('Home')} />
  )

  if (accessLoading) {
    return (
      <DarkScreen>
        {header}
        <View style={styles.accessState}>
          <Text style={styles.accessStateCopy}>Vérification de ton accès…</Text>
        </View>
      </DarkScreen>
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
      <DarkScreen>
        {header}
        <ScrollView contentContainerStyle={styles.accessState}>
          <View style={styles.accessLock}>
            <Lock size={30} color={dark.textMuted} />
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
      </DarkScreen>
    )
  }

  return (
    <DarkScreen>
      {header}
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <FadeUp delay={80} style={styles.hero}>
          <Text style={styles.heroEyebrow}>Ton parcours</Text>
          <Text style={styles.heroTitle}>Prends la route</Text>
          <Text style={styles.heroSubtitle}>
            Suis tes heures, réserve tes séances avec un moniteur et progresse jusqu’à l’examen.
          </Text>
        </FadeUp>

        {loadingDash ? <ActivityIndicator color={dark.green} style={{ marginBottom: 12 }} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {progress ? (
          <FadeUp delay={140}>
            <View style={styles.progressCard}>
              <View style={styles.progressHeadRow}>
                <Text style={styles.progressLabel}>
                  {progress.heuresEffectuees} / {progress.heuresObjectif} h de conduite
                </Text>
                <View style={styles.progressPct}>
                  <Text style={styles.progressPctText}>{Math.round(progress.percent)}%</Text>
                </View>
              </View>
              <ProgressBar
                progress={progress.percent / 100}
                color={dark.green}
                trackColor="rgba(255,255,255,0.08)"
                height={10}
              />
              <Text style={styles.progressMeta}>Solde disponible : {progress.soldeHeures} h</Text>
            </View>
          </FadeUp>
        ) : null}

        <FadeUp delay={180}>
          <Bouncy scaleTo={0.97} onPress={() => navigation.navigate('LeconsChapitres')}>
            <View style={[styles.actionCard, styles.actionLessons]}>
              <View style={[styles.actionIcon, styles.actionIconLessons]}>
                <BookOpen size={22} color={dark.coral} />
              </View>
              <View style={styles.actionCopy}>
                <Text style={styles.actionTitle}>Leçons</Text>
                <Text style={styles.actionHint}>Manœuvres, circulation et examen</Text>
              </View>
              <ChevronRight size={20} color={dark.coral} />
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

        <FadeUp delay={220}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionLabel}>Mes réservations</Text>
            <Pressable onPress={() => navigation.navigate('MesReservations')}>
              <Text style={styles.seeAll}>Voir tout</Text>
            </Pressable>
          </View>
          {upcoming.length === 0 ? (
            <View style={styles.emptyCard}>
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
          <Text style={styles.footNote}>
            Tu peux annuler une séance jusqu’à 24 h avant, avec une justification transmise à
            l’administration.
          </Text>
        </FadeUp>
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
              <Pressable style={styles.modalSecondary} disabled={cancelling} onPress={() => setCancelTarget(null)}>
                <Text style={styles.modalSecondaryText}>Fermer</Text>
              </Pressable>
              <Pressable
                style={[styles.modalPrimary, (cancelling || cancelReason.trim().length < 5) && styles.disabled]}
                disabled={cancelling || cancelReason.trim().length < 5}
                onPress={() => void submitCancel()}
              >
                <Text style={styles.modalPrimaryText}>{cancelling ? 'Annulation…' : 'Confirmer'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </DarkScreen>
  )
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 32,
  },

  /* Hero */
  hero: { marginBottom: 20 },
  heroEyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: dark.coral,
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  heroTitle: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 30,
    lineHeight: 36,
    color: dark.textPrimary,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    marginTop: 8,
    fontFamily: fonts.body,
    fontSize: 14.5,
    lineHeight: 21,
    color: dark.textMuted,
  },

  /* Progress */
  progressCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.surface,
    padding: 16,
    marginBottom: 16,
  },
  progressHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  progressLabel: { fontFamily: fonts.displayBold, fontSize: 14, color: dark.textPrimary },
  progressPct: {
    backgroundColor: dark.greenSoft,
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  progressPctText: { fontFamily: fonts.bodyBold, fontSize: 11, color: dark.green },
  progressMeta: { marginTop: 10, fontFamily: fonts.body, fontSize: 12.5, color: dark.textMuted },

  /* Actions */
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 20,
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderWidth: 1,
    backgroundColor: dark.surface,
  },
  actionReserve: { borderColor: 'rgba(34,214,115,0.28)' },
  actionLessons: { borderColor: 'rgba(255,107,74,0.28)' },
  secondAction: { marginTop: 12 },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  actionIconReserve: { backgroundColor: dark.greenSoft },
  actionIconLessons: { backgroundColor: dark.coralSoft },
  actionCopy: { flex: 1, minWidth: 0 },
  actionTitle: { fontFamily: fonts.displayBold, fontSize: 16, color: dark.textPrimary, marginBottom: 3 },
  actionHint: { fontFamily: fonts.body, fontSize: 12.5, color: dark.textMuted },

  /* Reservations */
  sectionLabel: {
    fontFamily: fonts.display,
    fontSize: 11.5,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: dark.textMuted,
    marginTop: 0,
    marginBottom: 0,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 26,
    marginBottom: 10,
  },
  seeAll: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: dark.green,
  },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.surface,
    padding: 16,
  },
  emptyText: { fontFamily: fonts.body, fontSize: 13, color: dark.textMuted, lineHeight: 19 },
  reservationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.surface,
    padding: 14,
    marginBottom: 8,
  },
  reservationTitle: { fontFamily: fonts.displayBold, fontSize: 14, color: dark.textPrimary },
  reservationMeta: { marginTop: 2, fontFamily: fonts.body, fontSize: 12, color: dark.textMuted },
  cancelLink: {
    alignSelf: 'flex-start',
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,107,74,0.45)',
  },
  cancelLinkText: { color: dark.coral, fontFamily: fonts.bodyBold, fontSize: 11 },
  footNote: {
    marginTop: 12,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    color: dark.textMuted,
  },

  /* Access state */
  accessState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  accessLock: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dark.surfaceRaised,
    marginBottom: 16,
  },
  accessStateTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 19,
    color: dark.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  accessStateCopy: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: dark.textMuted,
    textAlign: 'center',
    maxWidth: 280,
  },
  accessButton: {
    marginTop: 22,
    borderRadius: 14,
    backgroundColor: dark.green,
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  accessButtonText: { fontFamily: fonts.bodyBold, fontSize: 14, color: '#0B0F1A' },
  offerCard: {
    width: '100%',
    borderWidth: 1,
    borderColor: dark.border,
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
    backgroundColor: dark.surfaceRaised,
  },
  offerCardSelected: { borderColor: dark.green },
  offerTitle: { color: dark.textPrimary, fontFamily: fonts.displayBold, fontSize: 16 },
  offerPrice: { color: dark.textMuted, fontFamily: fonts.body, fontSize: 14, marginTop: 4 },
  hoursInput: {
    width: '100%',
    marginTop: 10,
    borderWidth: 1,
    borderColor: dark.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: dark.textPrimary,
    fontFamily: fonts.body,
    backgroundColor: dark.surfaceRaised,
  },

  /* Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: dark.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: dark.border,
    padding: 18,
  },
  modalTitle: { fontFamily: fonts.displayBold, fontSize: 18, color: dark.textPrimary, marginBottom: 6 },
  modalMeta: { fontFamily: fonts.body, fontSize: 13, color: dark.textMuted, marginBottom: 14 },
  modalLabel: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: dark.textPrimary, marginBottom: 6 },
  modalInput: {
    borderWidth: 1,
    borderColor: dark.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 96,
    textAlignVertical: 'top',
    color: dark.textPrimary,
    backgroundColor: dark.surfaceRaised,
    fontFamily: fonts.body,
    marginBottom: 14,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalSecondary: {
    borderWidth: 1,
    borderColor: dark.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  modalSecondaryText: { color: dark.textPrimary, fontFamily: fonts.bodyBold, fontSize: 13 },
  modalPrimary: {
    backgroundColor: dark.green,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  modalPrimaryText: { color: '#0B0F1A', fontFamily: fonts.bodyBold, fontSize: 13 },
  error: { color: dark.coral, fontFamily: fonts.bodyMedium, marginBottom: 10 },
  disabled: { opacity: 0.5 },
})
