import { logActivity } from '../utils/activityLog.js'

/**
 * Diffuseur SSE en mémoire pour le suivi temps réel des paiements côté admin.
 * Un seul process Render (pas de scaling horizontal) → pas besoin de Redis pub/sub.
 */
const clients = new Set()
const HEARTBEAT_MS = 25000

let heartbeatTimer = null

function ensureHeartbeat() {
  if (heartbeatTimer) return
  heartbeatTimer = setInterval(() => {
    for (const res of clients) {
      try {
        res.write(': ping\n\n')
      } catch {
        clients.delete(res)
      }
    }
  }, HEARTBEAT_MS)
  heartbeatTimer.unref?.()
}

export function addPaymentEventClient(res) {
  clients.add(res)
  ensureHeartbeat()
}

export function removePaymentEventClient(res) {
  clients.delete(res)
}

function mirrorPaymentAsActivity(event) {
  try {
    if (event?.type === 'payment.updated' && event.payment) {
      const p = event.payment
      const learner = p.learner
      const name = learner
        ? `${learner.firstName || ''} ${learner.lastName || ''}`.trim() || 'Apprenant'
        : 'Apprenant'
      const amount = Number(p.amount) || 0
      const status = String(p.status || '')
      logActivity({
        actorType: 'user',
        actorId: p.userId || learner?.id || null,
        actorName: name,
        action: `payment.${status || 'updated'}`,
        resource: 'payment',
        resourceId: p.id || null,
        summary: `Paiement ${status || 'mis à jour'} · ${amount.toLocaleString('fr-FR')} FCFA`,
        severity:
          status === 'approved' ? 'success' : status === 'failed' || p.needsRefund ? 'warning' : 'info',
        metadata: {
          status,
          amount,
          module: p.module || null,
          channel: p.channel || p.method || null,
        },
      })
      return
    }
    if (event?.type === 'access_request.updated' && event.accessRequest) {
      const ar = event.accessRequest
      const learner = ar.learner
      const name = learner
        ? `${learner.firstName || ''} ${learner.lastName || ''}`.trim() || 'Apprenant'
        : 'Apprenant'
      logActivity({
        actorType: 'user',
        actorId: ar.userId || learner?.id || null,
        actorName: name,
        action: `access.${ar.status || 'updated'}`,
        resource: 'access_request',
        resourceId: ar.id || null,
        summary: `Abonnement ${ar.module || ''} · ${ar.status || 'mis à jour'}`,
        severity: ar.status === 'actif' ? 'success' : 'info',
        metadata: { module: ar.module, status: ar.status },
      })
    }
  } catch {
    // jamais bloquant
  }
}

export function broadcastPaymentEvent(event) {
  const payload = `data: ${JSON.stringify(event)}\n\n`
  for (const res of clients) {
    try {
      res.write(payload)
    } catch {
      clients.delete(res)
    }
  }
  mirrorPaymentAsActivity(event)
}
