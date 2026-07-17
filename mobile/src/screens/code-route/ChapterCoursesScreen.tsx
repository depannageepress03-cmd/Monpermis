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
import { fetchCourseProgress } from '../../api/revision'
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
  const { chapterId, chapterName, courses } = route.params

  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [progressLoading, setProgressLoading] = useState(true)

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
      if (user) void loadProgress()
    }, [user, loadProgress]),
  )

  const isCourseUnlocked = (index: number) => {
    if (index === 0) return true
    return completedIds.has(courses[index - 1]?.id)
  }

  if (loading || !user) return <ScreenLoader />

  return (
    <DarkScreen>
      <PageNavbar
        title={formatChapterHeading(chapterName)}
        icon={Layers}
        onBack={() => navigation.navigate('RevisionChapitres')}
        numberOfLines={2}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <FadeUp delay={100} style={styles.header}>
            <Text style={styles.heroEyebrow}>Cours du chapitre</Text>
            <Text style={styles.subtitle}>
              Parcours les cours dans l’ordre. Chaque leçon validée ouvre la suivante.
            </Text>
          </FadeUp>

          {progressLoading ? (
            <ActivityIndicator color={dark.green} style={{ marginBottom: 16 }} />
          ) : null}

          {courses.length === 0 ? (
            <View style={styles.centerBox}>
              <Text style={styles.emptyTitle}>Aucun cours</Text>
              <Text style={styles.emptyText}>
                Ce chapitre ne contient pas encore de cours publiés.
              </Text>
            </View>
          ) : (
            courses.map((course, index) => {
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
                        chapterName,
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
            })
          )}
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
    opacity: 0.6,
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
    fontSize: 11.5,
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
    color: dark.textMuted,
    marginTop: 4,
  },
  textMuted: {
    color: dark.textMuted,
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
