import { useCallback, useEffect } from 'react'

/**
 * Confirms before leaving an in-progress exam/quiz (tab close + explicit back).
 * Returns `confirmLeave()` for navbar / navigation handlers.
 */
export function useLeaveGuard(
  when: boolean,
  message = 'Quitter ? Votre progression en cours sera conservée si vous reprenez le même examen.',
) {
  useEffect(() => {
    if (!when) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = message
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [when, message])

  const confirmLeave = useCallback(() => {
    if (!when) return true
    return window.confirm(message)
  }, [when, message])

  return { confirmLeave }
}
