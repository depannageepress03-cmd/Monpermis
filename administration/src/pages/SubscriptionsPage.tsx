import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Check, Pencil, Plus, RefreshCw, X } from 'lucide-react'
import {
  activateSubscription,
  changeSubscriptionPlan,
  assignSubscription,
  cancelSubscription,
  createSubscriptionPlan,
  deactivateSubscriptionPlan,
  fetchSubscriptionLearners,
  fetchSubscriptionPlans,
  type CustomDurationUnit,
  type DurationType,
  type LearnerSubscription,
  type SubscriptionPlan,
  type SubscriptionPlanPayload,
  type SubscriptionStatus,
  updateSubscriptionPlan,
} from '../api/subscriptions'
import { fetchUsers, type AppUser } from '../api/users'
import { StatusBadge, type StatusTone } from '../components/StatusBadge'
import { getAdminToken, isAuthError } from '../context/AdminAuthContext'

type Tab = 'plans' | 'learners'

const durationOptions: { value: DurationType; label: string }[] = [
  { value: 'monthly', label: 'Mensuel' },
  { value: 'quarterly', label: 'Trimestriel' },
  { value: 'semiannual', label: 'Semestriel' },
  { value: 'yearly', label: 'Annuel' },
  { value: 'custom', label: 'Durée personnalisée' },
]

/** Convertit (quantité, unité) en nombre de jours — même règle que le backend. */
function customTotalDays(amount: number | undefined, unit: CustomDurationUnit | undefined) {
  const qty = Math.max(1, Number(amount) || 1)
  if (unit === 'months') return qty * 30
  if (unit === 'weeks') return qty * 7
  return qty
}

const statusOptions: { value: SubscriptionStatus; label: string }[] = [
  { value: 'active', label: 'Actifs' },
  { value: 'pending_payment', label: 'Paiements en attente' },
  { value: 'expired', label: 'Expirés' },
  { value: 'cancelled', label: 'Annulés' },
  { value: 'none', label: 'Sans abonnement' },
]

function blankPlan(order: number): SubscriptionPlanPayload {
  return {
    name: '',
    description: '',
    durationType: 'monthly',
    customUnit: 'days',
    price: 0,
    accessCode: true,
    accessConduite: false,
    accessECodepermis: false,
    accessAiChat: false,
    heuresIncluses: 0,
    active: true,
    order,
  }
}

function planPayload(plan: SubscriptionPlan): SubscriptionPlanPayload {
  return {
    name: plan.name,
    description: plan.description ?? '',
    durationType: plan.durationType,
    ...(plan.customDays ? { customDays: plan.customDays } : {}),
    customUnit: plan.customUnit || 'days',
    price: plan.price,
    accessCode: plan.accessCode,
    accessConduite: plan.accessConduite,
    accessECodepermis: plan.accessECodepermis,
    accessAiChat: plan.accessAiChat,
    heuresIncluses: plan.heuresIncluses,
    active: plan.active,
    order: plan.order,
  }
}

function formatMoney(value: number, currency = 'XOF') {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value)
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function statusTone(status: SubscriptionStatus): StatusTone {
  if (status === 'active') return 'success'
  if (status === 'pending_payment') return 'warning'
  if (status === 'expired' || status === 'cancelled') return 'danger'
  return 'neutral'
}

function statusLabel(status: SubscriptionStatus) {
  return statusOptions.find((option) => option.value === status)?.label ?? status
}

