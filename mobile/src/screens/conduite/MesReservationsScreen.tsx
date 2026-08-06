import { useCallback, useState } from 'react'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { CalendarCheck, Check } from 'lucide-react-native'
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
  if (item.status === 'pending_moniteur') return 'En attente du moniteur'
  if (item.status === 'confirmed') return 'Confirmée'
  if (item.status === 'pending_payment') return 'Paiement en cours'
  return item.status
}

export function MesReservationsScreen() {
  const navigation = useNavigation<Nav>()
  const { user, loading } = useRequireAuth(navigation)
  const [items, setItems] = useState<ReservationItem[]>([])
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancelTarget, setCancelTarget] = useState<ReservationItem | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)

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

  if (loading || !user) return <ScreenLoader />

  const confirmed = items.filter((item) => item.status === 'confirmed')
  const awaitingMoniteur = items.filter((item) => item.status === 'pending_moniteur')
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
                <View key={item.id} style={styles.card}>
                  <Pressable
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
                    <Text style={styles.cardLine}>{item.moniteur?.fullName || 'Moniteur'}</Text>
                  </Pressable>
                  {item.canCancel ? (
                    <Pressable
                      style={styles.cancelBtn}
                      onPress={() => {
                        setError(null)
                        setCancelReason('')
                        setCancelTarget(item)
                      }}
                    >
                      <Text style={styles.cancelBtnText}>Annuler</Text>
                    </Pressable>
                  ) : null}
                </View>
              )
            })}
          </View>
        ) : null}

        {awaitingMoniteur.length > 0 ? (
          <View style={{ marginTop: 18 }}>
            <Text style={styles.section}>En attente du moniteur</Text>
            {awaitingMoniteur.map((item) => (
              <View key={item.id} style={styles.card}>
                <Text style={styles.cardTitle}>
                  {item.creneau ? formatDateLabel(item.creneau.date) : 'Séance'}
                </Text>
                <Text style={styles.cardLine}>
                  {item.creneau ? `${item.creneau.startTime} – ${item.creneau.endTime}` : '—'}
                </Text>
                <Text style={styles.cardLine}>
                  {item.moniteur?.fullName || 'Moniteur'} · {statusLabel(item)}
                </Text>
                {item.canCancel ? (
                  <Pressable
                    style={styles.cancelBtn}
                    onPress={() => {
                      setError(null)
                      setCancelReason('')
                      setCancelTarget(item)
                    }}
                  >
                    <Text style={styles.cancelBtnText}>Annuler</Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
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
            ))}
          </View>
        ) : null}
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
  cancelLink: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingVertical: 4,
  },
  cancelLinkText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: dark.coral,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 22,
  },
  modalCard: {
    backgroundColor: dark.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: dark.border,
    padding: 18,
    gap: 8,
  },
  modalTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: dark.textPrimary,
  },
  modalMeta: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: dark.textMuted,
    marginBottom: 4,
  },
  modalLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: dark.textPrimary,
    marginTop: 4,
  },
  modalInput: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: dark.border,
    borderRadius: 12,
    padding: 12,
    color: dark.textPrimary,
    fontFamily: fonts.body,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
  },
  modalSecondary: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: dark.border,
  },
  modalSecondaryText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: dark.textPrimary,
  },
  modalPrimary: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: dark.green,
  },
  modalPrimaryText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: '#0B0F1A',
  },
  disabled: { opacity: 0.5 },
})
