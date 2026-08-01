import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { setStatusBarStyle } from 'expo-status-bar'
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Lock,
  User,
} from 'lucide-react-native'
import { useCallback, useEffect, useMemo, useState } from 'react'
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
} from '../../api/conduite'
import { Bouncy } from '../../components/Bouncy'
import { EmptyState } from '../../components/EmptyState'
import { FadeUp } from '../../components/FadeUp'
import { LegalFooter } from '../../components/LegalFooter'
import { MediaContent } from '../../components/MediaContent'
import { ScreenLoader } from '../../components/ScreenLoader'
import { CourseDetailSkeleton } from '../../components/Skeleton'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import type { RootStackParamList } from '../../navigation/types'
import { brand, dark, fonts, shadows } from '../../theme'
import { formatChapterHeading, formatCourseHeading } from '../../utils/chapterLabel'
import { formatSeconds, isCourseUnlocked } from '../../utils/unlock'

type Nav = NativeStackNavigationProp<RootStackParamList, 'LeconDetail'>
type Route = RouteProp<RootStackParamList, 'LeconDetail'>

const ORANGE = '#F97316'
const ORANGE_SOFT = '#FFF7ED'

function CourseProgressSteps({
  courses,
  currentId,
  completedIds,
}: {
  courses: { id: string }[]
  currentId: string
  completedIds: Set<string>
}) {
  if (courses.length === 0) return null

  return (
    <View
      style={styles.stepsRow}
      accessibilityRole="progressbar"
      accessibilityLabel={`Cours ${courses.findIndex((c) => c.id === currentId) + 1} sur ${courses.length}`}
    >
      {courses.map((item) => {
        const done = completedIds.has(item.id)
        const current = item.id === currentId && !done
        return (
          <View
            key={item.id}
            style={[
              styles.step,
              done && styles.stepDone,
              current && styles.stepCurrent,
              !done && !current && styles.stepUpcoming,
            ]}
          />
        )
      })}
    </View>
  )
}

