import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { Download, Check, Trash2 } from 'lucide-react-native'
import {
  saveOfflineChapter,
  removeOfflineChapter,
  isChapterOffline,
  type OfflineChapterData,
} from '../utils/offlineStorage'
import { useOffline } from '../context/OfflineContext'
import { useNetInfo } from '../hooks/useNetInfo'
import { dark, fonts, radii } from '../theme'

interface DownloadChapterButtonProps {
  chapterId: string
  chapterName: string
  chapterOrder: number
  courses: OfflineChapterData['courses']
}

export function DownloadChapterButton({
  chapterId,
  chapterName,
  chapterOrder,
  courses,
}: DownloadChapterButtonProps) {
  const { isOffline } = useOffline()
  const { isConnected } = useNetInfo()
  const [downloaded, setDownloaded] = useState(false)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    let cancelled = false
    void isChapterOffline(chapterId).then((v) => {
      if (!cancelled) setDownloaded(v)
    })
    return () => {
      cancelled = true
    }
  }, [chapterId])

  const handleToggle = useCallback(async () => {
    if (downloading) return

    if (downloaded) {
      await removeOfflineChapter(chapterId)
      setDownloaded(false)
      return
    }

    if (!isConnected) return

    setDownloading(true)
    try {
      await saveOfflineChapter({
        chapterId,
        chapterName,
        chapterOrder,
        courses,
        savedAt: Date.now(),
      })
      setDownloaded(true)
    } finally {
      setDownloading(false)
    }
  }, [chapterId, chapterName, chapterOrder, courses, downloaded, downloading, isConnected])

  return (
    <Pressable
      style={({ pressed }) => [
        styles.btn,
        downloaded && styles.btnDownloaded,
        pressed && styles.pressed,
      ]}
      onPress={() => void handleToggle()}
      disabled={downloading || (isOffline && !downloaded)}
      accessibilityLabel={downloaded ? 'Supprimer hors-ligne' : 'Télécharger hors-ligne'}
    >
      {downloading ? (
        <ActivityIndicator size={14} color="#FFFFFF" />
      ) : downloaded ? (
        <Check size={14} color={dark.green} />
      ) : (
        <Download size={14} color="#FFFFFF" />
      )}
      <Text
        style={[
          styles.label,
          downloaded && styles.labelDownloaded,
        ]}
      >
        {downloaded ? 'Hors ligne' : 'Télécharger'}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: dark.green,
  },
  btnDownloaded: {
    backgroundColor: 'rgba(0,176,80,0.12)',
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  labelDownloaded: {
    color: dark.green,
  },
  pressed: {
    opacity: 0.85,
  },
})
