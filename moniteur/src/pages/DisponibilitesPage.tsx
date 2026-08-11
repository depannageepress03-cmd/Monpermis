import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import {
  createCreneau,
  deleteCreneau,
  fetchAvailability,
  fetchMyCreneaux,
  saveAvailability,
  updateCreneau,
  type CreneauItem,
  type WeeklySlot,
} from '../api/portal'
import { getMoniteurToken, isAuthError } from '../context/MoniteurAuthContext'

const WEEK_DAYS = [
  { dayOfWeek: 1, label: 'Lundi' },
  { dayOfWeek: 2, label: 'Mardi' },
  { dayOfWeek: 3, label: 'Mercredi' },
  { dayOfWeek: 4, label: 'Jeudi' },
  { dayOfWeek: 5, label: 'Vendredi' },
  { dayOfWeek: 6, label: 'Samedi' },
  { dayOfWeek: 0, label: 'Dimanche' },
] as const

type TimeInterval = { start: string; end: string }
type EditDayHours = {
  dayOfWeek: number
  enabled: boolean
  morning: TimeInterval
  afternoonEnabled: boolean
  afternoon: TimeInterval
}

function sortSlots(slots: WeeklySlot[]) {
  return [...slots].sort((a, b) => String(a.start).localeCompare(String(b.start)))
}

function toEditDayHours(slots: WeeklySlot[] | undefined): EditDayHours[] {
  return WEEK_DAYS.map(({ dayOfWeek }) => {
    const same = sortSlots((slots || []).filter((slot) => Number(slot.dayOfWeek) === dayOfWeek))
    const first = same[0]
    const second = same[1]
    return {
      dayOfWeek,
      enabled: same.length > 0,
      morning: {
        start: first?.start || '08:00',
        end: first?.end || '12:00',
      },
      afternoonEnabled: Boolean(second),
      afternoon: {
        start: second?.start || '14:00',
        end: second?.end || '18:00',
      },
    }
  })
}

