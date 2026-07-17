import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { LinearGradient } from 'expo-linear-gradient'
import * as WebBrowser from 'expo-web-browser'
import { Check, CreditCard, Crown, History, Lock, RefreshCw } from 'lucide-react-native'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import {
  fetchPaymentStatus,
  fetchSubscriptionMe,
  fetchSubscriptionPlans,
  subscribeToPlan,
  syncPaymentStatus,
  SubscriptionError,
  type PaymentTransaction,
  type SubscriptionAccess,
  type SubscriptionPlan,
} from '../api/subscriptions'
import { Bouncy } from '../components/Bouncy'
import { DarkScreen } from '../components/DarkScreen'
import { PageNavbar } from '../components/PageNavbar'
import { ScreenLoader } from '../components/ScreenLoader'
import { useRequireAuth } from '../hooks/useRequireAuth'
import type { RootStackParamList } from '../navigation/types'
import { dark, fonts, gradients } from '../theme'

type Nav = NativeStackNavigationProp<RootStackParamList, 'Abonnement'>

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(value))
    : '—'
}

function formatDateTime(value: string | null | undefined) {
  return value
    ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(value),
      )
    : '—'
}

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(price)
}

function paymentStatusLabel(status: PaymentTransaction['status']) {
  switch (status) {
    case 'approved':
      return 'Payé'
    case 'declined':
      return 'Refusé'
    case 'canceled':
      return 'Annulé'
    case 'failed':
      return 'Échoué'
    default:
      return 'En cours de traitement'
  }
}

