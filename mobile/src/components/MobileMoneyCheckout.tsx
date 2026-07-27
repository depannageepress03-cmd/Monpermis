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
  AccessRequestError,
  checkoutMobileMoney,
  computeModuleAmount,
  syncAccessRequest,
  type AccessMe,
  type AccessModule,
  type AccessModuleKey,
  type CheckoutCartItem,
  type MobileMoneyOperator,
} from '../api/accessRequests'
import { dark, fonts } from '../theme'

const OPERATORS: { id: MobileMoneyOperator; label: string }[] = [
  { id: 'mtn', label: 'MTN' },
  { id: 'moov', label: 'Moov' },
  { id: 'celtiis', label: 'Celtiis' },
]

function formatPrice(amount: number, currency = 'XOF') {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

interface Props {
  visible: boolean
  items: CheckoutCartItem[]
  modules: AccessModule[]
  defaultPhone?: string
  onClose: () => void
  onSuccess: (access: AccessMe) => void
}

export function MobileMoneyCheckout({
  visible,
  items,
  modules,
  defaultPhone = '',
  onClose,
  onSuccess,
}: Props) {
  const [step, setStep] = useState<'operator' | 'country' | 'phone' | 'waiting'>('operator')
  const [operator, setOperator] = useState<MobileMoneyOperator | null>(null)
  const [country, setCountry] = useState('BJ')
  const [phone, setPhone] = useState(defaultPhone)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!visible) return
    setStep('operator')
    setOperator(null)
    setCountry('BJ')
    setPhone(defaultPhone)
    setError(null)
    setSuccess(null)
    setBusy(false)
  }, [visible, defaultPhone])

  useEffect(
    () => () => {
      if (pollRef.current) clearInterval(pollRef.current)
    },
    [],
  )

  const lines = items.map((item) => {
    const module = modules.find((m) => m.key === item.module)
    const amount = module ? computeModuleAmount(item.module, module.price, item.quantity) : 0
    return { ...item, label: module?.label || item.module, amount }
  })
  const total = lines.reduce((sum, line) => sum + line.amount, 0)

  const stopPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  const startPoll = (accessRequestId: string) => {
    stopPoll()
    let ticks = 0
    pollRef.current = setInterval(() => {
      void (async () => {
        ticks += 1
        try {
          const result = await syncAccessRequest(accessRequestId)
          if (result.payment?.status === 'approved' || ['actif', 'valide'].includes(result.accessRequest.status)) {
            stopPoll()
            setSuccess('Paiement confirmé. Accès activé.')
            setBusy(false)
            onSuccess(result.access)
            return
          }
          if (
            result.payment?.status === 'declined' ||
            result.payment?.status === 'failed' ||
            result.payment?.status === 'canceled' ||
            result.accessRequest.status === 'rejete'
          ) {
            stopPoll()
            setBusy(false)
            setError(result.payment?.errorMessage || 'Le paiement n’a pas abouti. Réessaie.')
            setStep('phone')
          }
        } catch {
          /* ignore */
        }
        if (ticks >= 60) {
          stopPoll()
          setBusy(false)
          setError('Confirmation trop longue. Actualise tes accès dans un instant.')
        }
      })()
    }, 2500)
  }

  const submit = async () => {
    if (!operator) {
      setError('Choisis un réseau Mobile Money')
      return
    }
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      const result = await checkoutMobileMoney({
        items,
        operator,
        country,
        phone,
        replace: true,
      })
      setStep('waiting')
      setSuccess(result.message)
      startPoll(result.accessRequest.id)
    } catch (err) {
      setBusy(false)
      setError(err instanceof AccessRequestError ? err.message : 'Paiement impossible')
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Paiement Mobile Money</Text>
            <Pressable onPress={onClose} disabled={busy && step === 'waiting'}>
              <Text style={styles.close}>Fermer</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.scroll}>
            {lines.map((line) => (
              <View key={line.module} style={styles.line}>
                <Text style={styles.lineLabel}>
                  {line.label}
                  {line.module === 'conduite_heures' ? ` × ${line.quantity} h` : ''}
                  {line.module === 'conduite_heures' && line.quantity >= 2 ? ' (−1 000)' : ''}
                </Text>
                <Text style={styles.lineAmount}>{formatPrice(line.amount)}</Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalAmount}>{formatPrice(total)}</Text>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {success ? <Text style={styles.success}>{success}</Text> : null}

            {step === 'operator' ? (
              <View style={styles.step}>
                <Text style={styles.kicker}>1. Réseau mobile</Text>
                {OPERATORS.map((item) => (
                  <Pressable
                    key={item.id}
                    style={[styles.choice, operator === item.id && styles.choiceActive]}
                    onPress={() => {
                      setOperator(item.id)
                      setStep('country')
                    }}
                  >
                    <Text style={styles.choiceText}>{item.label}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {step === 'country' ? (
              <View style={styles.step}>
                <Text style={styles.kicker}>2. Pays</Text>
                <Pressable
                  style={[styles.choice, styles.choiceActive]}
                  onPress={() => {
                    setCountry('BJ')
                    setStep('phone')
                  }}
                >
                  <Text style={styles.choiceText}>Bénin (+229)</Text>
                </Pressable>
                <Pressable style={styles.backBtn} onPress={() => setStep('operator')}>
                  <Text style={styles.backText}>Retour</Text>
                </Pressable>
              </View>
            ) : null}

            {step === 'phone' || step === 'waiting' ? (
              <View style={styles.step}>
                <Text style={styles.kicker}>3. Numéro Mobile Money</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="phone-pad"
                  value={phone}
                  editable={step !== 'waiting'}
                  onChangeText={setPhone}
                  placeholder="01 XX XX XX XX"
                  placeholderTextColor={dark.textMuted}
                />
                {step !== 'waiting' ? (
                  <Pressable style={styles.backBtn} onPress={() => setStep('country')}>
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
                      Payer {formatPrice(total)} ({operator?.toUpperCase() || ''})
                    </Text>
                  )}
                </Pressable>
                {step === 'waiting' ? (
                  <Text style={styles.hint}>
                    Valide maintenant la demande de retrait sur ton téléphone (
                    {operator?.toUpperCase()}).
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

export function moduleLabel(key: AccessModuleKey) {
  const labels: Record<AccessModuleKey, string> = {
    code: 'Code de la route',
    conduite_heures: 'Heures de conduite',
    conduite_videos: 'Vidéos conduite',
    ecodepermis: 'E-Codepermis',
    aiChat: 'Chat IA',
  }
  return labels[key]
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
  choiceText: { color: dark.textPrimary, fontFamily: fonts.bodyBold, fontSize: 15, textAlign: 'center' },
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
  },
  payText: { color: '#fff', fontFamily: fonts.displayBold, fontSize: 15 },
  disabled: { opacity: 0.55 },
  hint: { color: dark.textMuted, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
})
