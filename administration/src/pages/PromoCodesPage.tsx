import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Gift, Plus, Power, Trash2 } from 'lucide-react'
import {
  createPromoCode,
  deletePromoCode,
  fetchPromoCodes,
  updatePromoCode,
  type PromoCode,
  type PromoDurationUnit,
  type PromoModuleKey,
} from '../api/promoCodes'
import { StatusBadge } from '../components/StatusBadge'
import { getAdminToken, isAuthError } from '../context/AdminAuthContext'

const MODULE_OPTIONS: { value: PromoModuleKey; label: string }[] = [
  { value: 'code', label: 'Code de la route' },
  { value: 'conduite_heures', label: 'Heures de conduite' },
  { value: 'ecodepermis', label: 'E-Codepermis' },
  { value: 'aiChat', label: 'Chat IA tuteur' },
]

const ALL_MODULES = MODULE_OPTIONS.map((item) => item.value)

const DURATION_UNIT_OPTIONS: { value: PromoDurationUnit; label: string }[] = [
  { value: 'day', label: 'jour(s)' },
  { value: 'week', label: 'semaine(s)' },
  { value: 'month', label: 'mois' },
]

function moduleLabel(key: PromoModuleKey) {
  return MODULE_OPTIONS.find((item) => item.value === key)?.label || key
}

