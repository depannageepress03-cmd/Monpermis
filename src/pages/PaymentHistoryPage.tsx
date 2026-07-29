import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarCheck, CreditCard, History, LoaderCircle } from 'lucide-react'
import {
  fetchMyPayments,
  paymentChannelLabel,
  paymentStatusLabel,
  PaymentHistoryError,
  type PaymentHistoryItem,
} from '../api/payments'
import { PageNavbar } from '../components/PageNavbar'
import { useAuth } from '../hooks/useAuth'
import '../styles/auth.css'
import '../styles/learner.css'

function formatPrice(amount: number, currency = 'XOF') {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' }).format(
      new Date(iso),
    )
  } catch {
    return iso
  }
}

function statusTone(status: PaymentHistoryItem['status']) {
  if (status === 'approved') return 'is-paid'
  if (status === 'pending') return 'is-pending'
  return 'is-failed'
}

export function PaymentHistoryPage() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [items, setItems] = useState<PaymentHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setItems(await fetchMyPayments())
    } catch (err) {
      setError(err instanceof PaymentHistoryError ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) void load()
  }, [user, load])

  if (authLoading || !user) return null

  return (
    <div className="auth-page">
      <div className="auth-container learner-container">
        <PageNavbar
          title="Historique des paiements"
          icon={<History size={22} />}
          onBack={() => navigate('/abonnement')}
        />

        <header className="auth-header learner-header">
          <p>Tous vos abonnements et vos séances de conduite payés, du plus récent au plus ancien.</p>
        </header>

        {loading ? (
          <div className="auth-card learner-card learner-empty">
            <LoaderCircle className="subscription-spinner" aria-hidden="true" />
            <p>Chargement…</p>
          </div>
        ) : (
          <>
            {error ? <p className="form-error">{error}</p> : null}

            {!error && items.length === 0 ? (
              <div className="auth-card learner-card learner-empty">
                <CreditCard size={28} />
                <strong>Aucun paiement pour le moment</strong>
                <p>
                  Vos achats d’accès et vos réservations payées apparaîtront ici dès votre première
                  transaction.
                </p>
              </div>
            ) : null}

            <div className="payment-history-list">
              {items.map((item) => (
                <article key={item.id} className="auth-card learner-card payment-history-card">
                  <div className="payment-history-head">
                    <span className="payment-history-icon">
                      {item.kind === 'reservation' ? (
                        <CalendarCheck size={18} />
                      ) : (
                        <CreditCard size={18} />
                      )}
                    </span>
                    <div className="payment-history-title">
                      <strong>{item.title}</strong>
                      <small>{formatDate(item.createdAt)}</small>
                    </div>
                    <span className={`payment-history-status ${statusTone(item.status)}`}>
                      {paymentStatusLabel(item.status)}
                    </span>
                  </div>

                  <p className="payment-history-amount">{formatPrice(item.amount, item.currency)}</p>

                  <p className="payment-history-meta">
                    {item.kind === 'reservation' ? 'Séance de conduite' : 'Abonnement'}
                    {item.moniteurName ? ` · ${item.moniteurName}` : ''}
                    {item.paymentMethod ? ` · ${paymentChannelLabel(item.paymentMethod)}` : ''}
                  </p>

                  {item.lines.length > 1 ? (
                    <ul className="payment-history-lines">
                      {item.lines.map((line, index) => (
                        <li key={`${item.id}-${index}`}>
                          <span>{line.label}</span>
                          <strong>{formatPrice(line.amount, item.currency)}</strong>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {item.fedapayReference ? (
                    <p className="payment-history-ref">Réf. {item.fedapayReference}</p>
                  ) : null}
                  {item.errorMessage ? <p className="form-error">{item.errorMessage}</p> : null}
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