export function LeconDetailScreen() {
  const navigation = useNavigation<Nav>()
  const route = useRoute<Route>()
  const { user, loading } = useRequireAuth(navigation)
  const { chapterId, chapterName, course, courses: coursesParam } = route.params
  const courses = coursesParam?.length ? coursesParam : [course]

  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [progressLoading, setProgressLoading] = useState(true)
  const [secondsRemaining, setSecondsRemaining] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accessBlocked, setAccessBlocked] = useState(false)

  const courseIndex = useMemo(
    () => courses.findIndex((item) => item.id === course.id),
    [courses, course.id],
  )
  const nextCourse = courseIndex >= 0 ? courses[courseIndex + 1] : undefined
  const isCompleted = completedIds.has(course.id)
  const canValidate = !isCompleted

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
      await markCourseCompleted(chapterId, course.id)
      setCompletedIds((current) => new Set(current).add(course.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible')
    } finally {
      setSaving(false)
    }
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
          <BookOpen size={15} color={ORANGE} />
        </View>
        <Text style={styles.topBarTitle} numberOfLines={2}>
          {headerTitle}
        </Text>
      </View>
      <Pressable
        style={({ pressed }) => [styles.roundBtn, pressed && styles.pressed]}
        onPress={() => navigation.navigate('Profile')}
        accessibilityLabel="Profil"
        hitSlop={8}
      >
        <User size={19} color={dark.textMuted} />
      </Pressable>
    </View>
  )

  if (accessBlocked) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          {topBar}
          <View style={styles.centerBox}>
            <EmptyState
              icon={<Lock size={30} color={dark.textMuted} />}
              title="Cours verrouillé"
              message="Terminez le cours précédent pour accéder à celui-ci."
            />
          </View>
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
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          removeClippedSubviews={false}
        >
          <FadeUp delay={40}>
            <View style={styles.header}>
              <Text style={styles.heroTitle}>{formatChapterHeading(chapterName)}</Text>
              <CourseProgressSteps
                courses={courses}
                currentId={course.id}
                completedIds={completedIds}
              />
            </View>
          </FadeUp>

          {course.modules.length === 0 ? (
            <EmptyState
              icon={<BookOpen size={30} color={ORANGE} />}
              title="Contenu à venir"
              message="Ce cours ne contient pas encore de modules publiés."
            />
          ) : (
            course.modules.map((module, index) => {
              const moduleTitle = (module.title || module.name || '').trim()
              const showModuleTitle =
                moduleTitle.length > 0 &&
                moduleTitle.toLowerCase() !== course.title.trim().toLowerCase()

              return (
                <FadeUp key={module.id} delay={80 + index * 40}>
                  <View style={styles.moduleCard}>
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
          )}

          {progressLoading ? (
            <View style={styles.validationSkeleton}>
              <CourseDetailSkeleton />
            </View>
          ) : (
            <FadeUp delay={160}>
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
                        : 'J’ai terminé ce cours et je suis prêt à passer au suivant.'}
                  </Text>
                  {saving ? (
                    <ActivityIndicator size="small" color={dark.green} />
                  ) : (
                    <ChevronRight size={18} color={dark.green} />
                  )}
                </Pressable>

                {error ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{error}</Text>
                    <Pressable onPress={() => void loadProgress()} hitSlop={8}>
                      <Text style={styles.errorRetry}>Réessayer</Text>
                    </Pressable>
                  </View>
                ) : null}

                {!isCompleted ? (
                  <Bouncy
                    scaleTo={0.98}
                    disabled={saving || !canValidate}
                    onPress={() => void handleToggleComplete()}
                  >
                    <View
                      style={[
                        styles.primaryBtn,
                        (saving || !canValidate) && styles.primaryBtnDisabled,
                      ]}
                    >
                      <View style={styles.primaryBtnIcon}>
                        {saving ? (
                          <ActivityIndicator size="small" color={dark.green} />
                        ) : (
                          <Check size={16} color={dark.green} strokeWidth={3} />
                        )}
                      </View>
                      <Text style={styles.primaryBtnText}>Valider ce cours</Text>
                    </View>
                  </Bouncy>
                ) : (
                  <View style={styles.actions}>
                    {nextCourse ? (
                      <Bouncy
                        scaleTo={0.98}
                        onPress={() =>
                          navigation.replace('LeconDetail', {
                            chapterId,
                            chapterName,
                            course: nextCourse,
                            courses,
                          })
                        }
                      >
                        <View style={styles.primaryBtn}>
                          <Text style={styles.primaryBtnText}>Cours suivant</Text>
                          <ChevronRight size={20} color="#FFFFFF" />
                        </View>
                      </Bouncy>
                    ) : (
                      <Pressable
                        style={styles.secondaryBtn}
                        onPress={() => navigation.navigate('LeconsChapitres')}
                      >
                        <Text style={styles.secondaryBtnText}>Retour aux chapitres</Text>
                      </Pressable>
                    )}
                  </View>
                )}
              </View>
            </FadeUp>
          )}

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
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    gap: 8,
  },
  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    ...shadows.sm,
  },
  topBarCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 4,
    minWidth: 0,
  },
  topBarIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: ORANGE_SOFT,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  topBarTitle: {
    flexShrink: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    lineHeight: 20,
    color: dark.textPrimary,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 28,
  },
  footerPad: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  header: {
    marginBottom: 24,
  },
  heroTitle: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
    color: dark.textPrimary,
    marginBottom: 16,
    maxWidth: 360,
  },
  stepsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  step: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    maxWidth: 56,
  },
  stepDone: {
    backgroundColor: dark.green,
  },
  stepCurrent: {
    backgroundColor: ORANGE,
  },
  stepUpcoming: {
    backgroundColor: 'rgba(0,16,48,0.12)',
  },
  moduleCard: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 20,
    ...shadows.card,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
  },
  completionCard: {
    marginTop: 4,
    borderRadius: 20,
    backgroundColor: brand.greenPale,
    padding: 24,
    marginBottom: 8,
    gap: 16,
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
    fontSize: 17,
    color: dark.textPrimary,
  },
  completionHint: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: dark.textMuted,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 16,
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
    transform: [{ scale: 0.99 }],
    opacity: 0.95,
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
  validationSkeleton: {
    marginTop: 4,
    marginHorizontal: -24,
  },
  errorBox: {
    gap: 6,
  },
  errorText: {
    fontSize: 13,
    color: dark.coral,
    fontFamily: fonts.body,
  },
  errorRetry: {
    fontSize: 13,
    color: dark.green,
    fontFamily: fonts.bodyBold,
  },
  actions: {
    gap: 10,
  },
  primaryBtn: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 16,
    backgroundColor: dark.green,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  primaryBtnDisabled: {
    opacity: 0.45,
  },
  primaryBtnIcon: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontFamily: fonts.bodyBold,
    fontSize: 16,
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
  secondaryBtnText: {
    color: dark.textPrimary,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  pressed: {
    opacity: 0.9,
  },
})