export function AbonnementScreen() {
  const navigation = useNavigation<Nav>()
  const { user, loading: authLoading } = useRequireAuth(navigation)
  const [access, setAccess] = useState<SubscriptionAccess | null>(null)
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(null)
  const [trackingPaymentId, setTrackingPaymentId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [currentAccess, catalog] = await Promise.all([
        fetchSubscriptionMe(),
        fetchSubscriptionPlans(),
      ])
      setAccess(currentAccess)
      setPlans(catalog)
      return currentAccess
    } catch (err) {
      setError(err instanceof SubscriptionError ? err.message : 'Chargement impossible')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const applyPaymentResult = useCallback(
    (payment: PaymentTransaction, nextAccess: SubscriptionAccess) => {
      setAccess(nextAccess)
      if (payment.status === 'approved') {
        setSuccess('Paiement confirmé. Votre abonnement est maintenant actif.')
        setError(null)
        setTrackingPaymentId(null)
        stopPolling()
        return
      }
      if (payment.status === 'declined' || payment.status === 'canceled' || payment.status === 'failed') {
        setError(
          payment.errorMessage ||
            'Le paiement n’a pas abouti. Vous pouvez réessayer avec Mobile Money.',
        )
        setSuccess(null)
        setTrackingPaymentId(null)
        stopPolling()
        return
      }
      setTrackingPaymentId(payment.id)
      setSuccess('Paiement en cours de traitement. Confirmation Mobile Money en attente…')
    },
    [stopPolling],
  )

  const pollPayment = useCallback(
    (paymentId: string) => {
      setTrackingPaymentId(paymentId)
      stopPolling()
      pollRef.current = setInterval(() => {
        void (async () => {
          try {
            const result = await fetchPaymentStatus(paymentId)
            applyPaymentResult(result.payment, result.access)
          } catch {
            /* ignore */
          }
        })()
      }, 4000)
    },
    [applyPaymentResult, stopPolling],
  )

  useEffect(() => {
    if (user) void load()
  }, [user, load])

  useEffect(() => () => stopPolling(), [stopPolling])

  const openCheckout = async (payment: PaymentTransaction) => {
    if (!payment.paymentUrl) {
      setError('Lien de paiement FedaPay indisponible. Réessayez dans un instant.')
      return
    }
    setTrackingPaymentId(payment.id)
    setSuccess('Paiement en cours de traitement. Confirmation Mobile Money en attente…')
    await WebBrowser.openBrowserAsync(payment.paymentUrl)
    try {
      const result = await syncPaymentStatus(payment.id)
      applyPaymentResult(result.payment, result.access)
      if (result.payment.status === 'pending') pollPayment(payment.id)
    } catch (err) {
      setError(err instanceof SubscriptionError ? err.message : 'Vérification du paiement impossible')
      pollPayment(payment.id)
    }
  }

  const subscribe = async (planId: string) => {
    setSubscribingPlanId(planId)
    setError(null)
    setSuccess(null)
    try {
      const result = await subscribeToPlan(planId)
      setAccess(result.access)
      setSuccess(result.message)
      await openCheckout(result.payment)
    } catch (err) {
      setError(err instanceof SubscriptionError ? err.message : 'Souscription impossible')
    } finally {
      setSubscribingPlanId(null)
    }
  }

  const resumePayment = async () => {
    const payment = access?.latestPayment
    if (payment?.paymentUrl && payment.status === 'pending') {
      await openCheckout(payment)
      return
    }
    setError('Aucun paiement à reprendre. Choisissez une offre pour payer.')
  }

  const refreshPayment = async () => {
    const paymentId = trackingPaymentId || access?.latestPayment?.id
    if (!paymentId) {
      await load()
      return
    }
    try {
      const result = await syncPaymentStatus(paymentId)
      applyPaymentResult(result.payment, result.access)
      if (result.payment.status === 'pending') pollPayment(paymentId)
    } catch (err) {
      setError(err instanceof SubscriptionError ? err.message : 'Actualisation impossible')
    }
  }

  if (authLoading || !user) return <ScreenLoader />

  const active = access?.subscription
  const pending = access?.pendingSubscription
  const latestPayment = access?.latestPayment
  const payments = access?.payments || []
  const paymentPending = latestPayment?.status === 'pending'
  const paymentFailed =
    latestPayment &&
    (latestPayment.status === 'declined' ||
      latestPayment.status === 'canceled' ||
      latestPayment.status === 'failed')

  return (
    <DarkScreen>
        <PageNavbar
          title="Mon abonnement"
          icon={CreditCard}
          onBack={() => navigation.navigate('Home')}
        />
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.introRow}>
            <Text style={styles.intro}>
              Choisis une formule et paie par Mobile Money (MTN ou Moov).
            </Text>
            <Bouncy scaleTo={0.96} onPress={() => navigation.navigate('HistoriquePaiements')}>
              <View style={styles.historyBtn}>
                <History size={15} color={dark.green} />
                <Text style={styles.historyBtnText}>Historique</Text>
              </View>
            </Bouncy>
          </View>

          {loading ? (
            <View style={styles.empty}>
              <ActivityIndicator color={dark.green} />
              <Text style={styles.emptyText}>Chargement de votre abonnement…</Text>
            </View>
          ) : (
            <>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              {success ? <Text style={styles.success}>{success}</Text> : null}

              {active ? (
                <LinearGradient
                  colors={gradients.greenDeep}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.statusCard, styles.statusCardActive]}
                >
                  <View style={styles.crownBadge}>
                    <Crown size={16} color={'#0B0F1A'} />
                  </View>
                  <Text style={styles.kickerOnColor}>Abonnement actif</Text>
                  <Text style={styles.statusTitleOnColor}>{active.planName}</Text>
                  <Text style={styles.statusCopyOnColor}>Valable jusqu’au {formatDate(active.endAt)}.</Text>
                  <View style={styles.rights}>
                    {active.accessCode ? <Right label="Code" onColor /> : null}
                    {active.accessConduite ? <Right label="Conduite" onColor /> : null}
                    {active.accessECodepermis ? <Right label="E-Codepermis" onColor /> : null}
                    {active.accessAiChat ? <Right label="Chat IA" onColor /> : null}
                  </View>
                </LinearGradient>
              ) : (
              <View style={styles.statusCard}>
                {pending ? (
                  <>
                    <Text style={styles.kicker}>
                      {paymentPending || trackingPaymentId
                        ? 'Paiement en cours'
                        : paymentFailed
                          ? 'Paiement non abouti'
                          : 'En attente de paiement'}
                    </Text>
                    <Text style={styles.statusTitle}>{pending.planName}</Text>
                    <Text style={styles.statusCopy}>
                      {paymentPending || trackingPaymentId
                        ? 'Validez le paiement sur votre téléphone (MTN / Moov). L’abonnement s’activera automatiquement.'
                        : paymentFailed
                          ? latestPayment?.errorMessage ||
                            'Le paiement a échoué ou a été annulé. Vous pouvez réessayer.'
                          : 'Appuyez sur Payer pour ouvrir le checkout FedaPay sécurisé.'}
                    </Text>
                    <View style={styles.actions}>
                      {paymentPending && latestPayment?.paymentUrl ? (
                        <Bouncy onPress={() => void resumePayment()} scaleTo={0.97}>
                          <LinearGradient
                            colors={gradients.green}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.subscribeButton}
                          >
                            <Text style={styles.subscribeText}>Reprendre le paiement</Text>
                          </LinearGradient>
                        </Bouncy>
                      ) : null}
                      <Pressable
                        style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]}
                        onPress={() => void refreshPayment()}
                      >
                        <RefreshCw size={16} color={dark.textPrimary} />
                        <Text style={styles.outlineText}>Actualiser le statut</Text>
                      </Pressable>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.lockIcon}><Lock size={26} color={dark.textMuted} /></View>
                    <Text style={styles.statusTitle}>Vos parcours sont verrouillés</Text>
                    <Text style={styles.statusCopy}>
                      Souscrivez à une offre et payez par Mobile Money pour accéder au code et à la conduite.
                    </Text>
                  </>
                )}
              </View>
              )}

              <Text style={styles.catalogTitle}>Nos offres</Text>
              {plans.length === 0 ? (
                <Text style={styles.noPlans}>Aucune offre n’est disponible pour le moment.</Text>
              ) : (
                <View style={styles.planList}>
                  {plans.map((plan) => {
                    const isCurrentPending = pending && String(pending.planId) === String(plan.id)
                    const freeOfferBlocked = plan.isFreeOffer && access?.freeOfferUsed && !isCurrentPending
                    return (
                      <View key={plan.id} style={styles.plan}>
                        <View style={styles.planHeader}>
                          <View style={styles.planCopy}>
                            <Text style={styles.planName}>{plan.name}</Text>
                            {plan.description ? (
                              <Text style={styles.planDescription}>{plan.description}</Text>
                            ) : null}
                            <Text style={styles.duration}>{plan.durationLabel}</Text>
                          </View>
                          <Text style={styles.price}>{formatPrice(plan.price, plan.currency)}</Text>
                        </View>
                        <View style={styles.planRights}>
                          {plan.accessCode ? <Right label="Code" /> : null}
                          {plan.accessConduite ? <Right label="Conduite" /> : null}
                          {plan.accessECodepermis ? <Right label="E-Codepermis" /> : null}
                          {plan.accessAiChat ? <Right label="Chat IA tuteur" /> : null}
                          {plan.heuresIncluses > 0 ? (
                            <Right label={`${plan.heuresIncluses} h de conduite`} />
                          ) : null}
                        </View>
                        {freeOfferBlocked ? (
                          <Text style={styles.freeOfferUsedText}>Offre gratuite déjà utilisée</Text>
                        ) : null}
                        <Bouncy
                          disabled={Boolean(active) || subscribingPlanId !== null || freeOfferBlocked}
                          scaleTo={0.97}
                          style={(Boolean(active) || subscribingPlanId !== null || freeOfferBlocked) && styles.disabled}
                          onPress={() => void subscribe(plan.id)}
                        >
                          <LinearGradient
                            colors={gradients.green}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.subscribeButton}
                          >
                            <Text style={styles.subscribeText}>
                              {subscribingPlanId === plan.id
                                ? plan.isFreeOffer
                                  ? 'Activation…'
                                  : 'Ouverture du paiement…'
                                : freeOfferBlocked
                                  ? 'Offre gratuite déjà utilisée'
                                  : isCurrentPending
                                    ? paymentFailed
                                      ? 'Réessayer le paiement'
                                      : plan.isFreeOffer
                                        ? 'Essayer l’offre gratuite'
                                        : 'Payer'
                                    : plan.isFreeOffer
                                      ? 'Essayer l’offre gratuite'
                                      : 'Payer'}
                            </Text>
                          </LinearGradient>
                        </Bouncy>
                      </View>
                    )
                  })}
                </View>
              )}

              {payments.length > 0 ? (
                <Bouncy scaleTo={0.98} style={styles.historyLinkWrap} onPress={() => navigation.navigate('HistoriquePaiements')}>
                  <View style={styles.historyLink}>
                    <History size={16} color={dark.green} />
                    <Text style={styles.historyLinkText}>Voir tout l’historique des paiements</Text>
                  </View>
                </Bouncy>
              ) : null}
            </>
          )}
        </ScrollView>
      </DarkScreen>
  )
}

