import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import {
  createReservation,
  requestReservationSlot,
  ReservationError,
  syncReservationPayment,
  type MobileMoneyOperator,
  type ReservationItem,
} from '../api/reservations'
import {
  AccessRequestError,
  fetchAccessMe,
  redeemPromoCode,
} from '../api/accessRequests'
import { dark, fonts } from '../theme'
import { guessOperator } from '../utils/guessOperator'
import { formatPrice } from '../utils/money'
import { friendlyPaymentError } from '../utils/fedapayErrors'
import { PAYMENT_OPERATORS, paymentOperatorLabel } from '../utils/paymentOperators'

/** Seul pays desservi : envoyé au serveur sans étape de sélection. */
const COUNTRY = 'BJ'

export interface ReservationCheckoutSlot {
  moniteurId: string
  date: string
  startTime: string
  endTime: string
  vehicleType: string
  creneauId?: string
  lockedUntil?: string | null
  hours?: number
  amount?: number
}

interface SoldeSuccessResult {
  reservations?: ReservationItem[]
  reservation?: ReservationItem
  whatsappLink?: string
}

interface Props {
  visible: boolean
  label: string
  amount: number
  slot: ReservationCheckoutSlot
  hoursNeeded: number
  defaultPhone?: string
  holdLabel?: string | null
  holdExpired?: boolean
  holdUrgent?: boolean
  onClose: () => void
  onSuccess: (reservations: ReservationItem[]) => void
  onSoldeSuccess: (result: SoldeSuccessResult) => void
}

