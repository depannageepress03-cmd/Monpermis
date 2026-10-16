/**
 * Mémoïse une fonction async sans argument : les appels simultanés partagent la même
 * exécution, et un succès reste valable `ttlMs`. Une erreur n'est jamais gardée.
 */
export function memoizeAsync(fn, ttlMs) {
  let pending = null
  let expiresAt = 0
  let value
  const run = () => {
    if (pending) return pending
    if (Date.now() < expiresAt) return Promise.resolve(value)
    pending = fn()
      .then((result) => {
        value = result
        expiresAt = Date.now() + ttlMs
        return result
      })
      .finally(() => {
        pending = null
      })
    return pending
  }
  run.invalidate = () => {
    expiresAt = 0
  }
  return run
}
