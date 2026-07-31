import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { BookOpen, Check, ChevronRight, Lock } from 'lucide-react-native'
import { useCallback, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { fetchCourseProgress, fetchRevisionCourses } from '../../api/revision'
import { DarkScreen } from '../../components/DarkScreen'
import { PageNavbar } from '../../components/PageNavbar'
import { ScreenLoader } from '../../components/ScreenLoader'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import type { RootStackParamList } from '../../navigation/types'
import { dark, fonts } from '../../theme'
import { formatCourseHeading } from '../../utils/chapterLabel'

type Nav = NativeStackNavigationProp<RootStackParamList, 'CodeCours'>

const STANDALONE_CHAPTER = 'standalone'

type StandaloneCourse = Awaited<ReturnType<typeof fetchRevisionCourses>>[number]

/** Liste cours code — même UX que LeconsCoursesScreen (conduite). */
export function CodeCoursesScreen() {
  const navigation = useNavigation<Nav>()
  const { user, loading } = useRequireAuth(navigation)
  const [courses, setCourses] = useState<StandaloneCourse[]>([])
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [progressLoading, setProgressLoading] = useState(true)

  const load = useCallback(async () => {
    setProgressLoading(true)
    try {
      const [list, entries] = await Promise.all([
        fetchRevisionCourses(),
        fetchCourseProgress(STANDALONE_CHAPTER),
      ])
      setCourses(list)
      setCompletedIds(new Set(entries.map((entry) => entry.courseId)))
    } catch {
      setCourses([])
      setCompletedIds(new Set())
    } finally {
      setProgressLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      if (user) void load()
    }, [user, load]),
  )

  const isCourseUnlocked = (_index: number) => true

  if (loading || !user) return <ScreenLoader />

  return (
    <DarkScreen>
      <PageNavbar
        title="Cours"
        icon={BookOpen}
        onBack={() => navigation.navigate('CodeRoute')}
        numberOfLines={2}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.accentRow}>
            <View style={[styles.accent, styles.accentGreen]} />
            <View style={[styles.accent, styles.accentGold]} />
            <View style={[styles.accent, styles.accentNavy]} />
          </View>
          <Text style={styles.subtitle}>Accède aux cours librement, à ton rythme.</Text>
        </View>

        {progressLoading ? (
          <ActivityIndicator color={dark.green} style={{ marginBottom: 16 }} />
        ) : null}

        {courses.length === 0 && !progressLoading ? (
          <View style={styles.centerBox}>
            <Text style={styles.emptyTitle}>Aucun cours</Text>
            <Text style={styles.emptyText}>Aucun cours publié pour le moment.</Text>
          </View>
        ) : (
          courses.map((course, index) => {
            const unlocked = isCourseUnlocked(index)
            const completed = completedIds.has(course.id)

            return (
              <Pressable
                key={course.id}
                style={({ pressed }) => [
                  styles.card,
                  !unlocked && styles.cardLocked,
                  completed && styles.cardDone,
                  pressed && unlocked && styles.pressed,
                ]}
                disabled={!unlocked}
                onPress={() =>
                  navigation.navigate('CourseDetail', {
                    chapterId: STANDALONE_CHAPTER,
                    chapterName: 'Cours',
                    course: {
                      id: course.id,
                      title: course.title,
                      modules: course.modules,
                    },
                    courses: courses.map((item) => ({
                      id: item.id,
                      title: item.title,
                      modules: item.modules,
                    })),
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
    paddingTop: 8,
    paddingBottom: 28,
  },
  header: {
    marginBottom: 24,
  },
  accentRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  accent: {
    height: 4,
    borderRadius: 999,
  },
  accentGreen: {
    width: 28,
    backgroundColor: dark.green,
  },
  accentGold: {
    width: 18,
    backgroundColor: dark.coral,
  },
  accentNavy: {
    width: 12,
    backgroundColor: dark.textMuted,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: dark.textMuted,
    maxWidth: 340,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.surface,
    padding: 16,
    marginBottom: 12,
  },
  cardLocked: {
    borderColor: dark.border,
    backgroundColor: dark.surfaceRaised,
    opacity: 0.65,
  },
  cardDone: {
    borderColor: 'rgba(34,214,115,0.35)',
    backgroundColor: dark.greenSoft,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dark.coralSoft,
    borderWidth: 1,
    borderColor: dark.border,
  },
  iconWrapLocked: {
    backgroundColor: dark.surfaceRaised,
    borderColor: dark.border,
  },
  cardContent: {
    flex: 1,
  },
  cardIndex: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: dark.coral,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  cardTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: dark.textPrimary,
  },
  lockHint: {
    marginTop: 4,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 16,
    color: dark.textMuted,
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
    fontSize: 17,
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
