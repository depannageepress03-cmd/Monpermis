import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { setStatusBarStyle } from 'expo-status-bar'
import {
  Bell,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Lock,
} from 'lucide-react-native'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  fetchCourseProgress,
  markCourseCompleted,
  startCourseSession,
} from '../../api/revision'
import { Bouncy } from '../../components/Bouncy'
import { EmptyState } from '../../components/EmptyState'
import { FadeUp } from '../../components/FadeUp'
import { LegalFooter } from '../../components/LegalFooter'
import { MediaContent } from '../../components/MediaContent'
import { ProgressBar } from '../../components/ProgressBar'
import { ScreenLoader } from '../../components/ScreenLoader'
import { CourseDetailSkeleton } from '../../components/Skeleton'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import { useOffline } from '../../context/OfflineContext'
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications'
import type { RootStackParamList } from '../../navigation/types'
import { brand, dark, fonts, shadows } from '../../theme'
import { formatChapterHeading, formatCourseHeading } from '../../utils/chapterLabel'
import { formatSeconds, isCourseUnlocked } from '../../utils/unlock'

type Nav = NativeStackNavigationProp<RootStackParamList, 'CourseDetail'>
type Route = RouteProp<RootStackParamList, 'CourseDetail'>

const STANDALONE_CHAPTER = 'standalone'
const ORANGE = '#F97316'

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()
}

