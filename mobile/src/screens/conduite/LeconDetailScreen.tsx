import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { BookOpen, Check, ChevronRight } from 'lucide-react-native'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import {
  fetchCourseProgress,
  markCourseCompleted,
  startCourseSession,
} from '../../api/conduite'
import { MediaContent } from '../../components/MediaContent'
import { DarkScreen } from '../../components/DarkScreen'
import { PageNavbar } from '../../components/PageNavbar'
import { ScreenLoader } from '../../components/ScreenLoader'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import type { RootStackParamList } from '../../navigation/types'
import { dark, fonts } from '../../theme'
import { formatChapterHeading, formatCourseHeading } from '../../utils/chapterLabel'
import { formatSeconds, isCourseUnlocked } from '../../utils/unlock'

type Nav = NativeStackNavigationProp<RootStackParamList, 'LeconDetail'>
type Route = RouteProp<RootStackParamList, 'LeconDetail'>

export function LeconDetailScreen() {
  const navigation = useNavigation<Nav>()
  const route = useRoute<Route>()
  const { user, loading } = useRequireAuth(navigation)
  const { chapterId, chapterName, course, courses: coursesParam } = route.params
  const courses = coursesParam?.length ? coursesParam : [course]

  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [progressLoading, setProgressLoading] = useState(true)
  const [secondsRemaining, setSecondsRemaining] = useState(5 * 60)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accessBlocked, setAccessBlocked] = useState(false)

  const courseIndex = useMemo(
    () => courses.findIndex((item) => item.id === course.id),
    [courses, course.id],
  )
  const nextCourse = courseIndex >= 0 ? courses[courseIndex + 1] : undefined
  const isCompleted = completedIds.has(course.id)
  const canValidate = isCompleted || secondsRemaining <= 0

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

  if (accessBlocked) {
    return (
      <DarkScreen>
          <PageNavbar
            title={formatCourseHeading(courseIndex, course.title)}
            icon={BookOpen}
            onBack={() => navigation.goBack()}
            tone="drive"
            numberOfLines={2}
          />
          <View style={styles.centerBox}>
            <Text style={styles.emptyTitle}>Cours verrouillé</Text>
            <Text style={styles.emptyText}>
              Terminez le cours précédent pour accéder à celui-ci.
            </Text>
          </View>
        </DarkScreen>
    )
  }

  return (
    <DarkScreen>
        <PageNavbar
          title={formatCourseHeading(courseIndex, course.title)}
          icon={BookOpen}
          onBack={() => navigation.goBack()}
          tone="drive"
          numberOfLines={2}
        />

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          removeClippedSubviews={false}
        >
          <View style={styles.header}>
            <Text style={styles.kicker}>{formatChapterHeading(chapterName)}</Text>
            <View style={styles.accentRow}>
              <View style={[styles.accent, styles.accentGreen]} />
              <View style={[styles.accent, styles.accentGold]} />
              <View style={[styles.accent, styles.accentNavy]} />
            </View>
          </View>

          {course.modules.length === 0 ? (
            <View style={styles.centerBox}>
              <Text style={styles.emptyTitle}>Contenu à venir</Text>
              <Text style={styles.emptyText}>
                Ce cours ne contient pas encore de modules publiés.
              </Text>
            </View>
          ) : (
            course.modules.map((module) => {
              const moduleTitle = (module.title || module.name || '').trim()
              const showModuleTitle =
                moduleTitle.length > 0 &&
                moduleTitle.toLowerCase() !== course.title.trim().toLowerCase()

              return (
                <View key={module.id} style={styles.moduleCard}>
                  <MediaContent
                    title={showModuleTitle ? moduleTitle : undefined}
                    videoUrl={module.mediaType === 'image' ? '' : module.videoUrl}
                    imageUrl={module.mediaType === 'video' ? '' : module.imageUrl}
                    text={module.text}
                  />
                </View>
              )
            })
          )}

          <View style={styles.completionCard}>
            <Text style={styles.completionTitle}>Validation du cours</Text>
            <Text style={styles.completionHint}>
              {isCompleted
                ? 'Cours validé. Le cours suivant est débloqué.'
                : secondsRemaining > 0
                  ? `Restez au moins 5 minutes sur ce cours. Encore ${formatSeconds(secondsRemaining)} avant de pouvoir valider.`
                  : 'Vous pouvez maintenant valider ce cours pour débloquer la suite.'}
            </Text>

            {progressLoading ? (
              <ActivityIndicator color={dark.green} style={{ marginTop: 12 }} />
            ) : (
              <Pressable
                style={[
                  styles.checkboxRow,
                  isCompleted && styles.checkboxRowDone,
                  !canValidate && !isCompleted && styles.checkboxRowLocked,
                ]}
                onPress={() => void handleToggleComplete()}
                disabled={isCompleted || saving || !canValidate}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isCompleted }}
              >
                <View style={[styles.checkbox, isCompleted && styles.checkboxChecked]}>
                  {isCompleted ? <Check size={16} color={'#0B0F1A'} strokeWidth={3} /> : null}
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
            )}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {isCompleted ? (
              <View style={styles.actions}>
                {nextCourse ? (
                  <Pressable
                    style={styles.primaryBtn}
                    onPress={() =>
                      navigation.replace('LeconDetail', {
                        chapterId,
                        chapterName,
                        course: nextCourse,
                        courses,
                      })
                    }
                  >
                    <Text style={styles.primaryBtnText}>Cours suivant</Text>
                    <ChevronRight size={18} color={'#0B0F1A'} />
                  </Pressable>
                ) : (
                  <Pressable
                    style={styles.secondaryBtn}
                    onPress={() => navigation.navigate('LeconsChapitres')}
                  >
                    <Text style={styles.secondaryBtnText}>Retour aux chapitres</Text>
                  </Pressable>
                )}
              </View>
            ) : null}
          </View>
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
    marginBottom: 20,
  },
  kicker: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 24,
    letterSpacing: -0.3,
    color: dark.textPrimary,
    marginBottom: 6,
    lineHeight: 30,
  },
  accentRow: {
    flexDirection: 'row',
    gap: 6,
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
  moduleCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.surface,
    padding: 16,
    marginBottom: 14,
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
  completionCard: {
    marginTop: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.greenSoft,
    padding: 16,
  },
  completionTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: dark.textPrimary,
    marginBottom: 6,
  },
  completionHint: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: dark.textMuted,
  },
  checkboxRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.surface,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  checkboxRowDone: {
    borderColor: 'rgba(34,214,115,0.45)',
  },
  checkboxRowLocked: {
    opacity: 0.7,
    backgroundColor: dark.surfaceRaised,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: dark.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dark.surface,
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
    marginTop: 10,
    fontSize: 13,
    color: dark.coral,
    fontFamily: fonts.body,
  },
  actions: {
    marginTop: 14,
    gap: 10,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    backgroundColor: dark.green,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  primaryBtnText: {
    color: '#0B0F1A',
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.surface,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  secondaryBtnText: {
    color: dark.textPrimary,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
})
