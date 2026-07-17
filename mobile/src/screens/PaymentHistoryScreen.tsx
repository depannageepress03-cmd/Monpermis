import { useCallback, useEffect, useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { History } from 'lucide-react-native'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import {
  fetchSubscriptionMe,
  SubscriptionError,
  type PaymentTransaction,
  type SubscriptionAccess,
  type UserSubscription,
} from '../api/subscriptions'
import { DarkScreen, DarkHeader } from '../components/DarkScreen'
import { ScreenLoader } from '../components/ScreenLoader'
import { useRequireAuth } from '../hooks/useRequireAuth'
import type { RootStackParamList } from '../navigation/types'
import { dark, fonts } from '../theme'

type Nav = NativeStackNavigationProp<RootStackParamList, 'HistoriquePaiements'>

function formatDateTime(value: string | null | undefined) {
  return value
    ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(value),
      )
    : '—'
}

function formatDate(value: string | null | undefined) {
  return value
    ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(value))
    : '—'
}

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(price)
}

function paymentStatus(status: PaymentTransaction['status']) {
  switch (status) {
    case 'approved':
      return { label: 'Payé', color: dark.green, soft: dark.greenSoft }
    case 'declined':
      return { label: 'Refusé', color: dark.coral, soft: dark.coralSoft }
    case 'canceled':
      return { label: 'Annulé', color: dark.textMuted, soft: dark.surfaceRaised }
    case 'failed':
      return { label: 'Échoué', color: dark.coral, soft: dark.coralSoft }
    default:
      return { label: 'En traitement', color: '#F0B429', soft: 'rgba(240,180,41,0.14)' }
  }
}

function subscriptionStatus(status: UserSubscription['status']) {
  switch (status) {
    case 'active':
      return { label: 'Actif', color: dark.green, soft: dark.greenSoft }
    case 'expired':
      return { label: 'Expiré', color: dark.textMuted, soft: dark.surfaceRaised }
    case 'cancelled':
      return { label: 'Annulé', color: dark.textMuted, soft: dark.surfaceRaised }
    default:
      return { label: 'En attente', color: '#F0B429', soft: 'rgba(240,180,41,0.14)' }
  }
}

export function PaymentHistoryScreen() {
  const navigation = useNavigation<Nav>()
  const { user, loading: authLoading } = useRequireAuth(navigation)
  const [access, setAccess] = useState<SubscriptionAccess | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setAccess(await fetchSubscriptionMe())
    } catch (err) {
      setError(err instanceof SubscriptionError ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) void load()
  }, [user, load])

  if (authLoading || !user) return <ScreenLoader />

  const payments = access?.payments || []
  const subscriptions = access?.history || []

  return (
    <DarkScreen>
      <DarkHeader title="Historique" icon={History} onBack={() => navigation.navigate('Abonnement')} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={dark.green} />
            <Text style={styles.centerText}>Chargement de ton historique…</Text>
          </View>
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <>
            <Text style={styles.sectionLabel}>Mes abonnements</Text>
            {subscriptions.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>Aucun abonnement pour le moment.</Text>
              </View>
            ) : (
              subscriptions.map((sub) => {
                const st = subscriptionStatus(sub.status)
                return (
                  <View key={sub.id} style={styles.card}>
                    <View style={styles.cardTop}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {sub.planName}
                      </Text>
                      <View style={[styles.badge, { backgroundColor: st.soft }]}>
                        <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
                      </View>
                    </View>
                    <Text style={styles.cardMeta}>
                      {formatPrice(sub.price, sub.currency)} · {sub.durationDays} jours
                    </Text>
                    {sub.startAt ? (
                      <Text style={styles.cardMeta}>
                        Du {formatDate(sub.startAt)} au {formatDate(sub.endAt)}
                      </Text>
                    ) : (
                      <Text style={styles.cardMeta}>Créé le {formatDate(sub.createdAt)}</Text>
                    )}
                    <View style={styles.rights}>
                      {sub.accessCode ? <Text style={styles.rightPill}>Code</Text> : null}
                      {sub.accessConduite ? <Text style={styles.rightPill}>Conduite</Text> : null}
                      {sub.accessECodepermis ? <Text style={styles.rightPill}>E-Codepermis</Text> : null}
                      {sub.accessAiChat ? <Text style={styles.rightPill}>Chat IA</Text> : null}
                    </View>
                  </View>
                )
              })
            )}

            <Text style={[styles.sectionLabel, styles.secondSection]}>Mes paiements</Text>
            {payments.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>Aucun paiement enregistré.</Text>
              </View>
            ) : (
              payments.map((payment) => {
                const st = paymentStatus(payment.status)
                return (
                  <View key={payment.id} style={styles.card}>
                    <View style={styles.cardTop}>
                      <Text style={styles.cardAmount}>
                        {formatPrice(payment.amount, payment.currency)}
                      </Text>
                      <View style={[styles.badge, { backgroundColor: st.soft }]}>
                        <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
                      </View>
                    </View>
                    <Text style={styles.cardMeta}>
                      {formatDateTime(payment.createdAt)}
                      {payment.paymentMethod ? ` · ${payment.paymentMethod}` : ' · Mobile Money'}
                    </Text>
                    {payment.fedapayReference ? (
                      <Text style={styles.cardMeta}>Réf. {payment.fedapayReference}</Text>
                    ) : null}
                    {payment.errorMessage ? (
                      <Text style={styles.errorSmall}>{payment.errorMessage}</Text>
                    ) : null}
                  </View>
                )
              })
            )}
          </>
        )}
      </ScrollView>
    </DarkScreen>
  )
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 32 },
  center: { alignItems: 'center', gap: 12, paddingVertical: 44 },
  centerText: { color: dark.textMuted, fontSize: 14, fontFamily: fonts.body },
  error: { color: dark.coral, fontFamily: fonts.body, marginTop: 12 },
  sectionLabel: {
    fontFamily: fonts.display,
    fontSize: 11.5,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: dark.textMuted,
    marginBottom: 10,
  },
  secondSection: { marginTop: 26 },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.surface,
    padding: 16,
  },
  emptyText: { color: dark.textMuted, fontFamily: fonts.body, fontSize: 13 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.surface,
    padding: 14,
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 4,
  },
  cardTitle: { flex: 1, fontFamily: fonts.displayBold, fontSize: 15, color: dark.textPrimary },
  cardAmount: { fontFamily: fonts.displayBold, fontSize: 17, color: dark.textPrimary },
  cardMeta: { fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18, color: dark.textMuted },
  badge: { paddingVertical: 3, paddingHorizontal: 9, borderRadius: 999 },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 11 },
  rights: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  rightPill: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    color: dark.green,
    backgroundColor: dark.greenSoft,
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 999,
    overflow: 'hidden',
  },
  errorSmall: { color: dark.coral, fontFamily: fonts.body, fontSize: 12, marginTop: 4 },
})
