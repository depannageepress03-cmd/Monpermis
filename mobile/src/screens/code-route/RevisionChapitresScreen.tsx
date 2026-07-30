import { useCallback, useRef, useState } from 'react'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { BookOpen, ClipboardList, HelpCircle, Layers } from 'lucide-react-native'
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
import { dark, fonts } from '../../theme'

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

  const openCourses = (chapter: RevisionChapter, index: number) => {
    navigation.navigate('ChapterCourses', {
      chapterId: chapter.id,
      chapterName: `${index + 1}. ${chapter.name}`,
      courses: chapter.courses.map((course) => ({
        id: course.id,
        title: course.title,
        modules: course.modules,
      })),
    })
  }

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
        title="Nos chapitres"
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
            <Text style={styles.heroEyebrow}>Progression</Text>
            <Text style={styles.heroTitle}>Nos chapitres</Text>
            <Text style={styles.subtitle}>
              Suis chaque chapitre dans l’ordre : cours, questions, puis sujet test.
            </Text>
          </View>

          {loading && chapters.length === 0 ? <SkeletonList count={5} /> : null}

          {error && chapters.length === 0 ? (
            <View style={styles.centerBox}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.retryBtn} onPress={() => void loadChapters()}>
                <Text style={styles.retryText}>Réessayer</Text>
              </Pressable>
            </View>
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
                    <View style={styles.cardTop}>
                      <View style={styles.iconWrap}>
                        <Text style={styles.cardNumber}>{index + 1}</Text>
                      </View>
                      <View style={styles.cardContent}>
                        <Text style={styles.cardTitle}>{chapter.name}</Text>
                        <Text style={styles.cardSubtitle}>
                          {testDone
                            ? `${chapter.courses.length} cours · Chapitre validé`
                            : `${chapter.courses.length} cours · Accès libre`}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.actions}>
                      <Pressable
                        style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
                        onPress={() => openCourses(chapter, index)}
                      >
                        <View style={[styles.actionIcon, styles.actionCourses]}>
                          <BookOpen size={15} color={dark.green} />
                        </View>
                        <Text style={styles.actionLabel}>Cours</Text>
                      </Pressable>

                      <Pressable
                        style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
                        onPress={() => openQuestions(chapter, index)}
                      >
                        <View style={[styles.actionIcon, styles.actionQuestions]}>
                          <HelpCircle size={15} color={dark.coral} />
                        </View>
                        <Text style={styles.actionLabel}>Questions</Text>
                      </Pressable>

                      <Pressable
                        style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
                        onPress={() => openTestSubject(chapter, index)}
                      >
                        <View style={[styles.actionIcon, styles.actionTest]}>
                          <ClipboardList size={15} color={dark.textPrimary} />
                        </View>
                        <Text style={styles.actionLabel}>Sujet test</Text>
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
    paddingTop: 12,
    paddingBottom: 28,
  },
  header: {
    marginBottom: 22,
  },
  heroEyebrow: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: dark.green,
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  heroTitle: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 28,
    lineHeight: 34,
    color: dark.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 8,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: dark.textMuted,
    maxWidth: 340,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(34,214,115,0.28)',
    backgroundColor: dark.surface,
    padding: 12,
    marginBottom: 10,
    gap: 10,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dark.greenSoft,
  },
  cardNumber: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: dark.green,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: dark.textPrimary,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 16,
    color: dark.textMuted,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 14,
    backgroundColor: dark.surfaceRaised,
    borderWidth: 1,
    borderColor: dark.border,
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCourses: {
    backgroundColor: dark.greenSoft,
  },
  actionQuestions: {
    backgroundColor: dark.coralSoft,
  },
  actionTest: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  actionLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11.5,
    color: dark.textPrimary,
    textAlign: 'center',
  },
  centerBox: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 12,
  },
  emptyTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: dark.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: dark.textMuted,
    textAlign: 'center',
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: dark.coral,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryBtn: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: dark.green,
  },
  retryText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: '#0B0F1A',
  },
  pressed: {
    opacity: 0.85,
  },
  cardLocked: {
    opacity: 0.55,
    borderColor: dark.border,
  },
  actionDisabled: {
    opacity: 0.5,
  },
})
