import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import {
  createCreneau,
  deleteCreneau,
  fetchMyCreneaux,
  updateCreneau,
  type CreneauItem,
} from '../api/portal'
import { getMoniteurToken, isAuthError } from '../context/MoniteurAuthContext'

function todayLocal() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function formatDateLabel(date: string) {
  try {
    return new Date(`${date}T12:00:00`).toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
  } catch {
    return date
  }
}

export function DisponibilitesPage() {
  const [items, setItems] = useState<CreneauItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [date, setDate] = useState(todayLocal())
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('09:00')
  const [editingId, setEditingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const token = getMoniteurToken()
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchMyCreneaux(token, todayLocal())
      setItems(data.creneaux)
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const editable = useMemo(() => items.filter((item) => item.editable), [items])
  const reserved = useMemo(() => items.filter((item) => !item.editable), [items])

  const resetForm = () => {
    setEditingId(null)
    setDate(todayLocal())
    setStartTime('08:00')
    setEndTime('09:00')
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const token = getMoniteurToken()
    if (!token) return
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      if (editingId) {
        await updateCreneau(token, editingId, { date, startTime, endTime })
        setSuccess('Créneau mis à jour.')
      } else {
        await createCreneau(token, { date, startTime, endTime })
        setSuccess('Créneau publié.')
      }
      resetForm()
      await load()
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Enregistrement impossible')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (item: CreneauItem) => {
    setEditingId(item.id)
    setDate(item.date)
    setStartTime(item.startTime)
    setEndTime(item.endTime)
    setSuccess(null)
    setError(null)
  }

  const handleDelete = async (item: CreneauItem) => {
    const token = getMoniteurToken()
    if (!token) return
    if (!window.confirm(`Supprimer le créneau du ${item.date} ${item.startTime}–${item.endTime} ?`)) {
      return
    }
    setError(null)
    try {
      await deleteCreneau(token, item.id)
      setSuccess('Créneau supprimé.')
      if (editingId === item.id) resetForm()
      await load()
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Suppression impossible')
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <p className="admin-kicker">Disponibilités</p>
          <h1>Publier mes créneaux</h1>
          <p className="admin-muted">
            Les créneaux libres deviennent réservables par les apprenants. Une fois réservés, ils ne
            sont plus modifiables.
          </p>
        </div>
      </header>

      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}

      <form className="admin-card" onSubmit={handleSubmit}>
        <h3>{editingId ? 'Modifier le créneau' : 'Nouveau créneau'}</h3>
        <div className="reserv-create-grid">
          <label>
            Date
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label>
            Début
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </label>
          <label>
            Fin
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
          </label>
        </div>
        <div className="admin-actions-row">
          <button type="submit" className="btn-primary" disabled={saving}>
            <Plus size={16} />
            {saving ? 'Enregistrement…' : editingId ? 'Enregistrer' : 'Publier'}
          </button>
          {editingId ? (
            <button type="button" className="btn-outline" onClick={resetForm}>
              Annuler
            </button>
          ) : null}
        </div>
      </form>

      <section className="admin-card" style={{ marginTop: '1.25rem' }}>
        <h3>Créneaux libres ({editable.length})</h3>
        {loading ? <p className="admin-muted">Chargement…</p> : null}
        {!loading && editable.length === 0 ? (
          <p className="admin-muted">Aucun créneau libre publié pour le moment.</p>
        ) : null}
        <ul className="upcoming-list">
          {editable.map((item) => (
            <li key={item.id}>
              <div className="upcoming-item-main">
                <strong>
                  {formatDateLabel(item.date)} · {item.startTime} – {item.endTime}
                </strong>
                <span>Libre · {item.priceFcfa.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="admin-actions-row">
                <button type="button" className="btn-icon" onClick={() => startEdit(item)}>
                  <Pencil size={16} />
                </button>
                <button type="button" className="btn-icon" onClick={() => void handleDelete(item)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {reserved.length > 0 ? (
        <section className="admin-card" style={{ marginTop: '1.25rem' }}>
          <h3>Déjà réservés / bloqués ({reserved.length})</h3>
          <ul className="upcoming-list">
            {reserved.map((item) => (
              <li key={item.id}>
                <div className="upcoming-item-main">
                  <strong>
                    {formatDateLabel(item.date)} · {item.startTime} – {item.endTime}
                  </strong>
                  <span>
                    {item.status}
                    {item.reservationStatus ? ` · ${item.reservationStatus}` : ''}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
