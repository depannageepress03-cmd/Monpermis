import { useEffect, useRef, useState } from 'react'
import {
  createReservation,
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
import { PAYMENT_OPERATORS, paymentOperatorLabel } from '../utils/paymentOperators'
import { friendlyPaymentError } from '../utils/fedapayErrors'

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
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(
    amount,
  )
}

interface SoldeSuccessResult {
  reservations?: ReservationItem[]
  reservation?: ReservationItem
  whatsappLink?: string
}

export interface ReservationMobileMoneyCheckoutProps {
  open: boolean
  label: string
  amount: number
  creneauId: string
  vehicleType: string
  moniteurId: string
  /** Heures de la séance (pour solde / code promo). */
  hoursNeeded: number
  defaultPhone?: string
  onClose: () => void
  onSuccess: (reservations: ReservationItem[]) => void
  onSoldeSuccess: (result: SoldeSuccessResult) => void
  /** Notifie le parent quand le solde change (après code promo). */
  onSoldeChange?: (soldeHeures: number) => void
}

export function ReservationMobileMoneyCheckout({
  open,
  label,
  amount,
  creneauId,
  vehicleType,
  moniteurId,
  hoursNeeded,
  defaultPhone = '',
  onClose,
  onSuccess,
  onSoldeSuccess,
  onSoldeChange,
}: ReservationMobileMoneyCheckoutProps) {
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
  const pollRef = useRef<number | null>(null)

  useEffect(() => {
    if (!open) return
    setStep('intro')
    setOperator(null)
    setPhone(defaultPhone)
    setPromoCode('')
    setError(null)
    setSuccess(null)
    setVerifying(false)
    setPendingGroupId(null)
    setBusy(false)
    setPromoBusy(false)
    fetchAccessMe()
      .then((data) => {
        setSoldeHeures(data.user.soldeHeures)
        onSoldeChange?.(data.user.soldeHeures)
      })
      .catch(() => setSoldeHeures(null))
  }, [open, defaultPhone, onSoldeChange])

  useEffect(
    () => () => {
      if (pollRef.current != null) window.clearInterval(pollRef.current)
    },
    [],
  )

  if (!open) return null

  const canPayWithSolde = soldeHeures !== null && soldeHeures >= hoursNeeded

  const stopPoll = () => {
    if (pollRef.current != null) {
      window.clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  const applySyncResult = (
    result: Awaited<ReturnType<typeof syncReservationPayment>>,
    ticks = 0,
    approvedSeenAt: number | null = null,
  ): { done: boolean; approvedSeenAt: number | null } => {
    const reservations = result.reservations || []
    const allConfirmed =
      result.confirmed === true ||
      (reservations.length > 0 && reservations.every((item) => item.status === 'confirmed'))

    if (result.payment.status === 'approved' && allConfirmed) {
      stopPoll()
      setSuccess('Paiement confirmé. Votre rendez-vous est réservé et garanti.')
      setBusy(false)
      setVerifying(false)
      onSuccess(reservations)
      return { done: true, approvedSeenAt }
    }

    if (result.payment.status === 'approved') {
      const seen = approvedSeenAt ?? ticks
      setSuccess('Paiement reçu. Confirmation du créneau…')
      if (ticks - seen >= 8) {
        stopPoll()
        setBusy(false)
        setVerifying(false)
        const confirmed = reservations.filter((item) => item.status === 'confirmed')
        if (confirmed.length) {
          onSuccess(confirmed)
          return { done: true, approvedSeenAt: seen }
        }
        setError(
          'Paiement reçu mais confirmation du créneau incomplète. Consultez « Mes réservations » ou contactez le support.',
        )
        setStep('phone')
        return { done: true, approvedSeenAt: seen }
      }
      return { done: false, approvedSeenAt: seen }
    }

    if (['declined', 'failed', 'canceled'].includes(result.payment.status)) {
      stopPoll()
      setBusy(false)
      setVerifying(false)
      setSuccess(null)
      setError(
        friendlyPaymentError(result.payment.errorMessage, 'Le paiement n’a pas abouti. Réessayez.'),
      )
      setStep('phone')
      return { done: true, approvedSeenAt }
    }
    return { done: false, approvedSeenAt }
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
        const applied = applySyncResult(result, ticks, approvedSeenAt)
        approvedSeenAt = applied.approvedSeenAt
        if (applied.done) return
      } catch {
        /* ignore transient */
      }
      if (ticks >= 60) {
        stopPoll()
        setBusy(false)
        setError(
          'Confirmation trop longue. Si vous avez validé sur votre téléphone, appuyez sur « J’ai payé, vérifier ».',
        )
      }
    }
    void tick()
    pollRef.current = window.setInterval(() => {
      void tick()
    }, 2000)
  }

  const verifyPaid = async () => {
    if (!pendingGroupId) return
    setVerifying(true)
    setError(null)
    try {
      const result = await syncReservationPayment(pendingGroupId)
      const applied = applySyncResult(result, 8, 0)
      if (!applied.done) {
        setSuccess(
          'Paiement pas encore confirmé. Validez la notification sur votre téléphone, puis réessayez.',
        )
      }
    } catch {
      setError('Vérification temporairement indisponible. Réessayez dans un instant.')
    } finally {
      setVerifying(false)
    }
  }

  const applyPromo = async () => {
    const trimmed = promoCode.trim()
    if (!trimmed) {
      setError('Saisissez un code promo')
      return
    }
    setPromoBusy(true)
    setError(null)
    setSuccess(null)
    try {
      const result = await redeemPromoCode(trimmed)
      const nextSolde = result.access.user.soldeHeures
      setSoldeHeures(nextSolde)
      onSoldeChange?.(nextSolde)
      if (nextSolde >= hoursNeeded) {
        setSuccess(
          `Code promo appliqué. Solde : ${nextSolde} h — vous pouvez valider sans Mobile Money.`,
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
      const result = await createReservation({
        creneauIds: [creneauId],
        vehicleType,
        moniteurId,
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
      setError('Choisissez un réseau Mobile Money')
      return
    }
    if (!phone.trim()) {
      setError(
        'Indiquez un numéro Mobile Money valide (ex. 0147880143). Ajoutez-le aussi dans Mon profil.',
      )
      return
    }
    const detected = guessOperator(phone)
    if (detected && detected !== operator) {
      setError(
        `Ce numéro est un numéro ${detected.toUpperCase()}. Choisissez ${detected.toUpperCase()} (pas ${operator.toUpperCase()}).`,
      )
      setOperator(detected)
      return
    }
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      const result = await createReservation({
        creneauIds: [creneauId],
        vehicleType,
        moniteurId,
        paymentMethod: 'mobile_money',
        operator: detected || operator,
        phone,
        country: 'BJ',
      })
      setOperator(detected || operator)
      setStep('waiting')
      setSuccess(result.message || 'Demande envoyée.')
      startPoll(result.bookingGroupId)
    } catch (err) {
      setBusy(false)
      setError(
        friendlyPaymentError(
          err instanceof ReservationError ? err.message : null,
          'Paiement impossible. Vérifiez le numéro et réessayez.',
        ),
      )
      const detectedAfterError = guessOperator(phone)
      if (detectedAfterError) setOperator(detectedAfterError)
    }
  }

  return (
    <div className="mm-checkout-backdrop" role="dialog" aria-modal="true">
      <div className="mm-checkout-card auth-card learner-card">
        <header className="mm-checkout-header">
          <h2>Paiement</h2>
          <button type="button" className="btn-outline" onClick={onClose} disabled={busy && step === 'waiting'}>
            Fermer
          </button>
        </header>

        <ul className="mm-checkout-lines">
          <li>
            <span>{label}</span>
            <strong>{formatPrice(amount)}</strong>
          </li>
          <li className="mm-checkout-total">
            <span>Total</span>
            <strong>{formatPrice(amount)}</strong>
          </li>
        </ul>

        <div className="mm-checkout-promo">
          <p className="learner-kicker">Code promo</p>
          <div className="promo-code-field">
            <input
              type="text"
              value={promoCode}
              onChange={(event) => setPromoCode(event.target.value)}
              autoCapitalize="characters"
              placeholder="Ex. PROMO2026"
              disabled={promoBusy || (busy && step === 'waiting')}
            />
            <button
              type="button"
              className="btn-outline"
              disabled={promoBusy || !promoCode.trim()}
              onClick={() => void applyPromo()}
            >
              {promoBusy ? '…' : 'Appliquer'}
            </button>
          </div>
          {soldeHeures !== null ? (
            <p className="subscription-status-copy">
              Solde actuel : {soldeHeures} h (séance : {hoursNeeded} h)
            </p>
          ) : null}
        </div>

        {error ? <p className="form-error">{error}</p> : null}
        {success ? <p className="form-success">{success}</p> : null}

        {canPayWithSolde ? (
          <section className="mm-checkout-step">
            <button
              type="button"
              className="btn-primary"
              disabled={busy}
              onClick={() => void confirmWithSolde()}
            >
              {busy ? 'Confirmation…' : 'Valider avec mon solde / code promo'}
            </button>
          </section>
        ) : null}

        {!canPayWithSolde && step === 'intro' ? (
          <section className="mm-checkout-step">
            <button type="button" className="btn-primary" onClick={() => setStep('operator')}>
              Passer au paiement
            </button>
          </section>
        ) : null}

        {!canPayWithSolde && step === 'operator' ? (
          <section className="mm-checkout-step">
            <p className="learner-kicker">1. Réseau mobile</p>
            <div className="mm-checkout-choices">
              {PAYMENT_OPERATORS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`mm-checkout-operator${operator === item.id ? ' is-selected' : ''}`}
                  onClick={() => {
                    setOperator(item.id)
                    setStep('phone')
                  }}
                >
                  <img src={item.logo} alt={item.alt} className="mm-checkout-operator-logo" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
            <button type="button" className="btn-outline" onClick={() => setStep('intro')}>
              Retour
            </button>
          </section>
        ) : null}

        {!canPayWithSolde && (step === 'phone' || step === 'waiting') ? (
          <section className="mm-checkout-step">
            <p className="learner-kicker">2. Numéro Mobile Money</p>
            <label className="access-quantity-field">
              Téléphone
              <input
                type="tel"
                value={phone}
                disabled={step === 'waiting'}
                onChange={(event) => {
                  setPhone(event.target.value)
                  const detected = guessOperator(event.target.value)
                  if (detected) setOperator(detected)
                }}
                placeholder="01 XX XX XX XX"
              />
            </label>
            {guessOperator(phone) ? (
              <p className="subscription-status-copy">
                Réseau détecté : {paymentOperatorLabel(guessOperator(phone))} — choisissez le même
                opérateur.
              </p>
            ) : null}
            <div className="mm-checkout-actions">
              {step !== 'waiting' ? (
                <button type="button" className="btn-outline" onClick={() => setStep('operator')}>
                  Retour
                </button>
              ) : null}
              {step !== 'waiting' ? (
                <button
                  type="button"
                  className="btn-primary"
                  disabled={busy || !phone.trim()}
                  onClick={() => void submit()}
                >
                  {busy
                    ? 'Envoi de la demande…'
                    : `Payer ${formatPrice(amount)} (${paymentOperatorLabel(operator)})`}
                </button>
              ) : null}
            </div>
            {step === 'waiting' ? (
              <>
                <p className="subscription-status-copy">
                  Ouvrez la notification {paymentOperatorLabel(operator)} et validez avec votre code
                  secret. Ensuite appuyez sur « J’ai payé, vérifier ».
                </p>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={verifying || !pendingGroupId}
                  onClick={() => void verifyPaid()}
                >
                  {verifying ? 'Vérification…' : 'J’ai payé, vérifier'}
                </button>
              </>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  )
}