export function PromoCodesPage() {
  const [codes, setCodes] = useState<PromoCode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [code, setCode] = useState('')
  const [label, setLabel] = useState('')
  const [modules, setModules] = useState<PromoModuleKey[]>([])
  const [durationQuantity, setDurationQuantity] = useState(1)
  const [durationUnit, setDurationUnit] = useState<PromoDurationUnit>('month')
  const [heuresBonus, setHeuresBonus] = useState('')
  const [maxUses, setMaxUses] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const token = getAdminToken()
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchPromoCodes(token)
      setCodes(data.promoCodes)
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const toggleModule = (key: PromoModuleKey) => {
    setModules((prev) => (prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key]))
  }

  const toggleAllModules = () => {
    setModules((prev) => (prev.length === ALL_MODULES.length ? [] : ALL_MODULES))
  }

  const resetForm = () => {
    setCode('')
    setLabel('')
    setModules([])
    setDurationQuantity(1)
    setDurationUnit('month')
    setHeuresBonus('')
    setMaxUses('')
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    const token = getAdminToken()
    if (!token) return
    if (code.trim().length < 3) {
      setError('Le code doit contenir au moins 3 caractères')
      return
    }
    if (modules.length === 0) {
      setError('Sélectionnez au moins un module')
      return
    }
    if (modules.includes('conduite_heures') && (!heuresBonus || Number(heuresBonus) <= 0)) {
      setError('Indiquez un nombre d’heures bonus supérieur à 0')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const { promoCode } = await createPromoCode(token, {
        code: code.trim(),
        label: label.trim(),
        modules,
        durationQuantity,
        durationUnit,
        heuresBonus: heuresBonus ? Number(heuresBonus) : 0,
        maxUses: maxUses ? Number(maxUses) : null,
      })
      setSuccess(`Code « ${promoCode.code} » créé.`)
      resetForm()
      await load()
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Création impossible')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (item: PromoCode) => {
    const token = getAdminToken()
    if (!token) return
    setTogglingId(item.id)
    setError(null)
    try {
      await updatePromoCode(token, item.id, { active: !item.active })
      await load()
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Mise à jour impossible')
    } finally {
      setTogglingId(null)
    }
  }

  const handleDelete = async (item: PromoCode) => {
    const token = getAdminToken()
    if (!token) return
    if (!window.confirm(`Supprimer le code « ${item.code} » ?`)) return
    setDeletingId(item.id)
    setError(null)
    try {
      await deletePromoCode(token, item.id)
      setSuccess(`Code « ${item.code} » supprimé.`)
      await load()
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Suppression impossible')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-module-header">
        <p className="admin-module-kicker">Abonnements</p>
        <h1 className="admin-module-title">Codes promo</h1>
        <p className="admin-module-subtitle">
          Créez des codes donnant un accès gratuit à un ou plusieurs modules. Les élèves les
          saisissent dans l’application pour débloquer l’accès instantanément.
        </p>
      </header>

      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}

      <section className="admin-section">
        <div className="admin-section-head">
          <h3 className="admin-section-label">Nouveau code</h3>
        </div>
        <form onSubmit={handleCreate} className="admin-section-body">
          <div className="admin-toolbar">
            <label className="admin-field">
              Code
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="RENTREE2026"
                minLength={3}
                required
              />
            </label>
            <label className="admin-field">
              Note interne (facultatif)
              <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex. Campagne rentrée" />
            </label>
            <label className="admin-field">
              Utilisations max (vide = illimité)
              <input
                type="number"
                min={1}
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="Illimité"
              />
            </label>
          </div>

          <div className="admin-field">
            Modules débloqués
            <div className="promo-module-choices">
              <button
                type="button"
                className={modules.length === ALL_MODULES.length ? 'admin-btn admin-btn-primary' : 'admin-btn admin-btn-secondary'}
                onClick={toggleAllModules}
              >
                Tous les modules
              </button>
              {MODULE_OPTIONS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className={
                    modules.includes(item.value) ? 'admin-btn admin-btn-primary' : 'admin-btn admin-btn-secondary'
                  }
                  onClick={() => toggleModule(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="admin-toolbar">
            <label className="admin-field">
              Durée d’accès (modules temporels)
              <div className="promo-duration-row">
                <input
                  type="number"
                  min={1}
                  value={durationQuantity}
                  onChange={(e) => setDurationQuantity(Math.max(1, Number(e.target.value) || 1))}
                />
                <select value={durationUnit} onChange={(e) => setDurationUnit(e.target.value as PromoDurationUnit)}>
                  {DURATION_UNIT_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </label>
            {modules.includes('conduite_heures') ? (
              <label className="admin-field">
                Heures bonus (conduite)
                <input
                  type="number"
                  min={1}
                  value={heuresBonus}
                  onChange={(e) => setHeuresBonus(e.target.value)}
                  placeholder="Ex. 20"
                  required
                />
              </label>
            ) : null}
          </div>

          <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
            <Plus size={16} />
            {saving ? 'Création…' : 'Créer le code'}
          </button>
        </form>
      </section>

      <section className="admin-section">
        <div className="admin-section-head">
          <h3 className="admin-section-label">Codes existants</h3>
        </div>
        <div className="admin-section-body">
          {loading ? <p className="admin-empty">Chargement…</p> : null}
          {!loading && codes.length === 0 ? (
            <p className="admin-empty">Aucun code promo pour le moment.</p>
          ) : null}
          <div className="admin-list">
            {codes.map((item) => (
              <div key={item.id} className="admin-list-item">
                <div className="admin-list-main">
                  <div className="promo-code-icon">
                    <Gift size={16} />
                  </div>
                  <div className="admin-list-text">
                    <strong>{item.code}</strong>
                    <span>
                      {item.modules.map((m) => moduleLabel(m)).join(' · ')}
                      {item.modules.includes('conduite_heures') ? ` (+${item.heuresBonus} h)` : ''}
                      {item.modules.some((m) => m !== 'conduite_heures')
                        ? ` · ${item.durationQuantity} ${DURATION_UNIT_OPTIONS.find((u) => u.value === item.durationUnit)?.label}`
                        : ''}
                    </span>
                    {item.label ? <span className="admin-muted">{item.label}</span> : null}
                  </div>
                </div>
                <div className="admin-list-actions">
                  <span className="admin-chip">
                    {item.usesCount} / {item.maxUses ?? '∞'} utilisation{item.usesCount > 1 ? 's' : ''}
                  </span>
                  <StatusBadge tone={item.active ? 'success' : 'neutral'}>
                    {item.active ? 'Actif' : 'Désactivé'}
                  </StatusBadge>
                  <button
                    type="button"
                    className="btn-outline-sm"
                    disabled={togglingId === item.id}
                    onClick={() => void handleToggleActive(item)}
                    title={item.active ? 'Désactiver' : 'Réactiver'}
                  >
                    <Power size={15} />
                  </button>
                  <button
                    type="button"
                    className="btn-outline-sm btn-danger-sm"
                    disabled={deletingId === item.id}
                    onClick={() => void handleDelete(item)}
                    title="Supprimer"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
