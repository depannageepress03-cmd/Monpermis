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

export function broadcastPaymentEvent(event) {
  const payload = `data: ${JSON.stringify(event)}\n\n`
  for (const res of clients) {
    try {
      res.write(payload)
    } catch {
      clients.delete(res)
    }
  }
}
