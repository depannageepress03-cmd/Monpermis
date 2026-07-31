/**
 * Diffuseur SSE en mémoire pour le fil d’activité superadmin.
 * Même hypothèse que paymentEvents : un seul process Render.
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

export function addActivityEventClient(res) {
  clients.add(res)
  ensureHeartbeat()
}

export function removeActivityEventClient(res) {
  clients.delete(res)
}

export function broadcastActivityEvent(event) {
  const payload = `data: ${JSON.stringify(event)}\n\n`
  for (const res of clients) {
    try {
      res.write(payload)
    } catch {
      clients.delete(res)
    }
  }
}
