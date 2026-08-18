import AsyncStorage from '@react-native-async-storage/async-storage'

const CHAPTER_PREFIX = '@mp/offline-chapter:v1:'
const CHAPTER_INDEX_KEY = '@mp/offline-chapter:v1:__index'
const MAX_OFFLINE_CHAPTERS = 20

export interface OfflineChapterData {
  chapterId: string
  chapterName: string
  chapterOrder: number
  courses: Array<{
    id: string
    title: string
    order: number
    modules: Array<{
      id: string
      name: string
      title: string
      text: string
      mediaType: '' | 'video' | 'image'
      videoUrl: string
      imageUrl: string
      mediaBytes: number
      order: number
    }>
  }>
  savedAt: number
}

async function readIndex(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(CHAPTER_INDEX_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as string[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeIndex(ids: string[]) {
  await AsyncStorage.setItem(CHAPTER_INDEX_KEY, JSON.stringify(ids.slice(-MAX_OFFLINE_CHAPTERS)))
}

async function touchIndex(id: string) {
  const index = await readIndex()
  const next = [...index.filter((item) => item !== id), id]
  while (next.length > MAX_OFFLINE_CHAPTERS) {
    const evicted = next.shift()
    if (evicted) await AsyncStorage.removeItem(`${CHAPTER_PREFIX}${evicted}`)
  }
  await writeIndex(next)
}

/**
 * Sauvegarde un chapitre complet pour usage hors-ligne.
 */
export async function saveOfflineChapter(data: OfflineChapterData): Promise<void> {
  await AsyncStorage.setItem(
    `${CHAPTER_PREFIX}${data.chapterId}`,
    JSON.stringify(data),
  )
  await touchIndex(data.chapterId)
}

/**
 * Récupère un chapitre hors-ligne.
 */
export async function getOfflineChapter(chapterId: string): Promise<OfflineChapterData | null> {
  try {
    const raw = await AsyncStorage.getItem(`${CHAPTER_PREFIX}${chapterId}`)
    if (!raw) return null
    return JSON.parse(raw) as OfflineChapterData
  } catch {
    return null
  }
}

/**
 * Liste les chapitres disponibles hors-ligne.
 */
export async function listOfflineChapters(): Promise<OfflineChapterData[]> {
  const index = await readIndex()
  const chapters: OfflineChapterData[] = []
  for (const id of index) {
    const data = await getOfflineChapter(id)
    if (data) chapters.push(data)
  }
  return chapters.sort((a, b) => a.chapterOrder - b.chapterOrder)
}

/**
 * Supprime un chapitre hors-ligne.
 */
export async function removeOfflineChapter(chapterId: string): Promise<void> {
  await AsyncStorage.removeItem(`${CHAPTER_PREFIX}${chapterId}`)
  const index = await readIndex()
  await writeIndex(index.filter((id) => id !== chapterId))
}

/**
 * Vérifie si un chapitre est disponible hors-ligne.
 */
export async function isChapterOffline(chapterId: string): Promise<boolean> {
  const data = await getOfflineChapter(chapterId)
  return data !== null
}

/**
 * Nombre de chapitres hors-ligne.
 */
export async function offlineChapterCount(): Promise<number> {
  const index = await readIndex()
  return index.length
}