export function ReservationMobileMoneyCheckout({
  visible,
  label,
  amount,
  slot,
  hoursNeeded,
  defaultPhone = '',
  holdLabel = null,
  holdExpired = false,
  holdUrgent = false,
  onClose,
  onSuccess,
  onSoldeSuccess,
}: Props) {
  const [step, setStep] = useState<'intro' | 'operator' | 'phone' | 'waiting'>('intro')
  const [operator, setOperator] = useState<MobileMoneyOperator | null>(null)
  const [phone, setPhone] = useState(defaultPhone)
  const [promoCode, setPromoCode] = useState('')
  const [soldeHeures, setSoldeHeures] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [promoBusy, setPromoBusy] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [pendingGroupId, setPendingGroupId] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!visible) return
    setStep('intro')
    setOperator(null)
    setPhone(defaultPhone)
    setPromoCode('')
    setError(null)
    setSuccess(null)
    setBusy(false)
    setPromoBusy(false)
    setVerifying(false)
    setPendingGroupId(null)
    fetchAccessMe()
      .then((data) => setSoldeHeures(data.user.soldeHeures))
      .catch(() => setSoldeHeures(null))
  }, [visible, defaultPhone])

  useEffect(
    () => () => {
      if (pollRef.current) clearInterval(pollRef.current)
    },
    [],
  )

  const canPayWithSolde = soldeHeures !== null && soldeHeures >= hoursNeeded

  const stopPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  const startPoll = (bookingGroupId: string) => {
    stopPoll()
    setPendingGroupId(bookingGroupId)
    let ticks = 0
    let approvedSeenAt: number | null = null
    const tick = async () => {
      ticks += 1
      try {
        const result = await syncReservationPayment(bookingGroupId)
        const reservations = result.reservations || []
        const allConfirmed =
          result.confirmed === true ||
          (reservations.length > 0 && reservations.every((item) => item.status === 'confirmed'))

        // Paiement OK + rendez-vous confirmé (créneau garanti côté serveur).
        if (result.payment.status === 'approved' && allConfirmed) {
          stopPoll()
          setSuccess('Paiement confirmé. Ton rendez-vous est réservé et garanti.')
          setBusy(false)
          onSuccess(reservations)
          return
        }

        // Paiement encaissé mais confirmation créneau encore en cours — on insiste.
        if (result.payment.status === 'approved') {
          approvedSeenAt = approvedSeenAt ?? ticks
          setSuccess('Paiement reçu. Confirmation du créneau…')
          if (ticks - approvedSeenAt >= 8) {
            stopPoll()
            setBusy(false)
            if (reservations.some((item) => item.status === 'confirmed')) {
              onSuccess(reservations.filter((item) => item.status === 'confirmed'))
              return
            }
            setError(
              'Paiement reçu mais confirmation du créneau incomplète. Ouvre « Mes réservations » ou contacte le support.',
            )
            setStep('phone')
          }
          return
        }

        if (['declined', 'failed', 'canceled'].includes(result.payment.status)) {
          stopPoll()
          setBusy(false)
          setSuccess(null)
          setError(friendlyPaymentError(result.payment.errorMessage, 'Le paiement n’a pas abouti. Réessaie.'))
          setStep('phone')
        }
      } catch {
        /* ignore */
      }
      if (ticks >= 60) {
        stopPoll()
        setBusy(false)
        setError('Confirmation trop longue. Si tu as validé sur ton téléphone, appuie sur « J’ai payé, vérifier ».')
      }
    }
    void tick()
    pollRef.current = setInterval(() => {
      void tick()
    }, 2000)
  }

  const verifyPaid = async () => {
    if (!pendingGroupId) return
    setVerifying(true)
    setError(null)
    try {
      const result = await syncReservationPayment(pendingGroupId)
      const reservations = result.reservations || []
      const allConfirmed =
        result.confirmed === true ||
        (reservations.length > 0 && reservations.every((item) => item.status === 'confirmed'))
      if (result.payment.status === 'approved' && allConfirmed) {
        stopPoll()
        setBusy(false)
        setVerifying(false)
        onSuccess(reservations)
        return
      }
      if (['declined', 'failed', 'canceled'].includes(result.payment.status)) {
        stopPoll()
        setBusy(false)
        setVerifying(false)
        setError(friendlyPaymentError(result.payment.errorMessage, 'Le paiement n’a pas abouti. Réessaie.'))
        setStep('phone')
        return
      }
      setSuccess('Paiement pas encore confirmé. Valide la notification, puis réessaie.')
    } catch {
      setError('Vérification temporairement indisponible. Réessaie dans un instant.')
    } finally {
      setVerifying(false)
    }
  }

  const applyPromo = async () => {
    const trimmed = promoCode.trim()
    if (!trimmed) {
      setError('Saisis un code promo')
      return
    }
    setPromoBusy(true)
    setError(null)
    setSuccess(null)
    try {
      const result = await redeemPromoCode(trimmed)
      const nextSolde = result.access.user.soldeHeures
      setSoldeHeures(nextSolde)
      if (nextSolde >= hoursNeeded) {
        setSuccess(
          `Code promo appliqué. Solde : ${nextSolde} h — tu peux valider sans Mobile Money.`,
        )
      } else {
        setSuccess(
          `Code promo appliqué. Solde : ${nextSolde} h (il manque encore des heures pour cette séance).`,
        )
      }
    } catch (err) {
      setError(
        err instanceof AccessRequestError ? err.message : 'Code promo invalide ou déjà utilisé',
      )
    } finally {
      setPromoBusy(false)
    }
  }

  const confirmWithSolde = async () => {
    setBusy(true)
    setError(null)
    try {
      let creneauId = slot.creneauId
      if (!creneauId) {
        const lockedSlot = await requestReservationSlot({
          moniteurId: slot.moniteurId,
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          vehicleType: slot.vehicleType,
        })
        creneauId = String(lockedSlot.creneau.id)
      }
      const result = await createReservation({
        creneauIds: [creneauId],
        vehicleType: slot.vehicleType,
        moniteurId: slot.moniteurId,
        paymentMethod: 'solde',
      })
      onSoldeSuccess(result)
    } catch (err) {
      setBusy(false)
      setError(err instanceof ReservationError ? err.message : 'Réservation impossible')
    }
  }

  const submit = async () => {
    if (!operator) {
      setError('Choisis un réseau Mobile Money')
      return
    }
    const phoneDigits = phone.replace(/\D/g, '')
    const detected = guessOperator(phone)
    if (detected && detected !== operator) {
      setError(
        `Ce numéro est un numéro ${detected.toUpperCase()}. Choisis ${detected.toUpperCase()} (pas ${operator.toUpperCase()}).`,
      )
      setOperator(detected)
      return
    }
    if (!phoneDigits || phoneDigits.length < 8) {
      setError(
        'Indique un numéro Mobile Money valide (ex. 0147880143). Ajoute-le aussi dans ton profil.',
      )
      return
    }
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      let creneauId = slot.creneauId
      if (!creneauId) {
        const lockedSlot = await requestReservationSlot({
          moniteurId: slot.moniteurId,
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          vehicleType: slot.vehicleType,
        })
        creneauId = String(lockedSlot.creneau.id)
      }

      const chosenOperator = detected || operator
      const result = await createReservation({
        creneauIds: [creneauId],
        vehicleType: slot.vehicleType,
        moniteurId: slot.moniteurId,
        paymentMethod: 'mobile_money',
        operator: chosenOperator,
        phone: phoneDigits,
        country: COUNTRY,
      })
      setOperator(chosenOperator)
      setStep('waiting')
      setSuccess(result.message || 'Demande envoyée. Valide sur ton téléphone.')
      startPoll(result.bookingGroupId)
    } catch (err) {
      setBusy(false)
      setStep('phone')
      if (err instanceof ReservationError) {
        setError(err.message)
        if (err.code === 'OPERATOR_MISMATCH') {
          const expected = guessOperator(phone)
          if (expected) setOperator(expected)
        }
      } else {
        setError('Paiement impossible. Vérifie le numéro et réessaie.')
      }
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Paiement</Text>
            <Pressable onPress={onClose} disabled={busy && step === 'waiting'}>
              <Text style={styles.close}>Fermer</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            {holdLabel || holdExpired ? (
              <Text
                style={[
                  styles.holdBanner,
                  holdUrgent && styles.holdUrgent,
                  holdExpired && styles.holdExpired,
                ]}
              >
                {holdExpired
                  ? 'Créneau libéré — choisis un autre horaire.'
                  : `Créneau réservé pour toi : ${holdLabel}`}
              </Text>
            ) : null}
            <View style={styles.line}>
              <Text style={styles.lineLabel}>{label}</Text>
              <Text style={styles.lineAmount}>{formatPrice(amount)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalAmount}>{formatPrice(amount)}</Text>
            </View>

            <View style={styles.promoBox}>
              <Text style={styles.kicker}>Code promo</Text>
              <View style={styles.promoRow}>
                <TextInput
                  style={[styles.input, styles.promoInput]}
                  value={promoCode}
                  onChangeText={setPromoCode}
                  autoCapitalize="characters"
                  placeholder="Ex. PROMO2026"
                  placeholderTextColor={dark.textMuted}
                  editable={!promoBusy && !(busy && step === 'waiting')}
                />
                <Pressable
                  style={[styles.promoBtn, (promoBusy || !promoCode.trim()) && styles.disabled]}
                  disabled={promoBusy || !promoCode.trim()}
                  onPress={() => void applyPromo()}
                >
                  <Text style={styles.promoBtnText}>{promoBusy ? '…' : 'Appliquer'}</Text>
                </Pressable>
              </View>
              {soldeHeures !== null ? (
                <Text style={styles.hint}>Solde actuel : {soldeHeures} h (séance : {hoursNeeded} h)</Text>
              ) : null}
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {success ? <Text style={styles.success}>{success}</Text> : null}

            {canPayWithSolde ? (
              <Pressable
                style={[styles.payBtn, busy && styles.disabled]}
                disabled={busy}
                onPress={() => void confirmWithSolde()}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.payText}>Valider avec mon solde / code promo</Text>
                )}
              </Pressable>
            ) : null}

            {!canPayWithSolde && step === 'intro' ? (
              <View style={styles.step}>
                <Pressable style={styles.payBtn} onPress={() => setStep('operator')}>
                  <Text style={styles.payText}>Passer au paiement</Text>
                </Pressable>
              </View>
            ) : null}

            {!canPayWithSolde && step === 'operator' ? (
              <View style={styles.step}>
                <Text style={styles.kicker}>1. Réseau mobile</Text>
                {PAYMENT_OPERATORS.map((item) => (
                  <Pressable
                    key={item.id}
                    style={[styles.choice, operator === item.id && styles.choiceActive]}
                    accessibilityRole="button"
                    accessibilityLabel={item.alt}
                    onPress={() => {
                      setOperator(item.id)
                      setStep('phone')
                    }}
                  >
                    <Image source={item.logo} style={styles.choiceLogo} resizeMode="contain" />
                    <Text style={styles.choiceText}>{item.label}</Text>
                  </Pressable>
                ))}
                <Pressable style={styles.backBtn} onPress={() => setStep('intro')}>
                  <Text style={styles.backText}>Retour</Text>
                </Pressable>
              </View>
            ) : null}

            {!canPayWithSolde && (step === 'phone' || step === 'waiting') ? (
              <View style={styles.step}>
                <Text style={styles.kicker}>2. Numéro Mobile Money</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="phone-pad"
                  value={phone}
                  editable={step !== 'waiting'}
                  onChangeText={(value) => {
                    setPhone(value)
                    const detected = guessOperator(value)
                    if (detected) setOperator(detected)
                  }}
                  placeholder="01 XX XX XX XX"
                  placeholderTextColor={dark.textMuted}
                />
                {guessOperator(phone) ? (
                  <Text style={styles.hint}>
                    Réseau détecté : {paymentOperatorLabel(guessOperator(phone))} — choisis le même
                    opérateur.
                  </Text>
                ) : null}
                {step !== 'waiting' ? (
                  <Pressable style={styles.backBtn} onPress={() => setStep('operator')}>
                    <Text style={styles.backText}>Retour</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  style={[styles.payBtn, (busy || !phone.trim()) && styles.disabled]}
                  disabled={busy || !phone.trim()}
                  onPress={() => void submit()}
                >
                  {busy ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.payText}>
                      Payer {formatPrice(amount)} ({paymentOperatorLabel(operator)})
                    </Text>
                  )}
                </Pressable>
                {step === 'waiting' ? (
                  <Text style={styles.hint}>
                    Une demande de retrait a été envoyée sur {phone || 'ton téléphone'} (
                    {paymentOperatorLabel(operator)}).{'\n'}
                    Ouvre la notification MTN/Moov/Celtiis et valide avec ton code secret.
                  </Text>
                ) : null}
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  card: {
    maxHeight: '92%',
    backgroundColor: dark.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderColor: dark.border,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 8,
  },
  holdBanner: {
    color: '#065f46',
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    overflow: 'hidden',
  },
  holdUrgent: { color: '#9a3412', backgroundColor: '#fff7ed', borderColor: '#fed7aa' },
  holdExpired: { color: '#991b1b', backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  title: { color: dark.textPrimary, fontFamily: fonts.displayBold, fontSize: 20 },
  close: { color: dark.textMuted, fontFamily: fonts.bodyBold, fontSize: 14 },
  scroll: { paddingHorizontal: 18, paddingBottom: 20, gap: 10 },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  lineLabel: { flex: 1, color: dark.textMuted, fontFamily: fonts.body, fontSize: 14 },
  lineAmount: { color: dark.textPrimary, fontFamily: fonts.bodyBold, fontSize: 14 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: dark.border,
    paddingTop: 10,
    marginTop: 4,
  },
  totalLabel: { color: dark.textPrimary, fontFamily: fonts.displayBold, fontSize: 16 },
  totalAmount: { color: dark.green, fontFamily: fonts.displayExtraBold, fontSize: 18 },
  promoBox: { gap: 8, marginTop: 4 },
  promoRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  promoInput: { flex: 1 },
  promoBtn: {
    backgroundColor: dark.coral,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  promoBtnText: { color: '#fff', fontFamily: fonts.displayBold, fontSize: 13 },
  error: { color: dark.coral, fontFamily: fonts.body, fontSize: 14 },
  success: { color: dark.green, fontFamily: fonts.body, fontSize: 14 },
  step: { gap: 10, marginTop: 8 },
  kicker: {
    color: dark.green,
    fontFamily: fonts.displayBold,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: dark.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: dark.surfaceRaised,
  },
  choiceActive: { borderColor: dark.green },
  choiceLogo: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  choiceText: {
    flex: 1,
    color: dark.textPrimary,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: dark.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: dark.textPrimary,
    fontFamily: fonts.body,
    backgroundColor: dark.surfaceRaised,
  },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 8 },
  backText: { color: dark.textMuted, fontFamily: fonts.bodyBold },
  payBtn: {
    backgroundColor: dark.green,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  payText: { color: '#fff', fontFamily: fonts.displayBold, fontSize: 15 },
  disabled: { opacity: 0.55 },
  hint: { color: dark.textMuted, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
})
