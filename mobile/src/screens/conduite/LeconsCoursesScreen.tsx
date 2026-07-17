import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import {
  BookOpen,
  Check,
  ChevronRight,
  Lock,
} from 'lucide-react-native'
import { useCallback, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { fetchCourseProgress } from '../../api/conduite'
import { DarkScreen } from '../../components/DarkScreen'
import { PageNavbar } from '../../components/PageNavbar'
import { ScreenLoader } from '../../components/ScreenLoader'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import type { RootStackParamList } from '../../navigation/types'
import { dark, fonts } from '../../theme'
import { formatChapterHeading, formatCourseHeading } from '../../utils/chapterLabel'

type Nav = NativeStackNavigationProp<RootStackParamList, 'LeconsCourses'>
type Route = RouteProp<RootStackParamList, 'LeconsCourses'>

export function LeconsCoursesScreen() {
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
          icon={BookOpen}
          onBack={() => navigation.navigate('LeconsChapitres')}
          tone="drive"
          numberOfLines={2}
        />

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.accentRow}>
              <View style={[styles.accent, styles.accentGreen]} />
              <View style={[styles.accent, styles.accentGold]} />
              <View style={[styles.accent, styles.accentNavy]} />
            </View>
            <Text style={styles.subtitle}>
              Validez chaque cours pour débloquer le suivant.
            </Text>
          </View>

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
                    navigation.navigate('LeconDetail', {
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
                      {completed ? 'Terminé' : !unlocked ? 'Verrouillé' : `${course.modules.length} module${course.modules.length > 1 ? 's' : ''}`}
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