function fromEditDayHours(days: EditDayHours[]): WeeklySlot[] {
  const result: WeeklySlot[] = []
  for (const day of days) {
    if (!day.enabled) continue
    result.push({
      dayOfWeek: day.dayOfWeek,
      start: day.morning.start,
      end: day.morning.end,
    })
    if (day.afternoonEnabled) {
      result.push({
        dayOfWeek: day.dayOfWeek,
        start: day.afternoon.start,
        end: day.afternoon.end,
      })
    }
  }
  return result
}

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
  const [dayHours, setDayHours] = useState<EditDayHours[]>(() => toEditDayHours([]))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [savingWeekly, setSavingWeekly] = useState(false)
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
      const [creneauxData, availability] = await Promise.all([
        fetchMyCreneaux(token, todayLocal()),
        fetchAvailability(token),
      ])
      setItems(creneauxData.creneaux)
      setDayHours(toEditDayHours(availability.weeklyAvailability))
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

  const handleWeeklySave = async (e: FormEvent) => {
    e.preventDefault()
    const token = getMoniteurToken()
    if (!token) return
    for (const day of dayHours) {
      if (!day.enabled) continue
      if (day.morning.end <= day.morning.start) {
        setError(`Horaires invalides pour ${WEEK_DAYS.find((d) => d.dayOfWeek === day.dayOfWeek)?.label}`)
        return
      }
      if (day.afternoonEnabled && day.afternoon.end <= day.afternoon.start) {
        setError('Plage après-midi invalide')
        return
      }
    }
    setSavingWeekly(true)
    setError(null)
    setSuccess(null)
    try {
      const slots = fromEditDayHours(dayHours)
      const data = await saveAvailability(token, slots)
      setDayHours(toEditDayHours(data.weeklyAvailability))
      setSuccess('Disponibilités hebdomadaires enregistrées. Elles apparaissent dans l’app apprenant.')
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Enregistrement impossible')
    } finally {
      setSavingWeekly(false)
    }
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

  const updateDay = (dayOfWeek: number, patch: Partial<EditDayHours>) => {
    setDayHours((prev) =>
      prev.map((day) => (day.dayOfWeek === dayOfWeek ? { ...day, ...patch } : day)),
    )
  }

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <p className="admin-kicker">Disponibilités</p>
          <h1>Mes horaires</h1>
          <p className="admin-muted">
            Définissez vos plages hebdomadaires (matin / après-midi). Les apprenants ne peuvent
            réserver que dans ces fenêtres, hors créneaux déjà pris.
          </p>
        </div>
      </header>

      {error ? <p className="form-error">{error}</p> : null}
      {success ? <p className="form-success">{success}</p> : null}

      <form className="admin-card" onSubmit={handleWeeklySave}>
        <h3>Disponibilité hebdomadaire</h3>
        {loading ? <p className="admin-muted">Chargement…</p> : null}
        <div className="moniteur-week-grid">
          {dayHours.map((day) => {
            const label = WEEK_DAYS.find((d) => d.dayOfWeek === day.dayOfWeek)?.label || ''
            return (
              <div key={day.dayOfWeek} className="moniteur-week-day">
                <label className="admin-check-row">
                  <input
                    type="checkbox"
                    checked={day.enabled}
                    onChange={(e) => updateDay(day.dayOfWeek, { enabled: e.target.checked })}
                  />
                  <strong>{label}</strong>
                </label>
                {day.enabled ? (
                  <div className="reserv-create-grid">
                    <label>
                      Matin début
                      <input
                        type="time"
                        value={day.morning.start}
                        onChange={(e) =>
                          updateDay(day.dayOfWeek, {
                            morning: { ...day.morning, start: e.target.value },
                          })
                        }
                      />
                    </label>
                    <label>
                      Matin fin
                      <input
                        type="time"
                        value={day.morning.end}
                        onChange={(e) =>
                          updateDay(day.dayOfWeek, {
                            morning: { ...day.morning, end: e.target.value },
                          })
                        }
                      />
                    </label>
                    <label className="admin-check-row">
                      <input
                        type="checkbox"
                        checked={day.afternoonEnabled}
                        onChange={(e) =>
                          updateDay(day.dayOfWeek, { afternoonEnabled: e.target.checked })
                        }
                      />
                      Après-midi
                    </label>
                    {day.afternoonEnabled ? (
                      <>
                        <label>
                          Après-midi début
                          <input
                            type="time"
                            value={day.afternoon.start}
                            onChange={(e) =>
                              updateDay(day.dayOfWeek, {
                                afternoon: { ...day.afternoon, start: e.target.value },
                              })
                            }
                          />
                        </label>
                        <label>
                          Après-midi fin
                          <input
                            type="time"
                            value={day.afternoon.end}
                            onChange={(e) =>
                              updateDay(day.dayOfWeek, {
                                afternoon: { ...day.afternoon, end: e.target.value },
                              })
                            }
                          />
                        </label>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
        <div className="admin-actions-row" style={{ marginTop: 12 }}>
          <button type="submit" className="btn-primary" disabled={savingWeekly}>
            {savingWeekly ? 'Enregistrement…' : 'Enregistrer les horaires'}
          </button>
        </div>
      </form>

      <form className="admin-card" style={{ marginTop: '1.25rem' }} onSubmit={handleSubmit}>
        <h3>{editingId ? 'Modifier un créneau ponctuel' : 'Créneau ponctuel (optionnel)'}</h3>
        <p className="admin-muted">
          Les plages hebdo suffisent en général. Publiez un créneau précis seulement si besoin.
        </p>
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
        {!loading && editable.length === 0 ? (
          <p className="admin-muted">Aucun créneau ponctuel libre.</p>
        ) : null}
        <ul className="upcoming-list">
          {editable.map((item) => (
            <li key={item.id}>
              <div className="upcoming-item-main">
                <strong>
                  {formatDateLabel(item.date)} · {item.startTime} – {item.endTime}
                </strong>
                <span className="admin-muted">{item.priceFcfa.toLocaleString('fr-FR')} FCFA</span>
              </div>
              <div className="admin-actions-row">
                <button type="button" className="btn-outline" onClick={() => startEdit(item)}>
                  <Pencil size={14} />
                  Modifier
                </button>
                <button type="button" className="btn-text-danger" onClick={() => void handleDelete(item)}>
                  <Trash2 size={14} />
                  Supprimer
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {reserved.length > 0 ? (
        <section className="admin-card" style={{ marginTop: '1.25rem' }}>
          <h3>Créneaux réservés / bloqués ({reserved.length})</h3>
          <ul className="upcoming-list">
            {reserved.map((item) => (
              <li key={item.id}>
                <div className="upcoming-item-main">
                  <strong>
                    {formatDateLabel(item.date)} · {item.startTime} – {item.endTime}
                  </strong>
                  <span className="admin-muted">
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