export function SubscriptionsPage() {
  const [tab, setTab] = useState<Tab>('plans')
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [learners, setLearners] = useState<LearnerSubscription[]>([])
  const [users, setUsers] = useState<AppUser[]>([])
  const [status, setStatus] = useState<SubscriptionStatus>('active')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string |null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null)
  const [showPlanForm, setShowPlanForm] = useState(false)
  const [planForm, setPlanForm] = useState<SubscriptionPlanPayload>(() => blankPlan(1))
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [activateNow, setActivateNow] = useState(false)
  const [paymentNote, setPaymentNote] = useState('')

  const loadPlans = useCallback(async () => {
    const token = getAdminToken()
    if (!token) throw new Error('Session expirée. Reconnectez-vous.')
    const { plans: data } = await fetchSubscriptionPlans(token)
    setPlans(data)
  }, [])

  const loadLearners = useCallback(async () => {
    const token = getAdminToken()
    if (!token) throw new Error('Session expirée. Reconnectez-vous.')
    const [{ learners: data }, { users: userData }] = await Promise.all([
      fetchSubscriptionLearners(token, status),
      fetchUsers(token),
    ])
    setLearners(data)
    setUsers(userData)
  }, [status])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await Promise.all([loadPlans(), loadLearners()])
    } catch (err) {
      setError(isAuthError(err) ? err.message : err instanceof Error ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [loadLearners, loadPlans])

  useEffect(() => {
    void load()
  }, [load])

  const openNewPlan = () => {
    setEditingPlan(null)
    setPlanForm(blankPlan(Math.max(0, ...plans.map((plan) => plan.order)) + 1))
    setShowPlanForm(true)
  }

  const openEditPlan = (plan: SubscriptionPlan) => {
    setEditingPlan(plan)
    setPlanForm(planPayload(plan))
    setShowPlanForm(true)
  }

  const handlePlanSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const token = getAdminToken()
    if (!token) return setError('Session expirée. Reconnectez-vous.')
    if (!planForm.name.trim()) return setError('Le nom du modèle est requis.')
    if (planForm.durationType === 'custom' && (!planForm.customDays || planForm.customDays < 1)) {
      return setError('Indiquez la durée personnalisée en jours.')
    }

    setBusyId('plan-form')
    setError(null)
    setSuccess(null)
    try {
      const payload = { ...planForm, name: planForm.name.trim(), description: planForm.description?.trim() }
      const { plan } = editingPlan
        ? await updateSubscriptionPlan(token, editingPlan.id, payload)
        : await createSubscriptionPlan(token, payload)
      setPlans((current) => {
        const next = editingPlan ? current.map((item) => (item.id === plan.id ? plan : item)) : [...current, plan]
        return next.sort((a, b) => a.order - b.order)
      })
      setSuccess(editingPlan ? 'Modèle mis à jour.' : 'Modèle créé.')
      setShowPlanForm(false)
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Enregistrement impossible.')
    } finally {
      setBusyId(null)
    }
  }

  const handleDeactivate = async (plan: SubscriptionPlan) => {
    if (!window.confirm(`Désactiver le modèle « ${plan.name} » ?`)) return
    const token = getAdminToken()
    if (!token) return setError('Session expirée. Reconnectez-vous.')
    setBusyId(plan.id)
    setError(null)
    try {
      const { plan: updated } = await deactivateSubscriptionPlan(token, plan.id)
      setPlans((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      setSuccess(`Modèle « ${plan.name} » désactivé.`)
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Désactivation impossible.')
    } finally {
      setBusyId(null)
    }
  }

  const handleSubscriptionAction = async (subscriptionId: string, action: 'activate' | 'cancel') => {
    const token = getAdminToken()
    if (!token) return setError('Session expirée. Reconnectez-vous.')
    if (action === 'cancel' && !window.confirm('Annuler cet abonnement en attente ?')) return
    setBusyId(subscriptionId)
    setError(null)
    try {
      await (action === 'activate' ? activateSubscription(token, subscriptionId) : cancelSubscription(token, subscriptionId))
      setSuccess(action === 'activate' ? 'Paiement validé et abonnement activé.' : 'Abonnement annulé.')
      await loadLearners()
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Action impossible.')
    } finally {
      setBusyId(null)
    }
  }

  const handleChangePlan = async (subscriptionId: string, planId: string) => {
    if (!planId) return
    const token = getAdminToken()
    if (!token) return setError('Session expirée. Reconnectez-vous.')
    setBusyId(subscriptionId)
    setError(null)
    try {
      await changeSubscriptionPlan(token, subscriptionId, planId)
      setSuccess('Type d’abonnement modifié.')
      await loadLearners()
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Changement impossible.')
    } finally {
      setBusyId(null)
    }
  }

  const handleAssign = async (event: FormEvent) => {
    event.preventDefault()
    const token = getAdminToken()
    if (!token) return setError('Session expirée. Reconnectez-vous.')
    if (!selectedUserId || !selectedPlanId) return setError('Sélectionnez un apprenant et un modèle.')
    setBusyId('assign')
    setError(null)
    try {
      await assignSubscription(token, {
        userId: selectedUserId,
        planId: selectedPlanId,
        activateNow,
        ...(paymentNote.trim() ? { paymentNote: paymentNote.trim() } : {}),
      })
      setSuccess(activateNow ? 'Abonnement attribué et activé.' : 'Abonnement créé en attente de paiement.')
      setSelectedUserId('')
      setSelectedPlanId('')
      setActivateNow(false)
      setPaymentNote('')
      await loadLearners()
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Attribution impossible.')
    } finally {
      setBusyId(null)
    }
  }

  const visiblePlans = plans.filter((plan) => !plan.isGracePlan)
  const selectedSubscription = (learner: LearnerSubscription) =>
    learner.pending ?? learner.active ?? learner.subscription

  return (
    <div className="admin-page subscriptions-page">
      <header className="admin-module-header">
        <p className="admin-module-kicker">Accès et paiements</p>
        <h1 className="admin-module-title">Abonnements</h1>
        <p className="admin-module-subtitle">Créez les modèles d’accès et gérez les abonnements des apprenants.</p>
        <div className="accent-row" aria-hidden>
          <span className="accent accent-green" />
          <span className="accent accent-gold" />
          <span className="accent accent-navy" />
        </div>
      </header>

      <div className="subscriptions-tabs" role="tablist" aria-label="Gestion des abonnements">
        <button type="button" role="tab" aria-selected={tab === 'plans'} className={tab === 'plans' ? 'active' : ''} onClick={() => setTab('plans')}>
          Modèles <span>{visiblePlans.length}</span>
        </button>
        <button type="button" role="tab" aria-selected={tab === 'learners'} className={tab === 'learners' ? 'active' : ''} onClick={() => setTab('learners')}>
          Apprenants <span>{learners.length}</span>
        </button>
        <button type="button" className="dash-filter-btn subscriptions-refresh" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={13} className={loading ? 'spin' : undefined} /> Actualiser
        </button>
      </div>

      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {success ? <p className="form-success" role="status">{success}</p> : null}

      {tab === 'plans' ? (
        <section className="subscriptions-panel">
          <div className="subscriptions-panel-head">
            <div>
              <h2>Modèles d’abonnement</h2>
              <p>Les modèles de grâce sont gérés par le système et ne peuvent pas être modifiés ici.</p>
            </div>
            <button type="button" className="subscriptions-primary-btn" onClick={openNewPlan}>
              <Plus size={16} /> Nouveau modèle
            </button>
          </div>

          {showPlanForm ? (
            <form className="subscriptions-plan-form" onSubmit={handlePlanSubmit}>
              <div className="subscriptions-form-head">
                <h3>{editingPlan ? `Modifier « ${editingPlan.name} »` : 'Nouveau modèle'}</h3>
                <button type="button" className="btn-icon-muted" onClick={() => setShowPlanForm(false)} aria-label="Fermer">
                  <X size={18} />
                </button>
              </div>
              <div className="subscriptions-form-grid">
                <label>Nom<input value={planForm.name} onChange={(event) => setPlanForm({ ...planForm, name: event.target.value })} required /></label>
                <label>Prix (FCFA)<input type="number" min="0" value={planForm.price} onChange={(event) => setPlanForm({ ...planForm, price: Number(event.target.value) })} required /></label>
                <label>Durée<select value={planForm.durationType} onChange={(event) => setPlanForm({ ...planForm, durationType: event.target.value as DurationType })}>{durationOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
                {planForm.durationType === 'custom' ? (
                  <>
                    <label>Unité de durée<select value={planForm.customUnit ?? 'days'} onChange={(event) => setPlanForm({ ...planForm, customUnit: event.target.value as CustomDurationUnit })}>
                      <option value="days">Jours</option>
                      <option value="weeks">Semaines</option>
                      <option value="months">Mois</option>
                    </select></label>
                    <label>
                      {planForm.customUnit === 'months' ? 'Nombre de mois' : planForm.customUnit === 'weeks' ? 'Nombre de semaines' : 'Nombre de jours'}
                      <input type="number" min="1" value={planForm.customDays ?? ''} onChange={(event) => setPlanForm({ ...planForm, customDays: Number(event.target.value) })} required />
                    </label>
                    <p className="subscriptions-full-field subscriptions-duration-preview">
                      Durée totale calculée : <strong>{customTotalDays(planForm.customDays, planForm.customUnit)} jours</strong>
                      <span> — la date de fin sera calculée automatiquement à l’activation.</span>
                    </p>
                  </>
                ) : null}
                <label>Heures de conduite incluses<input type="number" min="0" value={planForm.heuresIncluses} onChange={(event) => setPlanForm({ ...planForm, heuresIncluses: Number(event.target.value) })} /></label>
                <label>Ordre d’affichage<input type="number" min="0" value={planForm.order} onChange={(event) => setPlanForm({ ...planForm, order: Number(event.target.value) })} /></label>
                <label className="subscriptions-full-field">Description<textarea value={planForm.description ?? ''} onChange={(event) => setPlanForm({ ...planForm, description: event.target.value })} rows={2} /></label>
              </div>
              <div className="subscriptions-checkboxes">
                <label><input type="checkbox" checked={planForm.accessCode} onChange={(event) => setPlanForm({ ...planForm, accessCode: event.target.checked })} /> Code de la route</label>
                <label><input type="checkbox" checked={planForm.accessConduite} onChange={(event) => setPlanForm({ ...planForm, accessConduite: event.target.checked })} /> Conduite</label>
                <label><input type="checkbox" checked={planForm.accessECodepermis} onChange={(event) => setPlanForm({ ...planForm, accessECodepermis: event.target.checked })} /> E-Codepermis</label>
                <label><input type="checkbox" checked={planForm.accessAiChat} onChange={(event) => setPlanForm({ ...planForm, accessAiChat: event.target.checked })} /> Chat IA tuteur (cours)</label>
                <label><input type="checkbox" checked={planForm.active} onChange={(event) => setPlanForm({ ...planForm, active: event.target.checked })} /> Modèle actif</label>
              </div>
              <button type="submit" className="subscriptions-primary-btn" disabled={busyId === 'plan-form'}>
                <Check size={16} /> {busyId === 'plan-form' ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </form>
          ) : null}

          <div className="subscriptions-plan-grid">
            {loading && plans.length === 0 ? <p className="admin-muted">Chargement des modèles…</p> : null}
            {visiblePlans.map((plan) => (
              <article key={plan.id} className={`subscription-plan-card${!plan.active ? ' is-inactive' : ''}`}>
                <div className="subscription-plan-card-head">
                  <div><h3>{plan.name}</h3><p>{plan.durationLabel}</p></div>
                  <StatusBadge tone={plan.active ? 'success' : 'neutral'}>{plan.active ? 'Actif' : 'Inactif'}</StatusBadge>
                </div>
                <strong className="subscription-price">{formatMoney(plan.price, plan.currency)}</strong>
                {plan.description ? <p className="subscription-description">{plan.description}</p> : null}
                <div className="subscription-features">
                  {plan.accessCode ? <span>Code</span> : null}
                  {plan.accessConduite ? <span>Conduite</span> : null}
                  {plan.accessECodepermis ? <span>E-Codepermis</span> : null}
                  {plan.accessAiChat ? <span>Chat IA</span> : null}
                  {plan.heuresIncluses > 0 ? <span>{plan.heuresIncluses} h conduite</span> : null}
                </div>
                <div className="subscription-card-actions">
                  <button type="button" className="btn-outline-sm" onClick={() => openEditPlan(plan)}><Pencil size={14} /> Modifier</button>
                  {plan.active ? <button type="button" className="btn-text-danger" disabled={busyId === plan.id} onClick={() => void handleDeactivate(plan)}>Désactiver</button> : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <div className="subscriptions-learners-layout">
          <section className="subscriptions-panel">
            <div className="subscriptions-panel-head">
              <div><h2>Abonnements des apprenants</h2><p>Validez les paiements en attente et suivez les accès en cours.</p></div>
              <label className="subscriptions-status-filter">Statut<select value={status} onChange={(event) => setStatus(event.target.value as SubscriptionStatus)}>{statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            </div>
            <div className="admin-data-table-wrap">
              <table className="admin-data-table subscriptions-table">
                <thead><tr><th>Apprenant</th><th>Abonnement</th><th>Fin d’accès</th><th>Statut</th><th /></tr></thead>
                <tbody>
                  {loading ? <tr><td colSpan={5} className="muted">Chargement…</td></tr> : null}
                  {!loading && learners.length === 0 ? <tr><td colSpan={5} className="muted">Aucun apprenant pour ce filtre.</td></tr> : null}
                  {!loading ? learners.map((learner) => {
                    const subscription = selectedSubscription(learner)
                    return <tr key={learner.user.id}>
                      <td><strong>{learner.user.firstName} {learner.user.lastName}</strong><br /><span className="muted">{learner.user.email || learner.user.phone || '—'}</span></td>
                      <td>{subscription?.planName ?? '—'}</td>
                      <td>{formatDate(subscription?.endAt)}</td>
                      <td><StatusBadge tone={statusTone(learner.status)}>{statusLabel(learner.status)}</StatusBadge></td>
                      <td>
                        <div className="subscription-row-actions">
                          {learner.pending ? (
                            <>
                              <button type="button" className="subscriptions-validate-btn" disabled={busyId === learner.pending.id} onClick={() => void handleSubscriptionAction(learner.pending!.id, 'activate')}>Valider le paiement</button>
                              <button type="button" className="btn-text-danger" disabled={busyId === learner.pending.id} onClick={() => void handleSubscriptionAction(learner.pending!.id, 'cancel')}>Annuler</button>
                            </>
                          ) : null}
                          {(learner.active || learner.pending) ? (
                            <select
                              className="subscription-change-plan"
                              value=""
                              disabled={busyId === (learner.active?.id ?? learner.pending?.id)}
                              onChange={(event) => void handleChangePlan((learner.active?.id ?? learner.pending!.id), event.target.value)}
                              title="Changer le type d’abonnement"
                            >
                              <option value="">Changer de plan…</option>
                              {visiblePlans.filter((plan) => plan.active).map((plan) => (
                                <option key={plan.id} value={plan.id}>{plan.name} — {formatMoney(plan.price, plan.currency)}</option>
                              ))}
                            </select>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  }) : null}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="subscriptions-assign-card">
            <p className="admin-module-kicker">Attribution manuelle</p>
            <h2>Attribuer un abonnement</h2>
            <p>Sélectionnez un apprenant et le modèle à appliquer.</p>
            <form onSubmit={handleAssign}>
              <label>Apprenant<select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)} required><option value="">Sélectionner…</option>{users.map((user) => <option key={user.id} value={user.id}>{user.firstName} {user.lastName} — {user.email}</option>)}</select></label>
              <label>Modèle<select value={selectedPlanId} onChange={(event) => setSelectedPlanId(event.target.value)} required><option value="">Sélectionner…</option>{visiblePlans.filter((plan) => plan.active).map((plan) => <option key={plan.id} value={plan.id}>{plan.name} — {formatMoney(plan.price, plan.currency)}</option>)}</select></label>
              <label>Note de paiement (facultatif)<textarea rows={2} value={paymentNote} onChange={(event) => setPaymentNote(event.target.value)} placeholder="Référence, mode de règlement…" /></label>
              <label className="subscription-checkline"><input type="checkbox" checked={activateNow} onChange={(event) => setActivateNow(event.target.checked)} /> Activer immédiatement</label>
              <button type="submit" className="subscriptions-primary-btn" disabled={busyId === 'assign'}>{busyId === 'assign' ? 'Attribution…' : 'Attribuer'}</button>
            </form>
          </aside>
        </div>
      )}
    </div>
  )
}
