import { useCallback, useRef, useState } from 'react'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Check, ChevronRight, ClipboardList, HelpCircle, Layers } from 'lucide-react-native'
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import {
  ContentError,
  fetchLearnerProgress,
  fetchRevisionChaptersSWR,
  type RevisionChapter,
} from '../../api/revision'
import { DarkScreen } from '../../components/DarkScreen'
import { EmptyState } from '../../components/EmptyState'
import { PageNavbar } from '../../components/PageNavbar'
import { ScreenLoader } from '../../components/ScreenLoader'
import { SkeletonList } from '../../components/Skeleton'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import type { RootStackParamList } from '../../navigation/types'
import { dark, fonts, radii } from '../../theme'

type Nav = NativeStackNavigationProp<RootStackParamList, 'RevisionChapitres'>

export function RevisionChapitresScreen() {
  const navigation = useNavigation<Nav>()
  const { user, loading: authLoading } = useRequireAuth(navigation)
  const [chapters, setChapters] = useState<RevisionChapter[]>([])
  const [completedTestIds, setCompletedTestIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasDataRef = useRef(false)

  const loadChapters = useCallback(async (silent = false) => {
    if (!silent && !hasDataRef.current) setLoading(true)
    setError(null)
    try {
      const progressPromise = fetchLearnerProgress()
      await fetchRevisionChaptersSWR((data, meta) => {
        setChapters(data)
        if (data.length > 0) hasDataRef.current = true
        if (meta.fromCache) setLoading(false)
      })
      const progress = await progressPromise
      setCompletedTestIds(new Set(progress.completedTests.map((entry) => entry.chapterId)))
    } catch (err) {
      if (!hasDataRef.current) {
        setError(err instanceof ContentError ? err.message : 'Chargement impossible')
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      if (user) void loadChapters()
    }, [user, loadChapters]),
  )

  const openQuestions = (chapter: RevisionChapter, index: number) => {
    navigation.navigate('ChapterQuestionsList', {
      chapterId: chapter.id,
      chapterName: `${index + 1}. ${chapter.name}`,
      chapterOrder: chapter.order || index + 1,
    })
  }

  const openTestSubject = (chapter: RevisionChapter, index: number) => {
    navigation.navigate('ChapterTestSubject', {
      chapterId: chapter.id,
      chapterName: `${index + 1}. ${chapter.name}`,
      chapterOrder: chapter.order || index + 1,
    })
  }

  if (authLoading || !user) return <ScreenLoader />

  return (
    <DarkScreen>
      <PageNavbar
        title="Révision"
        icon={Layers}
        onBack={() => navigation.navigate('CodeRoute')}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              void loadChapters(true)
            }}
            tintColor={dark.green}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.heroEyebrow}>Code de la route</Text>
          <Text style={styles.subtitle}>
            Entraînez-vous aux questions, puis validez chaque chapitre avec un sujet test.
          </Text>
        </View>

        {loading ? <SkeletonList count={4} /> : null}

        {error && chapters.length === 0 ? (
          <EmptyState
            icon={<Layers size={30} color={dark.textMuted} />}
            title="Chargement impossible"
            message={error}
          />
        ) : null}

        {!loading && !error && chapters.length === 0 ? (
          <EmptyState
            icon={<Layers size={30} color={dark.textMuted} />}
            title="Aucun chapitre disponible"
            message="Les chapitres publiés par votre auto-école apparaîtront ici."
          />
        ) : null}

        {chapters.length > 0 && !error
          ? chapters.map((chapter, index) => {
              const testDone = completedTestIds.has(chapter.id)

              return (
                <View key={chapter.id} style={styles.card}>
                  <Pressable
                    style={({ pressed }) => [styles.cardTop, pressed && styles.pressed]}
                    onPress={() => openQuestions(chapter, index)}
                    accessibilityRole="button"
                    accessibilityLabel={`Chapitre ${index + 1} : ${chapter.name}. Ouvrir les questions.`}
                  >
                    <View style={styles.iconWrap}>
                      <Text style={styles.cardNumber}>{index + 1}</Text>
                    </View>
                    <View style={styles.cardContent}>
                      <Text style={styles.cardTitle}>{chapter.name}</Text>
                      <View style={styles.statusRow}>
                        {testDone ? (
                          <View style={styles.statusPillDone}>
                            <Check size={12} color={dark.green} />
                            <Text style={styles.statusPillDoneText}>Test validé</Text>
                          </View>
                        ) : (
                          <Text style={styles.cardSubtitle}>Questions + sujet test</Text>
                        )}
                      </View>
                    </View>
                    <ChevronRight size={18} color={dark.textMuted} />
                  </Pressable>

                  <View style={styles.actionsDivider} />

                  <View style={styles.actions}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.actionBtnPrimary,
                        pressed && styles.pressedStrong,
                      ]}
                      onPress={() => openQuestions(chapter, index)}
                      accessibilityRole="button"
                      accessibilityLabel="Questions"
                    >
                      <HelpCircle size={16} color="#0B0F1A" />
                      <Text style={styles.actionLabelPrimary}>Questions</Text>
                    </Pressable>

                    <Pressable
                      style={({ pressed }) => [
                        styles.actionBtnSecondary,
                        pressed && styles.pressedStrong,
                      ]}
                      onPress={() => openTestSubject(chapter, index)}
                      accessibilityRole="button"
                      accessibilityLabel="Sujet test"
                    >
                      <ClipboardList size={16} color={dark.textPrimary} />
                      <Text style={styles.actionLabelSecondary}>Sujet test</Text>
                    </Pressable>
                  </View>
                </View>
              )
            })
          : null}
      </ScrollView>
    </DarkScreen>
  )
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 28,
  },
  header: {
    marginBottom: 24,
  },
  heroEyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: dark.green,
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  subtitle: {
    marginTop: 8,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: dark.textMuted,
  },
  card: {
    borderRadius: radii.lg,
    backgroundColor: dark.surface,
    borderWidth: 1,
    borderColor: dark.border,
    padding: 16,
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: dark.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardNumber: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: dark.green,
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    color: dark.textPrimary,
  },
  statusRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardSubtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: dark.textMuted,
  },
  statusPillDone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: dark.greenSoft,
  },
  statusPillDoneText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: dark.green,
  },
  actionsDivider: {
    height: 1,
    backgroundColor: dark.border,
    marginTop: 14,
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtnPrimary: {
    flex: 1.2,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    backgroundColor: dark.green,
  },
  actionBtnSecondary: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    backgroundColor: dark.surfaceRaised,
    borderWidth: 1,
    borderColor: dark.border,
  },
  actionLabelPrimary: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: '#0B0F1A',
  },
  actionLabelSecondary: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: dark.textPrimary,
  },
  pressed: {
    opacity: 0.92,
  },
  pressedStrong: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
})
