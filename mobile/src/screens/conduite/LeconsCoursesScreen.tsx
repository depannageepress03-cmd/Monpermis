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
import { SafeAreaView } from 'react-native-safe-area-context'
import { fetchCourseProgress } from '../../api/conduite'
import { PageNavbar } from '../../components/PageNavbar'
import { ScreenLoader } from '../../components/ScreenLoader'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import type { RootStackParamList } from '../../navigation/types'
import { brand, colors } from '../../theme'
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
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
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
                      {completed ? 'Terminé' : !unlocked ? 'Verrouillé' : `${course.modules.length} module${course.modules.length > 1 ? 's' : ''}`}
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
    paddingTop: 8,
    paddingBottom: 28,
  },
  header: {
    marginBottom: 24,
  },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: brand.green,
    marginBottom: 6,
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
    backgroundColor: brand.green,
  },
  accentGold: {
    width: 18,
    backgroundColor: brand.gold,
  },
  accentNavy: {
    width: 12,
    backgroundColor: brand.navy,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: brand.navyMuted,
    maxWidth: 340,
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
    fontSize: 12,
    fontWeight: '700',
    color: '#B8860B',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: brand.navy,
  },
  lockHint: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
    color: brand.navyMuted,
  },
  textMuted: {
    color: brand.navyMuted,
  },
  centerBox: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: brand.navy,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: brand.navyMuted,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.88,
  },
})
