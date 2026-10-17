import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays, CalendarPlus, CalendarX2, ListChecks, Pencil, Plus, Save, Trash2 } from 'lucide-react'
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
import { PageSection } from '../components/model/PageSection'
import { dateParts, Empty, formatMoney, Notice, PanelHead, SessionRow } from '../components/model/Kit'

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
      morning: { start: first?.start || '08:00', end: first?.end || '12:00' },
      afternoonEnabled: Boolean(second),
      afternoon: { start: second?.start || '14:00', end: second?.end || '18:00' },
    }
  })
}

function fromEditDayHours(days: EditDayHours[]): WeeklySlot[] {
  const result: WeeklySlot[] = []
  for (const day of days) {
    if (!day.enabled) continue
    result.push({ dayOfWeek: day.dayOfWeek, start: day.morning.start, end: day.morning.end })
    if (day.afternoonEnabled) {
      result.push({ dayOfWeek: day.dayOfWeek, start: day.afternoon.start, end: day.afternoon.end })
    }
  }
  return result
}

function todayLocal() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function slotStatusChip(item: CreneauItem) {
  if (item.status === 'bloque') return <span className="cx-chip cx-red">Bloqué</span>
  if (item.reservationStatus === 'pending_moniteur') return <span className="cx-chip cx-amber">À confirmer</span>
  return <span className="cx-chip cx-green">Réservé</span>
}

function RangeInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: TimeInterval
  onChange: (next: TimeInterval) => void
}) {
  return (
    <span className="cx-range">
      <span>{label}</span>
      <input
        type="time"
        value={value.start}
        aria-label={`${label} — début`}
        onChange={(e) => onChange({ ...value, start: e.target.value })}
      />
      <i>→</i>
      <input
        type="time"
        value={value.end}
        aria-label={`${label} — fin`}
        onChange={(e) => onChange({ ...value, end: e.target.value })}
      />
    </span>
  )
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
  const activeDays = dayHours.filter((day) => day.enabled).length

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
      const data = await saveAvailability(token, fromEditDayHours(dayHours))
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
    if (!window.confirm(`Supprimer le créneau du ${item.date} ${item.startTime}–${item.endTime} ?`)) return
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
    setDayHours((prev) => prev.map((day) => (day.dayOfWeek === dayOfWeek ? { ...day, ...patch } : day)))
  }

  return (
    <PageSection
      kicker="Disponibilités"
      title="Mes horaires"
      subtitle="Les apprenants réservent uniquement dans vos plages hebdomadaires, hors créneaux déjà pris."
    >
      <Notice error={error} success={success} />

      <form className="cx-panel" onSubmit={handleWeeklySave}>
        <PanelHead
          icon={<CalendarDays aria-hidden />}
          title="Disponibilité hebdomadaire"
          sub={`${activeDays} jour${activeDays > 1 ? 's' : ''} ouvert${activeDays > 1 ? 's' : ''} à la réservation`}
          extra={
            <button type="submit" className="cx-btn cx-btn-fill" disabled={savingWeekly || loading}>
              <Save aria-hidden />
              {savingWeekly ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          }
        />
        {loading ? <p className="cx-loading">Chargement…</p> : null}
        <div className="cx-week">
          {dayHours.map((day) => {
            const label = WEEK_DAYS.find((d) => d.dayOfWeek === day.dayOfWeek)?.label || ''
            return (
              <div key={day.dayOfWeek} className="cx-week-row">
                <label className="cx-switch cx-week-day">
                  <input
                    type="checkbox"
                    checked={day.enabled}
                    onChange={(e) => updateDay(day.dayOfWeek, { enabled: e.target.checked })}
                  />
                  <i aria-hidden="true" />
                  {label}
                </label>
                {day.enabled ? (
                  <div className="cx-week-slots">
                    <RangeInput
                      label="Matin"
                      value={day.morning}
                      onChange={(morning) => updateDay(day.dayOfWeek, { morning })}
                    />
                    <label className="cx-switch">
                      <input
                        type="checkbox"
                        checked={day.afternoonEnabled}
                        onChange={(e) => updateDay(day.dayOfWeek, { afternoonEnabled: e.target.checked })}
                      />
                      <i aria-hidden="true" />
                      Après-midi
                    </label>
                    {day.afternoonEnabled ? (
                      <RangeInput
                        label="Après-midi"
                        value={day.afternoon}
                        onChange={(afternoon) => updateDay(day.dayOfWeek, { afternoon })}
                      />
                    ) : null}
                  </div>
                ) : (
                  <span className="cx-week-off">Fermé</span>
                )}
              </div>
            )
          })}
        </div>
      </form>

      <div className="cx-grid-2">
        <form className="cx-panel" onSubmit={handleSubmit}>
          <PanelHead
            icon={<CalendarPlus aria-hidden />}
            title={editingId ? 'Modifier un créneau ponctuel' : 'Créneau ponctuel'}
            sub="Facultatif : les plages hebdomadaires suffisent en général."
          />
          <div className="cx-form-grid cx-cols-3">
            <label>
              Date
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </label>
            <label>
              Début
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
            </label>
            <label>
              Fin
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
            </label>
          </div>
          <div className="cx-form-actions">
            <button type="submit" className="cx-btn cx-btn-fill" disabled={saving}>
              <Plus aria-hidden />
              {saving ? 'Enregistrement…' : editingId ? 'Enregistrer' : 'Publier le créneau'}
            </button>
            {editingId ? (
              <button type="button" className="cx-btn" onClick={resetForm}>
                Annuler
              </button>
            ) : null}
          </div>
        </form>

        <section className="cx-panel">
          <PanelHead
            icon={<ListChecks aria-hidden />}
            title={`Créneaux libres (${editable.length})`}
            sub="Créneaux ponctuels publiés, encore réservables"
          />
          {!loading && editable.length === 0 ? <Empty>Aucun créneau ponctuel libre.</Empty> : null}
          <div className="cx-sess">
            {editable.map((item) => (
              <SessionRow
                key={item.id}
                date={item.date}
                title={`${item.startTime} – ${item.endTime}`}
                lines={[dateParts(item.date).long, formatMoney(item.priceFcfa)]}
                actions={
                  <>
                    <button type="button" className="cx-btn cx-btn-sm" onClick={() => startEdit(item)}>
                      <Pencil aria-hidden />
                      Modifier
                    </button>
                    <button
                      type="button"
                      className="cx-btn cx-btn-danger cx-btn-sm"
                      onClick={() => void handleDelete(item)}
                    >
                      <Trash2 aria-hidden />
                      Supprimer
                    </button>
                  </>
                }
              />
            ))}
          </div>
        </section>
      </div>

      {reserved.length > 0 ? (
        <section className="cx-panel">
          <PanelHead
            icon={<CalendarX2 aria-hidden />}
            title={`Créneaux réservés ou bloqués (${reserved.length})`}
            sub="Non modifiables : une réservation y est rattachée"
          />
          <div className="cx-sess">
            {reserved.map((item) => (
              <SessionRow
                key={item.id}
                date={item.date}
                tone="grey"
                title={`${item.startTime} – ${item.endTime}`}
                lines={[dateParts(item.date).long]}
                chip={slotStatusChip(item)}
              />
            ))}
          </div>
        </section>
      ) : null}
    </PageSection>
  )
}
