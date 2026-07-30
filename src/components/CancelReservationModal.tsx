import type { ReservationItem } from '../api/reservations'

export function CancelReservationModal({
  target,
  reason,
  cancelling,
  onReasonChange,
  onClose,
  onConfirm,
}: {
  target: ReservationItem
  reason: string
  cancelling: boolean
  onReasonChange: (value: string) => void
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <div
      className="cancel-modal-backdrop"
      role="presentation"
      onClick={() => !cancelling && onClose()}
    >
      <div
        className="cancel-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="cancel-modal-title">Annuler la séance</h3>
        <p className="subtitle">
          {target.creneau
            ? `${target.creneau.date} · ${target.creneau.startTime}`
            : 'Séance'}{' '}
          — {target.moniteur?.fullName || 'Moniteur'}
        </p>
        <label className="field-label" htmlFor="cancel-reason">
          Justification (obligatoire)
        </label>
        <textarea
          id="cancel-reason"
          className="field-input cancel-reason-input"
          rows={4}
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="Ex. Empêchement familial, maladie, problème de transport…"
          maxLength={500}
          disabled={cancelling}
        />
        <div className="cancel-modal-actions">
          <button type="button" className="btn-outline" disabled={cancelling} onClick={onClose}>
            Fermer
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={cancelling || reason.trim().length < 5}
            onClick={onConfirm}
          >
            {cancelling ? 'Annulation…' : 'Confirmer l’annulation'}
          </button>
        </div>
      </div>
    </div>
  )
}