/** Détail cours code — même UX que LeconDetailScreen (conduite). */
export function CourseDetailScreen() {
  const navigation = useNavigation<Nav>()
  const route = useRoute<Route>()
  const { user, loading } = useRequireAuth(navigation)
  const { isOffline, enqueue } = useOffline()
  const unreadCount = useUnreadNotifications(Boolean(user))
  const { chapterId, chapterName, course, courses: coursesParam } = route.params
  const courses = coursesParam?.length ? coursesParam : [course]
  const isStandalone = chapterId === STANDALONE_CHAPTER

  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [progressLoading, setProgressLoading] = useState(true)
  const [secondsRemaining, setSecondsRemaining] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accessBlocked, setAccessBlocked] = useState(false)
  const [introExpanded, setIntroExpanded] = useState(false)
  const [contentStarted, setContentStarted] = useState(false)
  const scrollRef = useRef<ScrollView>(null)
  const contentY = useRef(0)

  const courseIndex = useMemo(
    () => courses.findIndex((item) => item.id === course.id),
    [courses, course.id],
  )
  const nextCourse = courseIndex >= 0 ? courses[courseIndex + 1] : undefined
  const isCompleted = completedIds.has(course.id)
  const allCompleted = courses.length > 0 && courses.every((item) => completedIds.has(item.id))
  const canValidate = !isCompleted
  const moduleCount = course.modules.length
  const progressPct = isCompleted ? 100 : 0

  const introText = useMemo(() => {
    const firstWithText = course.modules.find((m) => stripHtml(m.text || '').length > 0)
    return firstWithText ? stripHtml(firstWithText.text) : ''
  }, [course.modules])

  const firstModuleTitle = useMemo(() => {
    const mod = course.modules[0]
    if (!mod) return ''
    const title = (mod.title || mod.name || '').trim()
    if (!title) return ''
    if (title.toLowerCase() === course.title.trim().toLowerCase()) return ''
    return title
  }, [course.modules, course.title])

  const loadProgress = useCallback(async () => {
    setProgressLoading(true)
    setError(null)
    try {
      const entries = await fetchCourseProgress(chapterId)
      const ids = new Set(entries.map((entry) => entry.courseId))
      setCompletedIds(ids)

      const unlocked = isCourseUnlocked(courseIndex, courses[courseIndex - 1]?.id, ids)
      if (!unlocked) {
        setAccessBlocked(true)
        return
      }
      setAccessBlocked(false)

      if (ids.has(course.id)) {
        setSecondsRemaining(0)
        return
      }

      const session = await startCourseSession(chapterId, course.id)
      setSecondsRemaining(session.alreadyCompleted ? 0 : session.secondsRemaining)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Progression indisponible')
    } finally {
      setProgressLoading(false)
    }
  }, [chapterId, course.id, courseIndex, courses])

  useEffect(() => {
    if (user) void loadProgress()
  }, [user, loadProgress])

  useEffect(() => {
    if (isCompleted || progressLoading || accessBlocked) return
    const timer = setInterval(() => {
      setSecondsRemaining((current) => Math.max(0, current - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [isCompleted, progressLoading, accessBlocked, course.id])

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('dark')
      return () => setStatusBarStyle('dark')
    }, []),
  )

  const handleToggleComplete = async () => {
    if (isCompleted || saving || !canValidate) return
    setSaving(true)
    setError(null)
    try {
      if (isOffline) {
        await enqueue('markCourseCompleted', { chapterId, courseId: course.id })
      } else {
        await markCourseCompleted(chapterId, course.id)
      }
      setCompletedIds((current) => new Set(current).add(course.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible')
    } finally {
      setSaving(false)
    }
  }

  const startCourse = () => {
    setContentStarted(true)
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, contentY.current - 12), animated: true })
    })
  }

  if (loading || !user) return <ScreenLoader />

  const headerTitle = formatCourseHeading(courseIndex, course.title)

  const topBar = (
    <View style={styles.topBar}>
      <Pressable
        style={({ pressed }) => [styles.roundBtn, pressed && styles.pressed]}
        onPress={() => navigation.goBack()}
        accessibilityLabel="Retour"
        hitSlop={8}
      >
        <ChevronLeft size={22} color={dark.textPrimary} />
      </Pressable>
      <View style={styles.topBarCenter}>
        <View style={styles.topBarIcon}>
          <BookOpen size={15} color={dark.green} />
        </View>
        <Text style={styles.topBarTitle} numberOfLines={2}>
          {headerTitle}
        </Text>
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
  )

  if (accessBlocked) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          {topBar}
          <EmptyState
            icon={<Lock size={30} color={dark.textMuted} />}
            title="Cours verrouillé"
            message="Terminez le cours précédent pour accéder à celui-ci."
          />
          <View style={styles.footerPad}>
            <LegalFooter />
          </View>
        </SafeAreaView>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {topBar}

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[styles.scroll, !isCompleted && styles.scrollWithSticky]}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          removeClippedSubviews={false}
        >
          <FadeUp delay={40}>
            <View style={styles.progressCard}>
              <View style={styles.progressHead}>
                <View style={styles.progressIcon}>
                  <BookOpen size={14} color={dark.green} />
                </View>
                <Text style={styles.progressMeta}>
                  {moduleCount > 0
                    ? `${moduleCount} module${moduleCount > 1 ? 's' : ''}`
                    : 'Aucun module'}
                </Text>
                <Text style={styles.progressPct}>{progressPct}% terminé</Text>
              </View>
              <ProgressBar
                progress={progressPct / 100}
                color={dark.green}
                trackColor="rgba(0,16,48,0.08)"
                height={6}
              />
            </View>
          </FadeUp>

          <FadeUp delay={80}>
            <View style={styles.header}>
              <Text style={styles.kicker}>{formatChapterHeading(chapterName)}</Text>
              <View style={styles.accentRow}>
                <View style={[styles.accent, styles.accentGreen]} />
                <View style={[styles.accent, styles.accentGold]} />
                <View style={[styles.accent, styles.accentNavy]} />
              </View>
            </View>
          </FadeUp>

          {progressLoading ? <CourseDetailSkeleton /> : null}

          {!progressLoading && course.modules.length === 0 ? (
            <EmptyState
              icon={<BookOpen size={30} color={dark.green} />}
              title="Contenu à venir"
              message="Ce cours ne contient pas encore de modules publiés."
            />
          ) : null}

          {!progressLoading && course.modules.length > 0 ? (
            <FadeUp delay={120}>
              <View style={styles.introCard}>
                {firstModuleTitle ? (
                  <Text style={styles.introModuleTitle}>{firstModuleTitle}</Text>
                ) : (
                  <Text style={styles.introModuleTitle}>{course.title}</Text>
                )}

                {introText ? (
                  <>
                    <Text style={styles.introText} numberOfLines={introExpanded ? undefined : 3}>
                      {introText}
                    </Text>
                    {introText.length > 120 ? (
                      <Pressable
                        style={styles.seeMoreRow}
                        onPress={() => setIntroExpanded((v) => !v)}
                        hitSlop={8}
                      >
                        <Text style={styles.seeMore}>
                          {introExpanded ? 'Voir moins' : 'Voir plus'}
                        </Text>
                        <ChevronDown
                          size={16}
                          color={dark.green}
                          style={{
                            transform: [{ rotate: introExpanded ? '180deg' : '0deg' }],
                          }}
                        />
                      </Pressable>
                    ) : null}
                  </>
                ) : null}

                <View style={styles.infoGrid}>
                  <View style={styles.infoPill}>
                    <BookOpen size={14} color={dark.green} />
                    <View>
                      <Text style={styles.infoPillTitle}>Modules</Text>
                      <Text style={styles.infoPillSub}>{moduleCount}</Text>
                    </View>
                  </View>
                  <View style={styles.infoPill}>
                    <Check size={14} color={dark.green} />
                    <View>
                      <Text style={styles.infoPillTitle}>Statut</Text>
                      <Text style={styles.infoPillSub}>
                        {isCompleted ? 'Terminé' : 'À suivre'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </FadeUp>
          ) : null}

          <View
            onLayout={(e) => {
              contentY.current = e.nativeEvent.layout.y
            }}
          >
            {!progressLoading
              ? course.modules.map((module, index) => {
                  const moduleTitle = (module.title || module.name || '').trim()
                  const showModuleTitle =
                    moduleTitle.length > 0 &&
                    moduleTitle.toLowerCase() !== course.title.trim().toLowerCase()

                  return (
                    <FadeUp key={module.id} delay={140 + index * 40}>
                      <View style={styles.moduleCard}>
                        {moduleCount > 1 ? (
                          <Text style={styles.moduleIndex}>
                            Module {index + 1} / {moduleCount}
                          </Text>
                        ) : null}
                        <MediaContent
                          title={showModuleTitle ? moduleTitle : undefined}
                          videoUrl={module.mediaType === 'image' ? '' : module.videoUrl}
                          imageUrl={module.mediaType === 'video' ? '' : module.imageUrl}
                          text={module.text}
                        />
                      </View>
                    </FadeUp>
                  )
                })
              : null}
          </View>

          {!progressLoading ? (
            <FadeUp delay={200}>
              <View style={styles.completionCard}>
                <View style={styles.completionHead}>
                  <View style={styles.completionIcon}>
                    <Check size={18} color={dark.green} strokeWidth={3} />
                  </View>
                  <View style={styles.completionHeadCopy}>
                    <Text style={styles.completionTitle}>Validation du cours</Text>
                    <Text style={styles.completionHint}>
                      {isCompleted
                        ? 'Cours validé. Le cours suivant est débloqué.'
                        : secondsRemaining > 0
                          ? `Restez au moins 5 minutes sur ce cours. Encore ${formatSeconds(secondsRemaining)} avant de pouvoir valider.`
                          : 'Vous pouvez maintenant valider ce cours pour débloquer la suite.'}
                    </Text>
                  </View>
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.checkboxRow,
                    isCompleted && styles.checkboxRowDone,
                    !canValidate && !isCompleted && styles.checkboxRowLocked,
                    pressed && !isCompleted && canValidate && styles.checkboxPressed,
                  ]}
                  onPress={() => void handleToggleComplete()}
                  disabled={isCompleted || saving || !canValidate}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isCompleted }}
                >
                  <View style={[styles.checkbox, isCompleted && styles.checkboxChecked]}>
                    {isCompleted ? <Check size={14} color="#FFFFFF" strokeWidth={3} /> : null}
                  </View>
                  <Text style={styles.checkboxLabel}>
                    {isCompleted
                      ? 'Cours validé — vous pouvez continuer'
                      : !canValidate
                        ? `Attendez encore ${formatSeconds(secondsRemaining)}`
                        : 'J’ai terminé ce cours et je suis prêt pour la suite'}
                  </Text>
                  {saving ? <ActivityIndicator size="small" color={dark.green} /> : null}
                </Pressable>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                {isCompleted ? (
                  <View style={styles.actions}>
                    {nextCourse ? (
                      <Bouncy
                        scaleTo={0.98}
                        onPress={() =>
                          navigation.replace('CourseDetail', {
                            chapterId,
                            chapterName,
                            course: nextCourse,
                            courses,
                          })
                        }
                      >
                        <View style={styles.primaryBtn}>
                          <Text style={styles.primaryBtnText}>Cours suivant</Text>
                          <ChevronRight size={18} color="#FFFFFF" />
                        </View>
                      </Bouncy>
                    ) : isStandalone ? (
                      <Pressable
                        style={styles.secondaryBtn}
                        onPress={() => navigation.navigate('CodeCours')}
                      >
                        <Text style={styles.secondaryBtnText}>Retour aux cours</Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        style={[styles.secondaryBtn, !allCompleted && styles.btnDisabled]}
                        disabled={!allCompleted}
                        onPress={() =>
                          navigation.navigate('ChapterTestSubject', {
                            chapterId,
                            chapterName,
                          })
                        }
                      >
                        {allCompleted ? (
                          <ClipboardList size={18} color={dark.textPrimary} />
                        ) : (
                          <Lock size={18} color={dark.textMuted} />
                        )}
                        <Text
                          style={[
                            styles.secondaryBtnText,
                            !allCompleted && styles.secondaryBtnTextDisabled,
                          ]}
                        >
                          {allCompleted
                            ? 'Accéder aux sujets test'
                            : 'Terminez tous les cours pour le test'}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                ) : null}
              </View>
            </FadeUp>
          ) : null}

          <LegalFooter />
        </ScrollView>

        {!isCompleted && !progressLoading && course.modules.length > 0 && !contentStarted ? (
          <View style={styles.stickyBar}>
            <Bouncy scaleTo={0.98} onPress={startCourse}>
              <View style={styles.stickyBtn}>
                <View style={styles.stickyBtnIcon}>
                  <BookOpen size={16} color={dark.green} />
                </View>
                <Text style={styles.stickyBtnText}>Commencer le cours</Text>
                <View style={styles.stickyBtnArrow}>
                  <ChevronRight size={16} color={dark.green} />
                </View>
              </View>
            </Bouncy>
          </View>
        ) : null}
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
    gap: 8,
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
    minWidth: 0,
    paddingHorizontal: 4,
  },
  topBarIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: brand.greenPale,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  topBarTitle: {
    flexShrink: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    lineHeight: 20,
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
  scrollWithSticky: {
    paddingBottom: 110,
  },
  footerPad: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: 18,
    gap: 10,
    ...shadows.sm,
  },
  progressHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: brand.greenPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressMeta: {
    flex: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: dark.textPrimary,
  },
  progressPct: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: dark.green,
  },
  header: {
    marginBottom: 16,
  },
  kicker: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 28,
    letterSpacing: -0.5,
    color: dark.textPrimary,
    marginBottom: 10,
    lineHeight: 34,
  },
  accentRow: {
    flexDirection: 'row',
    gap: 6,
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
  introCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    gap: 10,
    ...shadows.card,
  },
  introModuleTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    lineHeight: 24,
    color: dark.textPrimary,
  },
  introText: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: dark.textMuted,
  },
  seeMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  seeMore: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: dark.green,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 6,
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexGrow: 1,
    minWidth: '40%',
    backgroundColor: brand.greenPale,
    borderRadius: 14,
    padding: 12,
  },
  infoPillTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: dark.textPrimary,
  },
  infoPillSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: dark.textMuted,
  },
  moduleCard: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 18,
    marginBottom: 14,
    ...shadows.card,
  },
  moduleIndex: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: dark.green,
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  completionCard: {
    marginTop: 4,
    borderRadius: 20,
    backgroundColor: brand.greenPale,
    padding: 20,
    marginBottom: 8,
    gap: 14,
    ...shadows.sm,
  },
  completionHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  completionIcon: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  completionHeadCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  completionTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: dark.textPrimary,
  },
  completionHint: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: dark.textMuted,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 14,
    minHeight: 56,
    ...shadows.sm,
  },
  checkboxRowDone: {
    borderWidth: 1.5,
    borderColor: 'rgba(0,176,80,0.35)',
  },
  checkboxRowLocked: {
    opacity: 0.7,
  },
  checkboxPressed: {
    opacity: 0.95,
    transform: [{ scale: 0.99 }],
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: 'rgba(0,16,48,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    borderColor: dark.green,
    backgroundColor: dark.green,
  },
  checkboxLabel: {
    flex: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    lineHeight: 20,
    color: dark.textPrimary,
  },
  errorText: {
    fontSize: 13,
    color: dark.coral,
    fontFamily: fonts.body,
  },
  actions: {
    gap: 10,
  },
  primaryBtn: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    backgroundColor: dark.green,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 52,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  secondaryBtnText: {
    color: dark.textPrimary,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  secondaryBtnTextDisabled: {
    color: dark.textMuted,
  },
  stickyBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,16,48,0.06)',
    ...shadows.md,
  },
  stickyBtn: {
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: dark.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  stickyBtnIcon: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickyBtnText: {
    flex: 1,
    textAlign: 'center',
    color: '#FFFFFF',
    fontFamily: fonts.bodyBold,
    fontSize: 16,
  },
  stickyBtnArrow: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.9,
  },
})
