import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import {
  BookOpen,
  Check,
  ChevronRight,
  Layers,
  Lock,
} from 'lucide-react-native'
import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import {
  fetchCourseProgress,
  fetchRevisionChapters,
  ContentError,
  type RevisionChapter,
} from '../../api/revision'
import { DarkScreen } from '../../components/DarkScreen'
import { PageNavbar } from '../../components/PageNavbar'
import { ScreenLoader } from '../../components/ScreenLoader'
import { FadeUp } from '../../components/FadeUp'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import type { RootStackParamList } from '../../navigation/types'
import { dark, fonts } from '../../theme'
import { formatChapterHeading, formatCourseHeading } from '../../utils/chapterLabel'

type Nav = NativeStackNavigationProp<RootStackParamList, 'ChapterCourses'>
type Route = RouteProp<RootStackParamList, 'ChapterCourses'>

export function ChapterCoursesScreen() {
  const navigation = useNavigation<Nav>()
  const route = useRoute<Route>()
  const { user, loading } = useRequireAuth(navigation)
  const { chapterId = '', chapterName = '', courses: coursesParam } = route.params ?? {}

  const [chapter, setChapter] = useState<RevisionChapter | null>(null)
  const [chapterLoading, setChapterLoading] = useState(true)
  const [chapterError, setChapterError] = useState<string | null>(null)
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [progressLoading, setProgressLoading] = useState(true)

  // Refetch par chapterId — même endpoint que le web (LearnerCourseListPage).
  const loadChapter = useCallback(async () => {
    setChapterLoading(true)
    setChapterError(null)
    try {
      const chapters = await fetchRevisionChapters()
      const found = chapters.find((item) => String(item.id) === String(chapterId)) ?? null
      if (!found) {
        setChapter(null)
        setChapterError('Chapitre introuvable ou non publié')
        return
      }
      setChapter(found)
    } catch (err) {
      setChapter(null)
      setChapterError(err instanceof ContentError ? err.message : 'Chargement impossible')
    } finally {
      setChapterLoading(false)
    }
  }, [chapterId])

  // Param de navigation en repli immédiat (deep-link sans cache), remplacé par le refetch.
  const courses = chapter?.courses ?? coursesParam ?? []
  const displayName = chapter?.name ?? chapterName

  const loadProgress = useCallback(async () => {
    setProgressLoading(true)
    try {
      const entries = await fetchCourseProgress(chapterId)
      setCompletedIds(new Set(entries.map((entry) => entry.courseId)))
    } catch {
      setCompletedIds(new Set())
    } finally {
      setProgressLoading(false)
    }
  }, [chapterId])

  useFocusEffect(
    useCallback(() => {
      if (user) {
        void loadChapter()
        void loadProgress()
      }
    }, [user, loadChapter, loadProgress]),
  )

  const doneCount = courses.filter((course) => completedIds.has(course.id)).length

  const isCourseUnlocked = (_index: number) => true

  if (loading || !user) return <ScreenLoader />

  return (
    <DarkScreen>
      <PageNavbar
        title={formatChapterHeading(displayName)}
        icon={Layers}
        onBack={() => navigation.navigate('RevisionChapitres')}
        numberOfLines={2}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <FadeUp delay={100} style={styles.header}>
            <Text style={styles.heroEyebrow}>Notions du chapitre</Text>
            <Text style={styles.subtitle}>
              Accède aux notions librement, à ton rythme.
            </Text>
            {!chapterLoading && !chapterError && courses.length > 0 ? (
              <Text style={styles.doneCount}>
                {doneCount}/{courses.length} cours terminés
              </Text>
            ) : null}
          </FadeUp>

          {chapterLoading ? (
            <ActivityIndicator color={dark.green} style={{ marginBottom: 16 }} />
          ) : null}
          {chapterError ? (
            <View style={styles.centerBox}>
              <Text style={styles.emptyTitle}>Chargement impossible</Text>
              <Text style={styles.emptyText}>{chapterError}</Text>
              <Pressable
                style={styles.retryBtn}
                onPress={() => {
                  void loadChapter()
                  void loadProgress()
                }}
                accessibilityRole="button"
                accessibilityLabel="Réessayer"
              >
                <Text style={styles.retryBtnText}>Réessayer</Text>
              </Pressable>
            </View>
          ) : null}

          {progressLoading && !chapterLoading ? (
            <ActivityIndicator color={dark.green} style={{ marginBottom: 16 }} />
          ) : null}

          {!chapterLoading && !chapterError && courses.length === 0 ? (
            <View style={styles.centerBox}>
              <Text style={styles.emptyTitle}>Aucune notion</Text>
              <Text style={styles.emptyText}>
                Ce chapitre ne contient pas encore de notion publiée.
              </Text>
            </View>
          ) : null}
          {!chapterError && courses.length > 0
            ? courses.map((course, index) => {
              const unlocked = isCourseUnlocked(index)
              const completed = completedIds.has(course.id)

              return (
                <FadeUp key={course.id} delay={220 + index * 80}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.card,
                      !unlocked && styles.cardLocked,
                      completed && styles.cardDone,
                      pressed && unlocked && styles.pressed,
                    ]}
                    disabled={!unlocked}
                    onPress={() =>
                      navigation.navigate('CourseDetail', {
                        chapterId,
                        chapterName: displayName,
                        course,
                        courses,
                      })
                    }
                  >
                    <View style={[styles.iconWrap, !unlocked && styles.iconWrapLocked]}>
                      {!unlocked ? (
                        <Lock size={20} color={dark.textMuted} />
                      ) : completed ? (
                        <Check size={22} color={dark.green} />
                      ) : (
                        <BookOpen size={22} color={dark.coral} />
                      )}
                    </View>
                    <View style={styles.cardContent}>
                      <Text style={[styles.cardTitle, !unlocked && styles.textMuted]}>
                        {formatCourseHeading(index, course.title)}
                      </Text>
                      <Text style={[styles.cardIndex, !unlocked && styles.textMuted]}>
                        {completed
                          ? 'Terminé'
                          : !unlocked
                            ? 'Verrouillé'
                            : `${course.modules.length} module${course.modules.length > 1 ? 's' : ''}`}
                      </Text>
                      {!unlocked ? (
                        <Text style={styles.lockHint}>
                          Terminez le cours précédent pour débloquer.
                        </Text>
                      ) : null}
                    </View>
                    {unlocked ? (
                      <ChevronRight size={20} color={dark.textMuted} />
                    ) : (
                      <Lock size={18} color={dark.textMuted} />
                    )}
                  </Pressable>
                </FadeUp>
              )
            }) : null}
      </ScrollView>
    </DarkScreen>
  )
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 22,
    paddingTop: 14,
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
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: dark.textMuted,
    maxWidth: 340,
  },
  doneCount: {
    marginTop: 8,
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: dark.green,
  },
  retryBtn: {
    marginTop: 14,
    borderRadius: 12,
    backgroundColor: dark.green,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,107,74,0.28)',
    backgroundColor: dark.surface,
    padding: 15,
    marginBottom: 12,
  },
  cardLocked: {
    borderColor: dark.border,
    backgroundColor: '#EEF2F7',
  },
  cardDone: {
    borderColor: 'rgba(34,214,115,0.32)',
  },
  iconWrap: {
    width: 50,
    height: 50,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dark.coralSoft,
  },
  iconWrapLocked: {
    backgroundColor: dark.surfaceRaised,
  },
  cardContent: {
    flex: 1,
  },
  cardIndex: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: dark.textMuted,
    marginBottom: 2,
  },
  cardTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 14,
    color: dark.textPrimary,
    marginBottom: 2,
  },
  lockHint: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 17,
    color: '#64748b',
    marginTop: 4,
  },
  textMuted: {
    color: '#475569',
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
  pressed: {
    opacity: 0.88,
  },
})
