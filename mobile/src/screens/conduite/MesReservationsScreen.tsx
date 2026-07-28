import { useCallback, useState } from 'react'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { CalendarCheck, Check } from 'lucide-react-native'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import {
  fetchMyReservations,
  ReservationError,
  type ReservationItem,
} from '../../api/reservations'
import { DarkScreen } from '../../components/DarkScreen'
import { PageNavbar } from '../../components/PageNavbar'
import { ScreenLoader } from '../../components/ScreenLoader'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import type { RootStackParamList } from '../../navigation/types'
import { dark, fonts } from '../../theme'

type Nav = NativeStackNavigationProp<RootStackParamList, 'MesReservations'>

function formatDateLabel(date: string) {
  try {
    return new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  } catch {
    return date
  }
}

function estimateHours(start: string, end: string) {
  const [sh, sm] = start.split(':').map((v) => parseInt(v, 10) || 0)
  const [eh, em] = end.split(':').map((v) => parseInt(v, 10) || 0)
  const raw = eh - sh + (em - sm) / 60
  return Math.max(0.5, Math.round(raw * 2) / 2)
}

function statusLabel(item: ReservationItem) {
  if (item.status === 'confirmed' && item.paymentStatus === 'paid') return 'Confirmée'
  if (item.status === 'pending_payment') return 'Paiement en cours'
  return item.status
}

export function MesReservationsScreen() {
  const navigation = useNavigation<Nav>()
  const { user, loading } = useRequireAuth(navigation)
  const [items, setItems] = useState<ReservationItem[]>([])
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      const data = await fetchMyReservations()
      setItems(data.reservations)
    } catch (err) {
      setError(err instanceof ReservationError ? err.message : 'Chargement impossible')
    } finally {
      setBusy(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load]),
  )

  if (loading || !user) return <ScreenLoader />

  const confirmed = items.filter(
    (item) => item.status === 'confirmed' || item.paymentStatus === 'paid',
  )
  const pending = items.filter(
    (item) => item.status === 'pending_payment' && item.paymentStatus !== 'paid',
  )

  return (
    <DarkScreen>
      <PageNavbar
        title="Mes réservations"
        icon={CalendarCheck}
        onBack={() => navigation.goBack()}
        tone="drive"
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {busy ? <ActivityIndicator color={dark.green} style={{ marginVertical: 20 }} /> : null}

        {!busy && items.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Aucune réservation</Text>
            <Text style={styles.emptyText}>
              Vos séances confirmées apparaîtront ici après réservation.
            </Text>
            <Pressable
              style={styles.primaryBtn}
              onPress={() => navigation.navigate('ReservationFlow')}
            >
              <Text style={styles.primaryBtnText}>Réserver une séance</Text>
            </Pressable>
          </View>
        ) : null}

        {confirmed.length > 0 ? (
          <View>
            <Text style={styles.section}>Confirmées</Text>
            {confirmed.map((item) => {
              const hours =
                item.creneau
                  ? estimateHours(item.creneau.startTime, item.creneau.endTime)
                  : 0
              return (
                <Pressable
                  key={item.id}
                  style={styles.card}
                  onPress={() =>
                    navigation.navigate('ReservationConfirm', {
                      reservationId: item.id,
                      moniteurName: item.moniteur?.fullName || 'Moniteur',
                      vehicleBrand: item.moniteur?.vehicleBrand || '',
                      date: item.creneau?.date || '',
                      startTime: item.creneau?.startTime || '',
                      endTime: item.creneau?.endTime || '',
                      hours,
                      priceFcfa: item.priceFcfa || item.creneau?.priceFcfa || 0,
                      paymentMethod: 'solde',
                      fromList: true,
                    })
                  }
                >
                  <View style={styles.badge}>
                    <Check size={14} color="#0B0F1A" />
                    <Text style={styles.badgeText}>{statusLabel(item)}</Text>
                  </View>
                  <Text style={styles.cardTitle}>
                    {item.creneau ? formatDateLabel(item.creneau.date) : 'Séance'}
                  </Text>
                  <Text style={styles.cardLine}>
                    {item.creneau
                      ? `${item.creneau.startTime} – ${item.creneau.endTime}`
                      : '—'}
                    {hours > 0 ? ` · ${hours} h` : ''}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {item.moniteur?.fullName || 'Moniteur'}
                    {item.moniteur?.vehicleBrand ? ` · ${item.moniteur.vehicleBrand}` : ''}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        ) : null}

        {pending.length > 0 ? (
          <View>
            <Text style={styles.section}>En attente de paiement</Text>
            {pending.map((item) => (
              <View key={item.id} style={[styles.card, styles.cardPending]}>
                <Text style={styles.cardTitle}>
                  {item.creneau ? formatDateLabel(item.creneau.date) : 'Séance'}
                </Text>
                <Text style={styles.cardLine}>
                  {item.creneau
                    ? `${item.creneau.startTime} – ${item.creneau.endTime}`
                    : '—'}
                </Text>
                <Text style={styles.cardMeta}>
                  {item.moniteur?.fullName || 'Moniteur'} · {statusLabel(item)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </DarkScreen>
  )
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 32, gap: 8 },
  section: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: dark.textPrimary,
    marginTop: 8,
    marginBottom: 10,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.surface,
    padding: 14,
    marginBottom: 10,
    gap: 4,
  },
  cardPending: {
    opacity: 0.9,
    borderColor: dark.coral,
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: dark.green,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 6,
  },
  badgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: '#0B0F1A',
  },
  cardTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: dark.textPrimary,
    textTransform: 'capitalize',
  },
  cardLine: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: dark.green,
  },
  cardMeta: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: dark.textMuted,
  },
  empty: { alignItems: 'center', paddingTop: 40, gap: 10 },
  emptyTitle: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 20,
    color: dark.textPrimary,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: dark.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  primaryBtn: {
    marginTop: 12,
    backgroundColor: dark.green,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  primaryBtnText: {
    color: '#0B0F1A',
    fontFamily: fonts.displayBold,
    fontSize: 15,
  },
  error: {
    color: dark.coral,
    fontFamily: fonts.bodySemiBold,
    marginBottom: 8,
  },
})
