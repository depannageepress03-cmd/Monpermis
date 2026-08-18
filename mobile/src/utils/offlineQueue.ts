import AsyncStorage from '@react-native-async-storage/async-storage'

const QUEUE_KEY = '@mp/offline-queue:v1'

export interface OfflineAction {
  id: string
  type: 'markCourseCompleted' | 'markTestCompleted' | 'courseSessionStart' | 'progressSync'
  payload: Record<string, unknown>
  createdAt: number
  retries: number
}

async function readQueue(): Promise<OfflineAction[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeQueue(queue: OfflineAction[]) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

let actionCounter = 0

function generateId(): string {
  actionCounter++
  return `offline_${Date.now()}_${actionCounter}`
}

/**
 * Ajoute une action à la file d'attente hors-ligne.
 */
export async function enqueueAction(
  type: OfflineAction['type'],
  payload: Record<string, unknown>,
): Promise<string> {
  const action: OfflineAction = {
    id: generateId(),
    type,
    payload,
    createdAt: Date.now(),
    retries: 0,
  }
  const queue = await readQueue()
  queue.push(action)
  await writeQueue(queue)
  return action.id
}

/**
 * Récupère toutes les actions en attente.
 */
export async function getPendingActions(): Promise<OfflineAction[]> {
  return readQueue()
}

/**
 * Supprime une action de la file (après exécution réussie).
 */
export async function removeAction(id: string): Promise<void> {
  const queue = await readQueue()
  const next = queue.filter((a) => a.id !== id)
  await writeQueue(next)
}

/**
 * Incrémente le compteur de tentatives d'une action.
 */
export async function bumpRetries(id: string): Promise<void> {
  const queue = await readQueue()
  for (const action of queue) {
    if (action.id === id) {
      action.retries++
      break
    }
  }
  await writeQueue(queue)
}

/**
 * Supprime les actions avec trop de tentatives (> 5).
 */
export async function pruneStaleActions(maxRetries = 5): Promise<number> {
  const queue = await readQueue()
  const before = queue.length
  const next = queue.filter((a) => a.retries <= maxRetries)
  await writeQueue(next)
  return before - next.length
}

/**
 * Vide toute la file.
 */
export async function clearQueue(): Promise<void> {
  await writeQueue([])
}

/**
 * Nombre d'actions en attente.
 */
export async function pendingCount(): Promise<number> {
  const queue = await readQueue()
  return queue.length
}
