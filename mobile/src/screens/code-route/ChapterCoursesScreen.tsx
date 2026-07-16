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
import { SafeAreaView } from 'react-native-safe-area-context'
import { fetchCourseProgress } from '../../api/revision'
import { PageNavbar } from '../../components/PageNavbar'
import { ScreenLoader } from '../../components/ScreenLoader'
import { FadeUp } from '../../components/FadeUp'
import { AccentBar } from '../../components/AccentBar'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import type { RootStackParamList } from '../../navigation/types'
import { brand, colors, typography } from '../../theme'
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
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <FadeUp delay={0}>
          <PageNavbar
            title={formatChapterHeading(chapterName)}
            icon={Layers}
            onBack={() => navigation.navigate('RevisionChapitres')}
            numberOfLines={2}
          />
        </FadeUp>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <FadeUp delay={100} style={styles.header}>
            <AccentBar />
            <Text style={styles.subtitle}>
              Parcourez les cours dans l’ordre. Chaque leçon validée ouvre la suivante pour
              construire vos bases solidement.
            </Text>
            <Text style={styles.detail}>
              Prenez le temps de bien comprendre chaque notion avant de passer à la suite.
            </Text>
          </FadeUp>

          {progressLoading ? (
            <ActivityIndicator color={brand.green} style={{ marginBottom: 16 }} />
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
                        <Lock size={20} color={brand.navyMuted} />
                      ) : completed ? (
                        <Check size={22} color={brand.green} />
                      ) : (
                        <BookOpen size={22} color="#B8860B" />
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
                      <ChevronRight size={20} color={brand.navyMuted} />
                    ) : (
                      <Lock size={18} color={brand.navyMuted} />
                    )}
                  </Pressable>
                </FadeUp>
              )
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
  },
  safe: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 28,
  },
  header: {
    marginBottom: 28,
  },
  subtitle: {
    ...typography.bodySmall,
    color: brand.navyMuted,
    maxWidth: 340,
  },
  detail: {
    ...typography.bodySmall,
    color: brand.navyMuted,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: `${brand.gold}55`,
    backgroundColor: brand.goldLight,
    padding: 16,
    marginBottom: 12,
  },
  cardLocked: {
    borderColor: `${brand.navy}12`,
    backgroundColor: '#F4F6F8',
  },
  cardDone: {
    borderColor: `${brand.green}45`,
    backgroundColor: brand.greenLight,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: `${brand.gold}60`,
  },
  iconWrapLocked: {
    borderColor: `${brand.navy}12`,
  },
  cardContent: {
    flex: 1,
  },
  cardIndex: {
    ...typography.caption,
    fontWeight: '700',
    color: brand.navyMuted,
    marginBottom: 2,
  },
  cardTitle: {
    ...typography.bodySemiBold,
    fontSize: 13,
    color: brand.navy,
    marginBottom: 2,
  },
  lockHint: {
    fontSize: 13,
    lineHeight: 18,
    color: brand.navyMuted,
    marginTop: 4,
  },
  textMuted: {
    color: brand.navyMuted,
  },
  testBtn: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    backgroundColor: brand.navy,
    padding: 16,
  },
  testBtnLocked: {
    backgroundColor: '#EEF1F4',
    borderWidth: 1,
    borderColor: `${brand.navy}12`,
  },
  testBtnContent: {
    flex: 1,
  },
  testBtnTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.white,
    marginBottom: 2,
  },
  testBtnSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
  },
  centerBox: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 12,
  },
  emptyTitle: {
    ...typography.h4,
    color: brand.navy,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    ...typography.bodySmall,
    color: brand.navyMuted,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.88,
  },
})
