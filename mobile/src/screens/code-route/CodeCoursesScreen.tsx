import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { setStatusBarStyle } from 'expo-status-bar'
import {
  Bell,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  GraduationCap,
  LineChart,
  ShieldCheck,
} from 'lucide-react-native'
import { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg'
import { fetchCourseChapters, fetchCourseProgress, type CourseChapter } from '../../api/revision'
import { Bouncy } from '../../components/Bouncy'
import { FadeUp } from '../../components/FadeUp'
import { LegalFooter } from '../../components/LegalFooter'
import { ProgressBar } from '../../components/ProgressBar'
import { ScreenLoader } from '../../components/ScreenLoader'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications'
import type { RootStackParamList } from '../../navigation/types'
import { brand, dark, fonts, shadows } from '../../theme'

type Nav = NativeStackNavigationProp<RootStackParamList, 'CodeCours'>

const STANDALONE_CHAPTER = 'standalone'
const ORANGE = '#F97316'
const ORANGE_SOFT = '#FFF7ED'



function CoursesHeroArt() {
  return (
    <View style={styles.heroArt} accessibilityElementsHidden>
      <Svg width={108} height={100} viewBox="0 0 108 100">
        <Ellipse cx="54" cy="78" rx="32" ry="8" fill="rgba(0,176,80,0.12)" />
        <Circle cx="54" cy="48" r="40" fill="rgba(125,211,252,0.18)" />
        <Rect x="28" y="38" width="36" height="40" rx="6" fill={dark.green} />
        <Rect x="32" y="42" width="28" height="32" rx="3" fill="#E8FFF0" />
        <Path d="M36 50h20M36 58h16M36 66h18" stroke={dark.green} strokeWidth="2" strokeLinecap="round" />
        <Rect x="44" y="28" width="36" height="40" rx="6" fill="#FFFFFF" stroke="rgba(0,16,48,0.08)" />
        <Path d="M50 40h20M50 48h14M50 56h18" stroke="rgba(0,16,48,0.2)" strokeWidth="2" strokeLinecap="round" />
        <Rect x="52" y="20" width="36" height="40" rx="6" fill={ORANGE} />
        <Rect x="56" y="24" width="28" height="32" rx="3" fill="#FFF7ED" />
        <Path d="M60 32h20M60 40h14M60 48h16" stroke={ORANGE} strokeWidth="2" strokeLinecap="round" />
        <Path
          d="M68 18c0-6 4-10 8-10 2 4 0 8-2 10 4 0 8 4 6 8-4 0-8-2-12-2z"
          fill={dark.green}
          opacity="0.85"
        />
      </Svg>
    </View>
  )
}

/** Liste cours code — même UX que LeconsCoursesScreen (conduite). */
export function CodeCoursesScreen() {
  const navigation = useNavigation<Nav>()
  const { user, loading } = useRequireAuth(navigation)
  const unreadCount = useUnreadNotifications(Boolean(user))
  const [chapters, setChapters] = useState<CourseChapter[]>([])
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [progressLoading, setProgressLoading] = useState(true)

  const load = useCallback(async () => {
    setProgressLoading(true)
    try {
      const [list, entries] = await Promise.all([
        fetchCourseChapters(),
        fetchCourseProgress(STANDALONE_CHAPTER),
      ])
      setChapters(list)
      setCompletedIds(new Set(entries.map((entry) => entry.courseId)))
    } catch {
      setChapters([])
      setCompletedIds(new Set())
    } finally {
      setProgressLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('dark')
      if (user) void load()
      return () => setStatusBarStyle('dark')
    }, [user, load]),
  )

  const allCourses = useMemo(
    () => chapters.flatMap((chapter) => chapter.courses),
    [chapters],
  )
  const completedCount = useMemo(
    () => allCourses.filter((course) => completedIds.has(course.id)).length,
    [allCourses, completedIds],
  )
  const progressRatio =
    allCourses.length > 0 ? Math.max(0, Math.min(1, completedCount / allCourses.length)) : 0

  if (loading || !user) return <ScreenLoader />

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable
            style={({ pressed }) => [styles.roundBtn, pressed && styles.pressed]}
            onPress={() => navigation.navigate('CodeRoute')}
            accessibilityLabel="Retour"
            hitSlop={8}
          >
            <ChevronLeft size={22} color={dark.textPrimary} />
          </Pressable>
          <View style={styles.topBarCenter}>
            <View style={styles.topBarIcon}>
              <BookOpen size={15} color={dark.green} />
            </View>
            <Text style={styles.topBarTitle}>Cours</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.roundBtn, pressed && styles.pressed]}
            onPress={() => navigation.navigate('Notifications')}
            accessibilityLabel="Notifications"
            hitSlop={8}
          >
            <Bell size={19} color={dark.textMuted} />
            {unreadCount > 0 ? <View style={styles.notifDot} /> : null}
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <FadeUp delay={40}>
            <View style={styles.hero}>
              <View style={styles.heroCopy}>
                <View style={styles.accentRow}>
                  <View style={[styles.accent, styles.accentGreen]} />
                  <View style={[styles.accent, styles.accentGold]} />
                  <View style={[styles.accent, styles.accentNavy]} />
                </View>
                <Text style={styles.heroTitle}>
                  Accède à tous{'\n'}
                  <Text style={styles.heroTitleAccent}>tes cours.</Text>
                </Text>
                <Text style={styles.heroSubtitle}>
                  Progresse à ton rythme et prépare efficacement ton examen.
                </Text>
              </View>
              <CoursesHeroArt />
            </View>
          </FadeUp>

          {progressLoading ? (
            <ActivityIndicator color={dark.green} style={{ marginBottom: 16 }} />
          ) : null}

          {!progressLoading && allCourses.length > 0 ? (
            <FadeUp delay={80}>
              <View style={styles.progressCard}>
                <Text style={styles.progressLabel}>
                  {completedCount} notion{completedCount > 1 ? 's' : ''} sur {allCourses.length}{' '}
                  terminée{completedCount > 1 ? 's' : ''}
                </Text>
                <ProgressBar
                  progress={progressRatio}
                  color={dark.green}
                  trackColor="rgba(0,16,48,0.08)"
                  height={8}
                />
              </View>
            </FadeUp>
          ) : null}

          {chapters.length === 0 && !progressLoading ? (
            <View style={styles.centerBox}>
              <Text style={styles.emptyTitle}>Aucun cours</Text>
              <Text style={styles.emptyText}>Aucune notion publiée pour le moment.</Text>
            </View>
          ) : (
            chapters.map((chapter, index) => {
              const total = chapter.courses.length
              const done = chapter.courses.filter((course) => completedIds.has(course.id)).length
              const chapterDone = total > 0 && done === total

              return (
                <FadeUp key={chapter.id} delay={100 + index * 50}>
                  <Bouncy
                    scaleTo={0.98}
                    onPress={() =>
                      navigation.navigate('ChapterCourses', {
                        // La progression des notions reste indexée sur « standalone ».
                        chapterId: STANDALONE_CHAPTER,
                        chapterName: chapter.name,
                        courses: chapter.courses.map((course) => ({
                          id: course.id,
                          title: course.title,
                          modules: course.modules,
                        })),
                      })
                    }
                  >
                    <View
                      style={[styles.card, chapterDone && styles.cardDone]}
                      accessibilityRole="button"
                    >
                      <View style={styles.cardAccent} />
                      <View style={[styles.iconWrap, chapterDone && styles.iconWrapDone]}>
                        {chapterDone ? (
                          <Check size={22} color={dark.green} strokeWidth={3} />
                        ) : (
                          <BookOpen size={22} color={ORANGE} />
                        )}
                      </View>
                      <View style={styles.cardContent}>
                        <Text style={styles.cardTitle}>{chapter.name}</Text>
                        <View style={styles.badgeRow}>
                          {chapterDone ? (
                            <View style={[styles.badge, styles.badgeDone]}>
                              <Check size={11} color={dark.green} strokeWidth={3} />
                              <Text style={[styles.badgeText, styles.badgeTextDone]}>Terminé</Text>
                            </View>
                          ) : (
                            <View style={styles.badge}>
                              <Text style={styles.badgeText}>
                                {done}/{total} NOTION{total > 1 ? 'S' : ''}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <View style={[styles.arrowBtn, chapterDone && styles.arrowBtnDone]}>
                        <ChevronRight size={18} color={chapterDone ? dark.green : ORANGE} />
                      </View>
                    </View>
                  </Bouncy>
                </FadeUp>
              )
            })
          )}

          <FadeUp delay={200}>
            <View style={styles.whyCard}>
              <View style={styles.whyHead}>
                <ShieldCheck size={18} color={dark.green} />
                <Text style={styles.whyTitle}>Pourquoi suivre ces cours ?</Text>
              </View>
              <View style={styles.whyGrid}>
                <View style={styles.whyItem}>
                  <View style={styles.whyIcon}>
                    <BookOpen size={16} color={dark.green} />
                  </View>
                  <Text style={styles.whyItemTitle}>Apprendre facilement</Text>
                  <Text style={styles.whyItemText}>Des leçons organisées progressivement.</Text>
                </View>
                <View style={styles.whyItem}>
                  <View style={styles.whyIcon}>
                    <Clock3 size={16} color={dark.green} />
                  </View>
                  <Text style={styles.whyItemTitle}>À ton rythme</Text>
                  <Text style={styles.whyItemText}>Reprends quand tu veux.</Text>
                </View>
                <View style={styles.whyItem}>
                  <View style={styles.whyIcon}>
                    <GraduationCap size={16} color={dark.green} />
                  </View>
                  <Text style={styles.whyItemTitle}>Réussir l’examen</Text>
                  <Text style={styles.whyItemText}>Prépare-toi efficacement.</Text>
                </View>
              </View>
            </View>
          </FadeUp>

          <FadeUp delay={240}>
            <Bouncy scaleTo={0.98} onPress={() => navigation.navigate('MesNotes')}>
              <View style={styles.progressNavCard} accessibilityRole="button">
                <View style={styles.progressNavIcon}>
                  <LineChart size={18} color={dark.green} />
                </View>
                <Text style={styles.progressNavText}>Voir ma progression</Text>
                <ChevronRight size={20} color={dark.green} />
              </View>
            </Bouncy>
          </FadeUp>

          <LegalFooter />
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  safe: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,16,48,0.05)',
    ...shadows.sm,
  },
  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  topBarCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  topBarIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: brand.greenPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 20,
    color: dark.textPrimary,
  },
  notifDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ORANGE,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 28,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
  },
  accentRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  accent: {
    height: 5,
    borderRadius: 999,
  },
  accentGreen: {
    width: 28,
    backgroundColor: dark.green,
  },
  accentGold: {
    width: 18,
    backgroundColor: ORANGE,
  },
  accentNavy: {
    width: 12,
    backgroundColor: dark.textMuted,
  },
  heroTitle: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 26,
    lineHeight: 32,
    color: dark.textPrimary,
    letterSpacing: -0.5,
  },
  heroTitleAccent: {
    color: dark.green,
  },
  heroSubtitle: {
    marginTop: 8,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: dark.textMuted,
  },
  heroArt: {
    width: 108,
    height: 100,
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    gap: 10,
    ...shadows.sm,
  },
  progressLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: dark.textPrimary,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 12,
    overflow: 'hidden',
    ...shadows.card,
  },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 12,
    width: 4,
    borderRadius: 999,
    backgroundColor: ORANGE,
  },
  cardLocked: {
    opacity: 0.7,
  },
  cardDone: {
    backgroundColor: brand.greenPale,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ORANGE_SOFT,
    marginLeft: 6,
  },
  iconWrapLocked: {
    backgroundColor: '#F1F5F9',
  },
  iconWrapDone: {
    backgroundColor: '#FFFFFF',
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  cardTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    lineHeight: 22,
    color: dark.textPrimary,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: ORANGE_SOFT,
  },
  badgeDone: {
    backgroundColor: '#FFFFFF',
  },
  badgeLocked: {
    backgroundColor: '#F1F5F9',
  },
  badgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: ORANGE,
    letterSpacing: 0.4,
  },
  badgeTextDone: {
    color: dark.green,
  },
  lockHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 16,
    color: dark.textMuted,
  },
  textMuted: {
    color: dark.textMuted,
  },
  arrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: ORANGE_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowBtnDone: {
    backgroundColor: '#FFFFFF',
  },
  whyCard: {
    marginTop: 12,
    marginBottom: 12,
    borderRadius: 24,
    backgroundColor: brand.greenPale,
    padding: 18,
    gap: 14,
  },
  whyHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  whyTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: dark.textPrimary,
  },
  whyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  whyItem: {
    width: '30%',
    flexGrow: 1,
    minWidth: 96,
    gap: 6,
  },
  whyIcon: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  whyItemTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: dark.textPrimary,
  },
  whyItemText: {
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 15,
    color: dark.textMuted,
  },
  progressNavCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    marginBottom: 8,
    ...shadows.sm,
  },
  progressNavIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: brand.greenPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressNavText: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: dark.textPrimary,
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
    opacity: 0.9,
  },
})
