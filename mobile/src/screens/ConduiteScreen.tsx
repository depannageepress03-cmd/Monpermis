import { useCallback, useEffect, useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { LinearGradient } from 'expo-linear-gradient'
import {
  BookOpen,
  CalendarPlus,
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
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  cancelReservation,
  fetchDrivingDashboard,
  type DrivingProgress,
  type ReservationItem,
  ReservationError,
} from '../api/reservations'
import { fetchSubscriptionMe, type SubscriptionAccess } from '../api/subscriptions'
import { Bouncy } from '../components/Bouncy'
import { ProgressBar } from '../components/ProgressBar'
import { DriveModuleIcon } from '../components/ModuleIcons'
import { PageNavbar } from '../components/PageNavbar'
import { ScreenLoader } from '../components/ScreenLoader'
import { FadeUp } from '../components/FadeUp'
import { AccentBar } from '../components/AccentBar'
import { useRequireAuth } from '../hooks/useRequireAuth'
import type { RootStackParamList } from '../navigation/types'
import { brand, colors, gradients, typography } from '../theme'

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
  const [subscription, setSubscription] = useState<SubscriptionAccess | null>(null)
  const [subscriptionLoading, setSubscriptionLoading] = useState(true)

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
    void fetchSubscriptionMe()
      .then(setSubscription)
      .catch(() => setSubscription(null))
      .finally(() => setSubscriptionLoading(false))
  }, [user])

  useEffect(() => {
    if (subscription?.accessConduite) void load()
  }, [subscription, load])

  if (loading || !user) return <ScreenLoader />

  const lockedContent = subscriptionLoading ? (
    <View style={styles.accessState}>
      <Text style={styles.accessStateCopy}>Vérification de votre accès…</Text>
    </View>
  ) : !subscription?.accessConduite ? (
    <View style={styles.accessState}>
      <View style={styles.accessLock}><Lock size={32} color={brand.navyMuted} /></View>
      <Text style={styles.accessStateTitle}>Le module Conduite est verrouillé</Text>
      <Text style={styles.accessStateCopy}>
        Votre abonnement doit inclure l’accès à la Conduite.
      </Text>
      <Pressable style={styles.accessButton} onPress={() => navigation.navigate('Abonnement')}>
        <Text style={styles.accessButtonText}>Voir les offres</Text>
      </Pressable>
    </View>
  ) : null

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <FadeUp delay={0}>
          <PageNavbar
            title="Conduite"
            icon={DriveModuleIcon}
            onBack={() => navigation.navigate('Home')}
            tone="drive"
          />
        </FadeUp>

        {lockedContent ?? <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <FadeUp delay={80}>
            <View style={styles.header}>
              <AccentBar />
            </View>
          </FadeUp>

          {loadingDash ? <ActivityIndicator color={brand.green} /> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <FadeUp delay={140}>
            <View style={styles.topRow}>
              {progress ? (
                <View style={styles.progressCard}>
                  <View style={styles.progressHeadRow}>
                    <Text style={styles.progressLabel}>
                      {progress.heuresEffectuees} / {progress.heuresObjectif} h
                    </Text>
                    <View style={styles.progressPct}>
                      <Text style={styles.progressPctText}>{Math.round(progress.percent)}%</Text>
                    </View>
                  </View>
                  <ProgressBar progress={progress.percent / 100} color={brand.green} height={10} />
                  <Text style={styles.progressMeta}>
                    Solde disponible : {progress.soldeHeures} h
                  </Text>
                </View>
              ) : null}

              <View style={[styles.upcomingBlock, !progress && styles.upcomingBlockFull]}>
                <Text style={styles.upcomingTitle}>Mes réservations</Text>
                {upcoming.length === 0 ? (
                  <Text style={styles.upcomingEmpty}>Aucune séance réservée pour le moment.</Text>
                ) : (
                  upcoming.map((item) => (
                    <View key={String(item.id)} style={styles.upcomingItem}>
                      <Text style={styles.upcomingItemTitle}>
                        {item.creneau
                          ? `${item.creneau.date} · ${item.creneau.startTime}`
                          : 'Séance'}
                      </Text>
                      <Text style={styles.upcomingItemMeta}>
                        {item.moniteur?.fullName || 'Moniteur'} · {statusLabel(item)}
                      </Text>
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
              </View>
            </View>
          </FadeUp>

          <FadeUp delay={170}>
            <View style={styles.actionsRow}>
              <Bouncy style={styles.actionBtnWrap} scaleTo={0.96} onPress={() => navigation.navigate('ReservationFlow')}>
                <LinearGradient
                  colors={gradients.green}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.actionBtn}
                >
                  <View style={[styles.actionIcon, styles.actionIconReserve]}>
                    <CalendarPlus size={20} color={colors.white} />
                  </View>
                  <View style={styles.actionCopy}>
                    <Text style={styles.actionReserveTitle}>Réserver</Text>
                    <Text style={styles.actionReserveHint}>
                      Choisir un créneau avec un moniteur
                    </Text>
                  </View>
                </LinearGradient>
              </Bouncy>

              <Bouncy style={styles.actionBtnWrap} scaleTo={0.96} onPress={() => navigation.navigate('LeconsChapitres')}>
                <View style={[styles.actionBtn, styles.actionLessons]}>
                  <View style={[styles.actionIcon, styles.actionIconLessons]}>
                    <BookOpen size={20} color={brand.navy} />
                  </View>
                  <View style={styles.actionCopy}>
                    <Text style={styles.actionLessonsTitle}>Leçons</Text>
                    <Text style={styles.actionLessonsHint}>
                      Manœuvres, circulation et examen
                    </Text>
                  </View>
                </View>
              </Bouncy>
            </View>
          </FadeUp>

          <FadeUp delay={210}>
            <View style={styles.copyBlock}>
              <Text style={styles.copyTitle}>Votre parcours de conduite</Text>
              <Text style={styles.copyText}>
                Bienvenue dans l’espace conduite de Monpermis. Ici, vous suivez vos heures
                pratiques, réservez vos séances avec un moniteur et consultez les leçons
                pour progresser étape par étape jusqu’à l’examen.
              </Text>
              <Text style={styles.copyText}>
                Vous pouvez annuler une séance jusqu’à 24 h avant, en indiquant une
                justification. L’administration est informée du motif.
              </Text>
            </View>
          </FadeUp>
        </ScrollView>}
      </SafeAreaView>

      {subscription?.accessConduite && <Modal
        visible={Boolean(cancelTarget)}
        transparent
        animationType="fade"
        onRequestClose={() => !cancelling && setCancelTarget(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => !cancelling && setCancelTarget(null)}
        >
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
              placeholderTextColor={brand.navyMuted}
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
      </Modal>}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  safe: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 28,
  },
  header: { marginBottom: 18 },
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
    backgroundColor: `${brand.navy}08`,
    marginBottom: 16,
  },
  accessStateTitle: {
    ...typography.h4,
    color: brand.navy,
    textAlign: 'center',
    marginBottom: 8,
  },
  accessStateCopy: {
    ...typography.bodySmall,
    color: brand.navyMuted,
    textAlign: 'center',
    maxWidth: 280,
  },
  accessButton: {
    marginTop: 20,
    borderRadius: 12,
    backgroundColor: brand.green,
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  accessButtonText: { ...typography.button, color: colors.white },
  progressCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${brand.navy}12`,
    backgroundColor: '#F8FAFC',
    padding: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
    marginBottom: 16,
  },
  progressHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  progressLabel: { fontSize: 13, fontWeight: '700', color: brand.navy },
  progressPct: {
    backgroundColor: brand.greenLight,
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  progressPctText: { fontSize: 11, fontWeight: '800', color: brand.green },
  progressMeta: { marginTop: 8, ...typography.caption, color: brand.navyMuted },
  upcomingBlock: {
    flex: 1,
    marginBottom: 0,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${brand.navy}12`,
    backgroundColor: '#F8FAFC',
    padding: 14,
  },
  upcomingBlockFull: { flex: 1 },
  upcomingTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: brand.navy,
    marginBottom: 8,
  },
  upcomingEmpty: { ...typography.caption, color: brand.navyMuted, lineHeight: 18 },
  upcomingItem: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${brand.navy}10`,
    backgroundColor: colors.white,
    padding: 10,
    marginBottom: 6,
  },
  upcomingItemTitle: { fontSize: 13, fontWeight: '700', color: brand.navy },
  upcomingItemMeta: { marginTop: 2, fontSize: 11, color: brand.navyMuted },
  cancelLink: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(185,28,28,0.35)',
  },
  cancelLinkText: { color: '#B91C1C', fontSize: 11, fontWeight: '700' },
  copyBlock: {
    marginBottom: 8,
    gap: 12,
  },
  copyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: brand.navy,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  copyText: {
    fontSize: 15,
    lineHeight: 23,
    color: brand.navyMuted,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
    marginBottom: 18,
  },
  actionBtnWrap: {
    flex: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    minHeight: 76,
    shadowColor: brand.navy,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconReserve: {
    backgroundColor: 'rgba(255,255,255,0.24)',
  },
  actionIconLessons: {
    backgroundColor: `${brand.gold}55`,
  },
  actionCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  actionReserveTitle: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
  actionReserveHint: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500',
  },
  actionLessons: {
    backgroundColor: brand.goldLight,
    borderWidth: 1,
    borderColor: `${brand.gold}55`,
  },
  actionLessonsTitle: {
    color: brand.navy,
    fontSize: 15,
    fontWeight: '800',
  },
  actionLessonsHint: {
    color: brand.navyMuted,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,16,48,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 18,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: brand.navy,
    marginBottom: 6,
  },
  modalMeta: {
    fontSize: 13,
    color: brand.navyMuted,
    marginBottom: 14,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: brand.navy,
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: `${brand.navy}18`,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 96,
    textAlignVertical: 'top',
    color: brand.navy,
    marginBottom: 14,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalSecondary: {
    borderWidth: 1,
    borderColor: `${brand.navy}22`,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  modalSecondaryText: { color: brand.navy, fontWeight: '700' },
  modalPrimary: {
    backgroundColor: brand.green,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  modalPrimaryText: { color: colors.white, fontWeight: '800' },
  error: { color: '#B91C1C', marginBottom: 10 },
  pressed: { opacity: 0.88 },
  disabled: { opacity: 0.55 },
})
