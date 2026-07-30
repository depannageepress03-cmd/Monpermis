import { useCallback, useEffect, useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { History } from 'lucide-react-native'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import {
  fetchMyPayments,
  paymentChannelLabel,
  paymentStatusLabel,
  PaymentHistoryError,
  type PaymentHistoryItem,
} from '../api/payments'
import { DarkScreen, DarkHeader } from '../components/DarkScreen'
import { ScreenLoader } from '../components/ScreenLoader'
import { useRequireAuth } from '../hooks/useRequireAuth'
import type { RootStackParamList } from '../navigation/types'
import { dark, fonts } from '../theme'
import { formatPrice } from '../utils/money'

type Nav = NativeStackNavigationProp<RootStackParamList, 'HistoriquePaiements'>

function formatDate(value: string | null | undefined) {
  return value
    ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' }).format(
        new Date(value),
      )
    : '—'
}

function statusTone(status: PaymentHistoryItem['status']) {
  switch (status) {
    case 'approved':
      return { color: dark.green, soft: dark.greenSoft }
    case 'pending':
      return { color: '#F0B429', soft: 'rgba(240,180,41,0.14)' }
    case 'canceled':
      return { color: dark.textMuted, soft: dark.surfaceRaised }
    default:
      return { color: dark.coral, soft: dark.coralSoft }
  }
}

export function PaymentHistoryScreen() {
  const navigation = useNavigation<Nav>()
  const { user, loading: authLoading } = useRequireAuth(navigation)
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setPayments(await fetchMyPayments())
    } catch (err) {
      setError(err instanceof PaymentHistoryError ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) void load()
  }, [user, load])

  if (authLoading || !user) return <ScreenLoader />

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
            <Text style={styles.sectionLabel}>Abonnements et séances payés</Text>
            {payments.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  Aucun paiement pour le moment. Tes achats d’accès et tes réservations payées
                  apparaîtront ici.
                </Text>
              </View>
            ) : (
              payments.map((payment) => {
                const tone = statusTone(payment.status)
                return (
                  <View key={payment.id} style={styles.card}>
                    <View style={styles.cardTop}>
                      <Text style={styles.cardTitle} numberOfLines={2}>
                        {payment.title}
                      </Text>
                      <View style={[styles.badge, { backgroundColor: tone.soft }]}>
                        <Text style={[styles.badgeText, { color: tone.color }]}>
                          {paymentStatusLabel(payment.status)}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.cardAmount}>
                      {formatPrice(payment.amount, payment.currency)}
                    </Text>

                    <Text style={styles.cardMeta}>
                      {payment.kind === 'reservation' ? 'Séance de conduite' : 'Abonnement'}
                      {payment.moniteurName ? ` · ${payment.moniteurName}` : ''}
                      {payment.paymentMethod
                        ? ` · ${paymentChannelLabel(payment.paymentMethod)}`
                        : ''}
                    </Text>
                    <Text style={styles.cardMeta}>Le {formatDate(payment.createdAt)}</Text>

                    {payment.lines.length > 1
                      ? payment.lines.map((line, index) => (
                          <Text key={`${payment.id}-${index}`} style={styles.cardLine}>
                            • {line.label} — {formatPrice(line.amount, payment.currency)}
                          </Text>
                        ))
                      : null}

                    {payment.fedapayReference ? (
                      <Text style={styles.cardMeta}>Réf. {payment.fedapayReference}</Text>
                    ) : null}
                    {payment.errorMessage ? (
                      <Text style={styles.error}>{payment.errorMessage}</Text>
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
  scroll: { paddingHorizontal: 20, paddingBottom: 40, gap: 10 },
  center: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  centerText: { fontFamily: fonts.body, color: dark.textMuted },
  error: { fontFamily: fonts.body, color: dark.coral, marginTop: 12 },
  sectionLabel: {
    fontFamily: fonts.displayBold,
    fontSize: 13,
    color: dark.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 8,
    marginBottom: 4,
  },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.surface,
    padding: 18,
  },
  emptyText: { fontFamily: fonts.body, color: dark.textMuted, lineHeight: 20 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.surface,
    padding: 16,
    gap: 4,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1, fontFamily: fonts.displayBold, fontSize: 16, color: dark.textPrimary },
  cardAmount: { fontFamily: fonts.displayBold, fontSize: 20, color: dark.textPrimary },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontFamily: fonts.displayBold, fontSize: 12 },
  cardMeta: { fontFamily: fonts.body, fontSize: 13, color: dark.textMuted },
  cardLine: { fontFamily: fonts.body, fontSize: 13, color: dark.textMuted },
})
