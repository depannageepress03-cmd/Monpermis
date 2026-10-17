import { useCallback, useEffect, useState } from 'react'
import { History, RefreshCw } from 'lucide-react'
import { fetchHistory, type ReservationItem } from '../api/portal'
import { getMoniteurToken, isAuthError } from '../context/MoniteurAuthContext'
import { PageSection } from '../components/model/PageSection'
import { dateParts, Empty, formatMoney, Notice, PanelHead, SessionRow } from '../components/model/Kit'

const FILTERS = [
  { value: '', label: 'Tous' },
  { value: 'completed', label: 'Effectuées' },
  { value: 'confirmed', label: 'Confirmées' },
  { value: 'cancelled', label: 'Annulées / refusées' },
] as const

function statusChip(status: string) {
  if (status === 'completed') return <span className="cx-chip-ok">Effectuée</span>
  if (status === 'confirmed') return <span className="cx-chip cx-blue">Confirmée</span>
  if (status === 'cancelled') return <span className="cx-chip-ok cx-chip-ko">Annulée / refusée</span>
  return <span className="cx-chip">{status}</span>
}

function toneOf(status: string): 'navy' | 'grey' | undefined {
  if (status === 'confirmed') return 'navy'
  if (status === 'cancelled') return 'grey'
  return undefined
}

export function HistoriquePage() {
  const [items, setItems] = useState<ReservationItem[]>([])
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const token = getMoniteurToken()
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchHistory(token, status || undefined)
      setItems(data.reservations)
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <PageSection
      kicker="Historique"
      title="Mes rendez-vous passés"
      subtitle="Séances effectuées, confirmées, annulées ou refusées."
      actions={
        <button type="button" className="cx-refresh" onClick={() => void load()} disabled={loading}>
          <RefreshCw aria-hidden />
          Actualiser
        </button>
      }
    >
      <Notice error={error} />

      <section className="cx-panel">
        <PanelHead
          icon={<History aria-hidden />}
          title="Historique des séances"
          sub={loading ? 'Chargement…' : `${items.length} rendez-vous`}
          extra={
            <div className="cx-seg" role="group" aria-label="Filtrer par statut">
              {FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  className={status === filter.value ? 'cx-on' : ''}
                  aria-pressed={status === filter.value}
                  onClick={() => setStatus(filter.value)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          }
        />

        {!loading && items.length === 0 ? <Empty>Aucun rendez-vous dans cet historique.</Empty> : null}

        <div className="cx-sess">
          {items.map((item) => (
            <SessionRow
              key={item.id}
              date={item.creneau?.date}
              tone={toneOf(item.status)}
              title={item.user?.fullName || 'Apprenant'}
              lines={[
                item.creneau
                  ? `${dateParts(item.creneau.date).long} · ${item.creneau.startTime} – ${item.creneau.endTime}`
                  : 'Séance',
              ]}
              warning={item.cancellationReason ? `Motif : ${item.cancellationReason}` : undefined}
              chip={statusChip(item.status)}
              amount={formatMoney(item.priceFcfa)}
            />
          ))}
        </div>
      </section>
    </PageSection>
  )
}
