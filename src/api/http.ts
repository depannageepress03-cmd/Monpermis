/** fetch avec garde-fou : aucune requête ne pend indéfiniment (défaut 25 s). */
export async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
  ms = 25000,
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: init?.signal ?? controller.signal })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError' && !init?.signal?.aborted) {
      throw new Error('Délai de réponse dépassé. Vérifiez votre connexion.')
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}
