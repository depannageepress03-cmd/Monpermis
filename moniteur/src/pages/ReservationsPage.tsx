import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarCheck, Check, Hourglass, RefreshCw, X } from 'lucide-react'
import {
  confirmReservation,
  fetchReservations,
  refuseReservation,
  type ReservationItem,
} from '../api/portal'
import { getMoniteurToken, isAuthError } from '../context/MoniteurAuthContext'
import { PageSection } from '../components/model/PageSection'
import { dateParts, Empty, formatMoney, Notice, PanelHead, SessionRow } from '../components/model/Kit'

type Tab = 'pending' | 'confirmed'

export function ReservationsPage() {
  const [items, setItems] = useState<ReservationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('pending')

  const load = useCallback(async () => {
    const token = getMoniteurToken()
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      const data = await fetchReservations(token, 'all_active')
      setItems(data.reservations)
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const pending = useMemo(() => items.filter((item) => item.status === 'pending_moniteur'), [items])
  const confirmed = useMemo(() => items.filter((item) => item.status === 'confirmed'), [items])
  const visible = tab === 'pending' ? pending : confirmed

  const handleConfirm = async (item: ReservationItem) => {
    const token = getMoniteurToken()
    if (!token) return
    setBusyId(item.id)
    setError(null)
    setSuccess(null)
    try {
      await confirmReservation(token, item.id)
      setSuccess(`Réservation confirmée pour ${item.user?.fullName || 'l’apprenant'}.`)
      await load()
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Confirmation impossible')
    } finally {
      setBusyId(null)
    }
  }

  const handleRefuse = async (item: ReservationItem) => {
    const token = getMoniteurToken()
    if (!token) return
    const reason = window.prompt('Motif du refus (optionnel) :', 'Indisponible sur ce créneau')
    if (reason === null) return
    setBusyId(item.id)
    setError(null)
    setSuccess(null)
    try {
      await refuseReservation(token, item.id, reason)
      setSuccess('Demande refusée. Le créneau a été libéré.')
      await load()
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Refus impossible')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <PageSection
      kicker="Réservations"
      title="Mes rendez-vous"
      subtitle="Validez les demandes payées, puis suivez vos séances confirmées."
      actions={
        <button type="button" className="cx-refresh" onClick={() => void load()} disabled={loading}>
          <RefreshCw aria-hidden />
          Actualiser
        </button>
      }
    >
      <Notice error={error} success={success} />

      <section className="cx-panel">
        <PanelHead
          icon={tab === 'pending' ? <Hourglass aria-hidden /> : <CalendarCheck aria-hidden />}
          title={tab === 'pending' ? 'Demandes à confirmer' : 'Séances confirmées'}
          sub={
            tab === 'pending'
              ? 'L’apprenant a payé : acceptez ou refusez la séance.'
              : 'Vos prochaines séances avec les apprenants.'
          }
          extra={
            <div className="cx-seg" role="group" aria-label="Filtrer les réservations">
              <button
                type="button"
                className={tab === 'pending' ? 'cx-on' : ''}
                aria-pressed={tab === 'pending'}
                onClick={() => setTab('pending')}
              >
                À confirmer ({pending.length})
              </button>
              <button
                type="button"
                className={tab === 'confirmed' ? 'cx-on' : ''}
                aria-pressed={tab === 'confirmed'}
                onClick={() => setTab('confirmed')}
              >
                Confirmées ({confirmed.length})
              </button>
            </div>
          }
        />

        {loading ? <p className="cx-loading">Chargement…</p> : null}
        {!loading && visible.length === 0 ? (
          <Empty>{tab === 'pending' ? 'Aucune demande en attente.' : 'Aucune séance confirmée.'}</Empty>
        ) : null}

        <div className="cx-sess">
          {visible.map((item) => (
            <SessionRow
              key={item.id}
              date={item.creneau?.date}
              tone={tab === 'pending' ? 'gold' : undefined}
              title={item.user?.fullName || 'Apprenant'}
              lines={[
                item.creneau
                  ? `${dateParts(item.creneau.date).long} · ${item.creneau.startTime} – ${item.creneau.endTime}`
                  : 'Créneau indisponible',
                item.user?.phone || item.user?.email || null,
              ]}
              amount={formatMoney(item.priceFcfa)}
              chip={
                tab === 'pending' ? (
                  <span className="cx-chip-ok cx-chip-wait">En attente</span>
                ) : (
                  <span className="cx-chip-ok">Confirmée</span>
                )
              }
              actions={
                tab === 'pending' ? (
                  <>
                    <button
                      type="button"
                      className="cx-btn cx-btn-fill cx-btn-sm"
                      disabled={busyId === item.id}
                      onClick={() => void handleConfirm(item)}
                    >
                      <Check aria-hidden />
                      Accepter
                    </button>
                    <button
                      type="button"
                      className="cx-btn cx-btn-danger cx-btn-sm"
                      disabled={busyId === item.id}
                      onClick={() => void handleRefuse(item)}
                    >
                      <X aria-hidden />
                      Refuser
                    </button>
                  </>
                ) : undefined
              }
            />
          ))}
        </div>
      </section>
    </PageSection>
  )
}
