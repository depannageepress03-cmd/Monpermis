import { useCallback, useState } from 'react'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { BookOpen, ClipboardList, HelpCircle, Layers, Lock } from 'lucide-react-native'
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  ContentError,
  fetchLearnerProgress,
  fetchRevisionChapters,
  type RevisionChapter,
} from '../../api/revision'
import { PageNavbar } from '../../components/PageNavbar'
import { ScreenLoader } from '../../components/ScreenLoader'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import type { RootStackParamList } from '../../navigation/types'
import { brand, colors } from '../../theme'
import {
  isChapterQuestionsUnlocked,
  isChapterQuizUnlocked,
  isChapterTestSubjectUnlocked,
  isChapterUnlocked,
} from '../../utils/unlock'

type Nav = NativeStackNavigationProp<RootStackParamList, 'RevisionChapitres'>

export function RevisionChapitresScreen() {
  const navigation = useNavigation<Nav>()
  const { user, loading: authLoading } = useRequireAuth(navigation)
  const [chapters, setChapters] = useState<RevisionChapter[]>([])
  const [completedCourseIdsByChapter, setCompletedCourseIdsByChapter] = useState<
    Record<string, Set<string>>
  >({})
  const [completedTestIds, setCompletedTestIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadChapters = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const [data, progress] = await Promise.all([
        fetchRevisionChapters(),
        fetchLearnerProgress(),
      ])
      setChapters(data)

      const byChapter: Record<string, Set<string>> = {}
      for (const entry of progress.completedCourses) {
        if (!byChapter[entry.chapterId]) byChapter[entry.chapterId] = new Set()
        byChapter[entry.chapterId].add(entry.courseId)
      }
      setCompletedCourseIdsByChapter(byChapter)
      setCompletedTestIds(new Set(progress.completedTests.map((entry) => entry.chapterId)))
    } catch (err) {
      setError(err instanceof ContentError ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      if (user) void loadChapters()
    }, [user, loadChapters]),
  )

  const openCourses = (chapter: RevisionChapter, index: number) => {
    navigation.navigate('ChapterCourses', {
      chapterId: chapter.id,
      chapterName: `${index + 1}. ${chapter.name}`,
      courses: chapter.courses.map((course) => ({
        id: course.id,
        title: course.title,
        modules: course.modules,
      })),
    })
  }

  const openQuestions = (chapter: RevisionChapter, index: number) => {
    navigation.navigate('ChapterQuestionsList', {
      chapterId: chapter.id,
      chapterName: `${index + 1}. ${chapter.name}`,
    })
  }

  const openTestSubject = (chapter: RevisionChapter, index: number) => {
    navigation.navigate('ChapterTestSubject', {
      chapterId: chapter.id,
      chapterName: `${index + 1}. ${chapter.name}`,
    })
  }

  if (authLoading || !user) return <ScreenLoader />

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <PageNavbar
          title="Nos chapitres"
          icon={Layers}
          onBack={() => navigation.navigate('CodeRoute')}
        />

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true)
                void loadChapters(true)
              }}
              tintColor={brand.green}
            />
          }
        >
          <View style={styles.header}>
            <View style={styles.accentRow}>
              <View style={[styles.accent, styles.accentGreen]} />
              <View style={[styles.accent, styles.accentGold]} />
              <View style={[styles.accent, styles.accentNavy]} />
            </View>
            <Text style={styles.subtitle}>
              Suivez chaque chapitre dans l’ordre : cours, questions, puis sujet test pour
              progresser sereinement.
            </Text>
          </View>

          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator color={brand.green} size="large" />
            </View>
          ) : null}

          {error ? (
            <View style={styles.centerBox}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.retryBtn} onPress={() => void loadChapters()}>
                <Text style={styles.retryText}>Réessayer</Text>
              </Pressable>
            </View>
          ) : null}

          {!loading && !error && chapters.length === 0 ? (
            <View style={styles.centerBox}>
              <Text style={styles.emptyTitle}>Aucun chapitre disponible</Text>
              <Text style={styles.emptyText}>
                Les chapitres publiés par votre auto-école apparaîtront ici.
              </Text>
            </View>
          ) : null}

          {!loading && !error
            ? chapters.map((chapter, index) => {
                const chapterUnlocked = isChapterUnlocked(
                  index,
                  chapters[index - 1]?.id,
                  completedTestIds,
                )
                const courseIds = chapter.courses.map((course) => course.id)
                const completedForChapter =
                  completedCourseIdsByChapter[chapter.id] ?? new Set()
                const quizUnlocked = isChapterQuizUnlocked(courseIds, completedForChapter)
                const questionsUnlocked = isChapterQuestionsUnlocked(chapterUnlocked)
                const testSubjectUnlocked = isChapterTestSubjectUnlocked(
                  chapterUnlocked,
                  courseIds,
                  completedForChapter,
                )
                const testDone = completedTestIds.has(chapter.id)

                return (
                  <View
                    key={chapter.id}
                    style={[styles.card, !chapterUnlocked && styles.cardLocked]}
                  >
                    <View style={styles.cardTop}>
                      <View style={styles.iconWrap}>
                        {chapterUnlocked ? (
                          <Text style={styles.cardNumber}>{index + 1}</Text>
                        ) : (
                          <Lock size={15} color={brand.navyMuted} />
                        )}
                      </View>
                      <View style={styles.cardContent}>
                        <Text style={styles.cardTitle}>{chapter.name}</Text>
                        <Text style={styles.cardSubtitle}>
                          {!chapterUnlocked
                            ? 'Validez le sujet test du chapitre précédent'
                            : testDone
                              ? `${chapter.courses.length} cours · Chapitre validé`
                              : quizUnlocked
                                ? `${chapter.courses.length} cours · Sujet test débloqué`
                                : `${chapter.courses.length} cours · Questions ouvertes · Terminez les cours pour le sujet test`}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.actions}>
                      <Pressable
                        style={({ pressed }) => [
                          styles.actionBtn,
                          !chapterUnlocked && styles.actionDisabled,
                          pressed && chapterUnlocked && styles.pressed,
                        ]}
                        disabled={!chapterUnlocked}
                        onPress={() => openCourses(chapter, index)}
                      >
                        <View style={[styles.actionIcon, styles.actionCourses]}>
                          {chapterUnlocked ? (
                            <BookOpen size={15} color={brand.green} />
                          ) : (
                            <Lock size={13} color={brand.navyMuted} />
                          )}
                        </View>
                        <Text style={styles.actionLabel}>Cours</Text>
                      </Pressable>

                      <Pressable
                        style={({ pressed }) => [
                          styles.actionBtn,
                          !questionsUnlocked && styles.actionDisabled,
                          pressed && questionsUnlocked && styles.pressed,
                        ]}
                        disabled={!questionsUnlocked}
                        onPress={() => openQuestions(chapter, index)}
                      >
                        <View style={[styles.actionIcon, styles.actionQuestions]}>
                          {questionsUnlocked ? (
                            <HelpCircle size={15} color="#B8860B" />
                          ) : (
                            <Lock size={13} color={brand.navyMuted} />
                          )}
                        </View>
                        <Text style={styles.actionLabel}>Questions</Text>
                      </Pressable>

                      <Pressable
                        style={({ pressed }) => [
                          styles.actionBtn,
                          !testSubjectUnlocked && styles.actionDisabled,
                          pressed && testSubjectUnlocked && styles.pressed,
                        ]}
                        disabled={!testSubjectUnlocked}
                        onPress={() => openTestSubject(chapter, index)}
                      >
                        <View style={[styles.actionIcon, styles.actionTest]}>
                          {testSubjectUnlocked ? (
                            <ClipboardList size={15} color={brand.navy} />
                          ) : (
                            <Lock size={13} color={brand.navyMuted} />
                          )}
                        </View>
                        <Text style={styles.actionLabel}>Sujet test</Text>
                      </Pressable>
                    </View>
                  </View>
                )
              })
            : null}
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
    paddingTop: 16,
    paddingBottom: 28,
  },
  header: {
    marginBottom: 40,
    marginTop: 12,
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
    marginBottom: 8,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: `${brand.green}28`,
    backgroundColor: brand.greenLight,
    padding: 10,
    marginBottom: 8,
    gap: 8,
    marginTop: 4,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: `${brand.green}30`,
  },
  cardNumber: {
    fontSize: 15,
    fontWeight: '800',
    color: brand.green,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: brand.navy,
    marginBottom: 1,
  },
  cardSubtitle: {
    fontSize: 11,
    lineHeight: 15,
    color: brand.navyMuted,
  },
  actions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 2,
    borderRadius: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(0,16,48,0.08)',
  },
  actionIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCourses: {
    backgroundColor: brand.greenLight,
  },
  actionQuestions: {
    backgroundColor: brand.goldLight,
  },
  actionTest: {
    backgroundColor: '#eef1f5',
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: brand.navy,
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
  errorText: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: brand.green,
  },
  retryText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  pressed: {
    opacity: 0.88,
  },
  cardLocked: {
    opacity: 0.72,
    backgroundColor: '#f1f5f9',
    borderColor: 'rgba(15,23,42,0.08)',
  },
  actionDisabled: {
    opacity: 0.55,
  },
})