function Right({ label, onColor }: { label: string; onColor?: boolean }) {
  return (
    <View style={styles.right}>
      <Check size={15} color={onColor ? '#FFFFFF' : dark.green} />
      <Text style={[styles.rightText, onColor && styles.rightTextOnColor]}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 22, paddingBottom: 40, paddingTop: 8 },
  intro: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: dark.textMuted,
  },
  empty: { alignItems: 'center', gap: 12, paddingVertical: 44 },
  emptyText: {
    color: dark.textMuted,
    fontSize: 15,
    fontFamily: fonts.body,
  },
  error: { color: dark.coral, marginBottom: 12, fontFamily: fonts.body },
  success: { color: dark.green, marginBottom: 12, fontFamily: fonts.body },
  statusCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.surface,
    padding: 18,
    marginBottom: 28,
  },
  statusCardActive: {
    borderWidth: 0,
    shadowColor: dark.green,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 5,
  },
  crownBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: dark.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: {
    fontFamily: fonts.displayBold,
    fontSize: 12,
    color: dark.green,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  kickerOnColor: {
    fontFamily: fonts.displayBold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  statusTitle: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 22,
    color: dark.textPrimary,
    marginBottom: 8,
  },
  statusTitleOnColor: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 22,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  statusCopy: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: dark.textMuted,
  },
  statusCopyOnColor: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.85)',
  },
  lockIcon: { marginBottom: 12 },
  rights: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  rightText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: dark.textPrimary,
  },
  rightTextOnColor: { color: '#FFFFFF' },
  actions: { gap: 10, marginTop: 16 },
  catalogTitle: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 22,
    color: dark.textPrimary,
    marginBottom: 14,
  },
  noPlans: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: dark.textMuted,
  },
  planList: { gap: 14 },
  plan: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: dark.border,
    padding: 16,
    backgroundColor: dark.surface,
  },
  planHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  planCopy: { flex: 1 },
  planName: {
    color: dark.textPrimary,
    fontFamily: fonts.displayBold,
    fontSize: 18,
  },
  planDescription: {
    color: dark.textMuted,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
  },
  duration: {
    alignSelf: 'flex-start',
    color: dark.textMuted,
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    backgroundColor: dark.surfaceRaised,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 9,
  },
  price: {
    color: dark.textPrimary,
    fontFamily: fonts.displayBold,
    fontSize: 17,
  },
  planRights: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
    marginBottom: 16,
  },
  freeOfferUsedText: {
    color: dark.coral,
    fontSize: 12,
    fontFamily: fonts.bodyBold,
    marginBottom: 8,
  },
  subscribeButton: { alignItems: 'center', borderRadius: 12, paddingVertical: 13 },
  subscribeText: {
    color: '#0B0F1A',
    fontFamily: fonts.displayBold,
    fontSize: 15,
  },
  outlineButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: dark.border,
    paddingVertical: 12,
    backgroundColor: dark.surfaceRaised,
  },
  outlineText: {
    color: dark.textPrimary,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  disabled: { opacity: 0.55 },
  pressed: { opacity: 0.88 },
  introRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 20,
  },
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: dark.surface,
    borderWidth: 1,
    borderColor: dark.border,
  },
  historyBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12.5,
    color: dark.green,
  },
  historyLinkWrap: {
    marginTop: 24,
  },
  historyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.surface,
  },
  historyLinkText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: dark.textPrimary,
  },
})
