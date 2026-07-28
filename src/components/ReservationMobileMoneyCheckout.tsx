import { useEffect, useRef, useState } from 'react'
import {
  createReservation,
  ReservationError,
  syncReservationPayment,
  type MobileMoneyOperator,
  type ReservationItem,
  type ReservationQuote,
} from '../api/reservations'

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
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(
    amount,
  )
}

export interface ReservationMobileMoneyCheckoutProps {
  open: boolean
  quote: ReservationQuote
  creneauIds: string[]
  vehicleType: string
  moniteurId: string
  defaultPhone?: string
  onClose: () => void
  onSuccess: (reservations: ReservationItem[]) => void
}

export function ReservationMobileMoneyCheckout({
  open,
  quote,
  creneauIds,
  vehicleType,
  moniteurId,
  defaultPhone = '',
  onClose,
  onSuccess,
}: ReservationMobileMoneyCheckoutProps) {
  const [step, setStep] = useState<'operator' | 'country' | 'phone' | 'waiting'>('operator')
  const [operator, setOperator] = useState<MobileMoneyOperator | null>(null)
  const [country, setCountry] = useState('BJ')
  const [phone, setPhone] = useState(defaultPhone)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const pollRef = useRef<number | null>(null)

  useEffect(() => {
    if (!open) return
    setStep('operator')
    setOperator(null)
    setCountry('BJ')
    setPhone(defaultPhone)
    setError(null)
    setSuccess(null)
    setBusy(false)
  }, [open, defaultPhone])

  useEffect(
    () => () => {
      if (pollRef.current != null) window.clearInterval(pollRef.current)
    },
    [],
  )

  if (!open) return null

  const stopPoll = () => {
    if (pollRef.current != null) {
      window.clearInterval(pollRef.current)
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
          setError(result.payment.errorMessage || 'Le paiement n’a pas abouti. Réessayez.')
          setStep('phone')
        }
      } catch {
        /* ignore transient */
      }
      if (ticks >= 60) {
        stopPoll()
        setBusy(false)
        setError('Confirmation trop longue. Vérifiez vos réservations dans un instant.')
      }
    }
    void tick()
    pollRef.current = window.setInterval(() => {
      void tick()
    }, 2000)
  }

  const submit = async () => {
    if (!operator) {
      setError('Choisissez un réseau Mobile Money')
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
        creneauIds,
        vehicleType,
        moniteurId,
        paymentMethod: 'mobile_money',
        operator: detected || operator,
        phone,
        country,
      })
      setOperator(detected || operator)
      setStep('waiting')
      setSuccess(result.message || 'Demande envoyée.')
      startPoll(result.bookingGroupId)
    } catch (err) {
      setBusy(false)
      setError(err instanceof ReservationError ? err.message : 'Paiement impossible')
      const detectedAfterError = guessOperator(phone)
      if (detectedAfterError) setOperator(detectedAfterError)
    }
  }

  return (
    <div className="mm-checkout-backdrop" role="dialog" aria-modal="true">
      <div className="mm-checkout-card auth-card learner-card">
        <header className="mm-checkout-header">
          <h2>Paiement Mobile Money</h2>
          <button type="button" className="btn-outline" onClick={onClose} disabled={busy && step === 'waiting'}>
            Fermer
          </button>
        </header>

        <ul className="mm-checkout-lines">
          <li>
            <span>
              {quote.hours} h avec {quote.moniteur?.fullName || 'le moniteur'}
            </span>
            <strong>{formatPrice(quote.amount, quote.currency)}</strong>
          </li>
          <li className="mm-checkout-total">
            <span>Total</span>
            <strong>{formatPrice(quote.amount, quote.currency)}</strong>
          </li>
        </ul>

        {error ? <p className="form-error">{error}</p> : null}
        {success ? <p className="form-success">{success}</p> : null}

        {step === 'operator' ? (
          <section className="mm-checkout-step">
            <p className="learner-kicker">1. Réseau mobile</p>
            <div className="mm-checkout-choices">
              {OPERATORS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={operator === item.id ? 'btn-primary' : 'btn-outline'}
                  onClick={() => {
                    setOperator(item.id)
                    setStep('country')
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {step === 'country' ? (
          <section className="mm-checkout-step">
            <p className="learner-kicker">2. Pays</p>
            <div className="mm-checkout-choices">
              <button
                type="button"
                className={country === 'BJ' ? 'btn-primary' : 'btn-outline'}
                onClick={() => {
                  setCountry('BJ')
                  setStep('phone')
                }}
              >
                Bénin (+229)
              </button>
            </div>
            <button type="button" className="btn-outline" onClick={() => setStep('operator')}>
              Retour
            </button>
          </section>
        ) : null}

        {step === 'phone' || step === 'waiting' ? (
          <section className="mm-checkout-step">
            <p className="learner-kicker">3. Numéro Mobile Money</p>
            <label className="access-quantity-field">
              Téléphone
              <input
                type="tel"
                value={phone}
                disabled={step === 'waiting'}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="01 XX XX XX XX"
              />
            </label>
            <div className="mm-checkout-actions">
              {step !== 'waiting' ? (
                <button type="button" className="btn-outline" onClick={() => setStep('country')}>
                  Retour
                </button>
              ) : null}
              <button
                type="button"
                className="btn-primary"
                disabled={busy || !phone.trim()}
                onClick={() => void submit()}
              >
                {busy
                  ? 'Envoi de la demande…'
                  : `Payer ${formatPrice(quote.amount, quote.currency)} (${operator?.toUpperCase() || ''})`}
              </button>
            </div>
            {step === 'waiting' ? (
              <p className="subscription-status-copy">
                Validez maintenant la demande de retrait sur votre téléphone ({operator?.toUpperCase()}).
              </p>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  )
}
