import { useEffect, useRef, useState } from 'react'
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

const OPERATORS: { id: MobileMoneyOperator; label: string }[] = [
  { id: 'mtn', label: 'MTN' },
  { id: 'moov', label: 'Moov' },
  { id: 'celtiis', label: 'Celtiis' },
]

const COUNTRIES = [{ id: 'BJ', label: 'Bénin (+229)' }]

function formatPrice(amount: number, currency = 'XOF') {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(
    amount,
  )
}

export interface MobileMoneyCheckoutProps {
  open: boolean
  items: CheckoutCartItem[]
  modules: AccessModule[]
  defaultPhone?: string
  onClose: () => void
  onSuccess: (access: AccessMe) => void
}

export function MobileMoneyCheckout({
  open,
  items,
  modules,
  defaultPhone = '',
  onClose,
  onSuccess,
}: MobileMoneyCheckoutProps) {
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

  const lines = items.map((item) => {
    const module = modules.find((m) => m.key === item.module)
    const amount = module ? computeModuleAmount(item.module, module.price, item.quantity) : 0
    return { ...item, label: module?.label || item.module, amount, price: module?.price || 0 }
  })
  const total = lines.reduce((sum, line) => sum + line.amount, 0)

  const stopPoll = () => {
    if (pollRef.current != null) {
      window.clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  const startPoll = (accessRequestId: string) => {
    stopPoll()
    let ticks = 0
    pollRef.current = window.setInterval(() => {
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
            setError(result.payment?.errorMessage || 'Le paiement n’a pas abouti. Réessayez.')
            setStep('phone')
          }
        } catch {
          /* ignore transient */
        }
        if (ticks >= 60) {
          stopPoll()
          setBusy(false)
          setError('Confirmation trop longue. Actualisez vos accès dans un instant.')
        }
      })()
    }, 2500)
  }

  const submit = async () => {
    if (!operator) {
      setError('Choisissez un réseau Mobile Money')
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
    <div className="mm-checkout-backdrop" role="dialog" aria-modal="true">
      <div className="mm-checkout-card auth-card learner-card">
        <header className="mm-checkout-header">
          <h2>Paiement Mobile Money</h2>
          <button type="button" className="btn-outline" onClick={onClose} disabled={busy && step === 'waiting'}>
            Fermer
          </button>
        </header>

        <ul className="mm-checkout-lines">
          {lines.map((line) => (
            <li key={line.module}>
              <span>
                {line.label}
                {line.module === 'conduite_heures' ? ` × ${line.quantity} h` : ''}
                {line.module === 'conduite_heures' && line.quantity >= 2 ? ' (−1 000 FCFA)' : ''}
              </span>
              <strong>{formatPrice(line.amount)}</strong>
            </li>
          ))}
          <li className="mm-checkout-total">
            <span>Total</span>
            <strong>{formatPrice(total)}</strong>
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
              {COUNTRIES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={country === item.id ? 'btn-primary' : 'btn-outline'}
                  onClick={() => {
                    setCountry(item.id)
                    setStep('phone')
                  }}
                >
                  {item.label}
                </button>
              ))}
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
                  : `Payer ${formatPrice(total)} (${operator?.toUpperCase() || ''})`}
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
