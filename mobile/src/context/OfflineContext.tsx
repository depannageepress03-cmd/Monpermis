import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNetInfo, refreshNetInfo } from '../hooks/useNetInfo'
import {
  enqueueAction,
  getPendingActions,
  removeAction,
  bumpRetries,
  pruneStaleActions,
  type OfflineAction,
} from '../utils/offlineQueue'

interface OfflineContextValue {
  isOffline: boolean
  isOnline: boolean
  pendingActions: OfflineAction[]
  pendingCount: number
  enqueue: (type: OfflineAction['type'], payload: Record<string, unknown>) => Promise<string>
  syncNow: () => Promise<void>
  refreshing: boolean
}

const OfflineContext = createContext<OfflineContextValue | null>(null)

async function replayAction(action: OfflineAction): Promise<boolean> {
  const { apiAuthed } = await import('../api/client')
  try {
    switch (action.type) {
      case 'markCourseCompleted': {
        const { chapterId, courseId } = action.payload as { chapterId: string; courseId: string }
        await apiAuthed('/content/revision/progress', {
          method: 'POST',
          body: JSON.stringify({ chapterId, courseId }),
        })
        return true
      }
      case 'markTestCompleted': {
        const { chapterId, correct, total } = action.payload as {
          chapterId: string
          correct: number
          total: number
        }
        await apiAuthed('/content/revision/progress/test', {
          method: 'POST',
          body: JSON.stringify({ chapterId, correct, total }),
        })
        return true
      }
      case 'courseSessionStart': {
        const { chapterId, courseId } = action.payload as { chapterId: string; courseId: string }
        await apiAuthed('/content/revision/progress/start', {
          method: 'POST',
          body: JSON.stringify({ chapterId, courseId }),
        })
        return true
      }
      default:
        return false
    }
  } catch {
    return false
  }
}

export function OfflineProvider({ children }: { children: ReactNode }) {
  const netInfo = useNetInfo()
  const [pendingActions, setPendingActions] = useState<OfflineAction[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const syncingRef = useRef(false)

  const isOffline = !netInfo.isConnected
  const isOnline = netInfo.isConnected

  const refreshPending = useCallback(async () => {
    const actions = await getPendingActions()
    setPendingActions(actions)
  }, [])

  useEffect(() => {
    void refreshPending()
  }, [refreshPending])

  const syncNow = useCallback(async () => {
    if (syncingRef.current || isOffline) return
    syncingRef.current = true
    setRefreshing(true)
    try {
      await pruneStaleActions()
      const actions = await getPendingActions()
      if (actions.length === 0) return

      for (const action of actions) {
        const success = await replayAction(action)
        if (success) {
          await removeAction(action.id)
        } else {
          await bumpRetries(action.id)
        }
      }
      await refreshPending()
    } finally {
      syncingRef.current = false
      setRefreshing(false)
    }
  }, [isOffline, refreshPending])

  useEffect(() => {
    if (isOnline) {
      void syncNow()
      void refreshNetInfo()
    }
  }, [isOnline, syncNow])

  const enqueue = useCallback(
    async (type: OfflineAction['type'], payload: Record<string, unknown>) => {
      const id = await enqueueAction(type, payload)
      await refreshPending()
      return id
    },
    [refreshPending],
  )

  const value = useMemo(
    () => ({
      isOffline,
      isOnline,
      pendingActions,
      pendingCount: pendingActions.length,
      enqueue,
      syncNow,
      refreshing,
    }),
    [isOffline, isOnline, pendingActions, enqueue, syncNow, refreshing],
  )

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>
}

export function useOffline() {
  const context = useContext(OfflineContext)
  if (!context) {
    throw new Error('useOffline must be used within OfflineProvider')
  }
  return context
}
