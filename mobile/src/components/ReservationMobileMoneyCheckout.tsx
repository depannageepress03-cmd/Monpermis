import { useEffect, useRef, useState } from 'react'
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

const OPERATORS: { id: MobileMoneyOperator; label: string }[] = [
  { id: 'mtn', label: 'MTN' },
  { id: 'moov', label: 'Moov' },
  { id: 'celtiis', label: 'Celtiis' },
]

function guessOperator(phone: string): MobileMoneyOperator | null {
  const digits = phone.replace(/\D/g, '')
  let local = digits
  if (local.startsWith('229')) local = local.slice(3)
  if (local.length >= 10) local = local.slice(-10)
  const ezab = local.slice(0, 4)
  const mtn = new Set([
    '0142', '0146', '0150', '0151', '0152', '0153', '0154', '0156', '0157', '0159',
    '0161', '0162', '0166', '0167', '0169', '0190', '0191', '0196', '0197',
  ])
  const moov = new Set([
    '0145', '0155', '0158', '0160', '0163', '0164', '0165', '0168', '0194', '0195', '0198', '0199',
  ])
  const celtiis = new Set([
    '0120', '0121', '0122', '0123', '0124', '0128', '0129', '0140', '0141', '0143', '0144',
    '0147', '0148', '0149', '0192', '0193',
  ])
  if (mtn.has(ezab)) return 'mtn'
  if (moov.has(ezab)) return 'moov'
  if (celtiis.has(ezab)) return 'celtiis'
  return null
}

function formatPrice(amount: number, currency = 'XOF') {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export interface ReservationCheckoutSlot {
  moniteurId: string
  date: string
  startTime: string
  endTime: string
  vehicleType: string
  creneauId?: string
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
  onClose,
  onSuccess,
  onSoldeSuccess,
}: Props) {
  const [step, setStep] = useState<'country' | 'operator' | 'phone' | 'waiting'>('country')
  const [operator, setOperator] = useState<MobileMoneyOperator | null>(null)
  const [country, setCountry] = useState('BJ')
  const [phone, setPhone] = useState(defaultPhone)
  const [promoCode, setPromoCode] = useState('')
  const [soldeHeures, setSoldeHeures] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [promoBusy, setPromoBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!visible) return
    setStep('country')
    setOperator(null)
    setCountry('BJ')
    setPhone(defaultPhone)
    setPromoCode('')
    setError(null)
    setSuccess(null)
    setBusy(false)
    setPromoBusy(false)
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
    let ticks = 0
    const tick = async () => {
      ticks += 1
      try {
        const result = await syncReservationPayment(bookingGroupId)
        if (result.payment.status === 'approved') {
          stopPoll()
          setSuccess('Paiement confirmé. Réservation validée.')
          setBusy(false)
          onSuccess(result.reservations)
          return
        }
        if (['declined', 'failed', 'canceled'].includes(result.payment.status)) {
          stopPoll()
          setBusy(false)
          setSuccess(null)
          setError(result.payment.errorMessage || 'Le paiement n’a pas abouti. Réessaie.')
          setStep('phone')
        }
      } catch {
        /* ignore */
      }
      if (ticks >= 60) {
        stopPoll()
        setBusy(false)
        setError('Confirmation trop longue. Vérifie tes réservations dans un instant.')
      }
    }
    void tick()
    pollRef.current = setInterval(() => {
      void tick()
    }, 2000)
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
      setError('Indique un numéro Mobile Money valide')
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
        country: country || 'BJ',
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

            {!canPayWithSolde && step === 'country' ? (
              <View style={styles.step}>
                <Text style={styles.kicker}>1. Pays</Text>
                <Pressable
                  style={[styles.choice, styles.choiceActive]}
                  onPress={() => {
                    setCountry('BJ')
                    setStep('operator')
                  }}
                >
                  <Text style={styles.choiceText}>Bénin (+229)</Text>
                </Pressable>
              </View>
            ) : null}

            {!canPayWithSolde && step === 'operator' ? (
              <View style={styles.step}>
                <Text style={styles.kicker}>2. Réseau mobile</Text>
                {OPERATORS.map((item) => (
                  <Pressable
                    key={item.id}
                    style={[styles.choice, operator === item.id && styles.choiceActive]}
                    onPress={() => {
                      setOperator(item.id)
                      setStep('phone')
                    }}
                  >
                    <Text style={styles.choiceText}>{item.label}</Text>
                  </Pressable>
                ))}
                <Pressable style={styles.backBtn} onPress={() => setStep('country')}>
                  <Text style={styles.backText}>Retour</Text>
                </Pressable>
              </View>
            ) : null}

            {!canPayWithSolde && (step === 'phone' || step === 'waiting') ? (
              <View style={styles.step}>
                <Text style={styles.kicker}>3. Numéro Mobile Money</Text>
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
                    Réseau détecté : {guessOperator(phone)?.toUpperCase()} — choisis le même
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
                      Payer {formatPrice(amount)} ({operator?.toUpperCase() || ''})
                    </Text>
                  )}
                </Pressable>
                {step === 'waiting' ? (
                  <Text style={styles.hint}>
                    Une demande de retrait a été envoyée sur {phone || 'ton téléphone'} (
                    {operator?.toUpperCase()}).{'\n'}
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
    borderWidth: 1,
    borderColor: dark.border,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: dark.surfaceRaised,
  },
  choiceActive: { borderColor: dark.green },
  choiceText: {
    color: dark.textPrimary,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    textAlign: 'center',
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
