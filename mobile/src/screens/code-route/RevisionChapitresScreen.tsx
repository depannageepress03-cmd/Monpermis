import { useCallback, useRef, useState } from 'react'
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { BookOpen, ClipboardList, HelpCircle, Layers } from 'lucide-react-native'
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import {
  ContentError,
  fetchLearnerProgress,
  fetchRevisionChaptersSWR,
  type RevisionChapter,
} from '../../api/revision'
import { DarkScreen } from '../../components/DarkScreen'
import { EmptyState } from '../../components/EmptyState'
import { PageNavbar } from '../../components/PageNavbar'
import { ScreenLoader } from '../../components/ScreenLoader'
import { SkeletonList } from '../../components/Skeleton'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import type { RootStackParamList } from '../../navigation/types'
import { dark, fonts } from '../../theme'

type Nav = NativeStackNavigationProp<RootStackParamList, 'RevisionChapitres' | 'CodeCours'>

export function RevisionChapitresScreen() {
  const navigation = useNavigation<Nav>()
  const route = useRoute()
  const coursOnly = route.name === 'CodeCours'
  const { user, loading: authLoading } = useRequireAuth(navigation)
  const [chapters, setChapters] = useState<RevisionChapter[]>([])
  const [completedTestIds, setCompletedTestIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasDataRef = useRef(false)

  const loadChapters = useCallback(async (silent = false) => {
    if (!silent && !hasDataRef.current) setLoading(true)
    setError(null)
    try {
      const progressPromise = fetchLearnerProgress()
      await fetchRevisionChaptersSWR((data, meta) => {
        setChapters(data)
        if (data.length > 0) hasDataRef.current = true
        if (meta.fromCache) setLoading(false)
      })
      const progress = await progressPromise
      setCompletedTestIds(new Set(progress.completedTests.map((entry) => entry.chapterId)))
    } catch (err) {
      if (!hasDataRef.current) {
        setError(err instanceof ContentError ? err.message : 'Chargement impossible')
      }
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
      chapterOrder: chapter.order || index + 1,
    })
  }

  const openTestSubject = (chapter: RevisionChapter, index: number) => {
    navigation.navigate('ChapterTestSubject', {
      chapterId: chapter.id,
      chapterName: `${index + 1}. ${chapter.name}`,
      chapterOrder: chapter.order || index + 1,
    })
  }

  if (authLoading || !user) return <ScreenLoader />

  return (
    <DarkScreen>
      <PageNavbar
        title={coursOnly ? 'Cours' : 'Nos chapitres'}
        icon={coursOnly ? BookOpen : Layers}
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
            tintColor={dark.green}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.heroEyebrow}>Code de la route</Text>
          <Text style={styles.heroTitle}>
            {coursOnly ? 'Cours par chapitre' : 'Révision par chapitres'}
          </Text>
          <Text style={styles.subtitle}>
            {coursOnly
              ? 'Choisis un chapitre pour accéder à ses cours, à ton rythme.'
              : 'Questions et sujets test pour chaque chapitre — les cours sont dans le bouton Cours du menu Code.'}
          </Text>
        </View>

        {loading ? <SkeletonList count={4} /> : null}

        {error && chapters.length === 0 ? (
          <EmptyState
            icon={<Layers size={30} color={dark.textMuted} />}
            title="Chargement impossible"
            message={error}
          />
        ) : null}

        {!loading && !error && chapters.length === 0 ? (
          <EmptyState
            icon={<Layers size={30} color={dark.textMuted} />}
            title="Aucun chapitre disponible"
            message="Les chapitres publiés par votre auto-école apparaîtront ici."
          />
        ) : null}

        {chapters.length > 0 && !error
          ? chapters.map((chapter, index) => {
              const testDone = completedTestIds.has(chapter.id)

              return (
                <View key={chapter.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={styles.iconWrap}>
                      <Text style={styles.cardNumber}>{index + 1}</Text>
                    </View>
                    <View style={styles.cardContent}>
                      <Text style={styles.cardTitle}>{chapter.name}</Text>
                      <Text style={styles.cardSubtitle}>
                        {coursOnly
                          ? `${chapter.courses.length} cours`
                          : testDone
                            ? `${chapter.courses.length} cours · Chapitre validé`
                            : `${chapter.courses.length} cours · Accès libre`}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.actions}>
                    {coursOnly ? (
                      <Pressable
                        style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
                        onPress={() => openCourses(chapter, index)}
                      >
                        <View style={[styles.actionIcon, styles.actionCourses]}>
                          <BookOpen size={15} color={dark.green} />
                        </View>
                        <Text style={styles.actionLabel}>Cours</Text>
                      </Pressable>
                    ) : (
                      <>
                        <Pressable
                          style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
                          onPress={() => openQuestions(chapter, index)}
                        >
                          <View style={[styles.actionIcon, styles.actionQuestions]}>
                            <HelpCircle size={15} color={dark.coral} />
                          </View>
                          <Text style={styles.actionLabel}>Questions</Text>
                        </Pressable>

                        <Pressable
                          style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
                          onPress={() => openTestSubject(chapter, index)}
                        >
                          <View style={[styles.actionIcon, styles.actionTest]}>
                            <ClipboardList size={15} color={dark.textPrimary} />
                          </View>
                          <Text style={styles.actionLabel}>Sujet test</Text>
                        </Pressable>
                      </>
                    )}
                  </View>
                </View>
              )
            })
          : null}
      </ScrollView>
    </DarkScreen>
  )
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 22,
    paddingTop: 12,
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
    marginBottom: 2,
  },
  heroTitle: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 28,
    lineHeight: 34,
    color: dark.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 8,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: dark.textMuted,
    maxWidth: 340,
  },
  card: {
    borderRadius: 18,
    backgroundColor: dark.surface,
    borderWidth: 1,
    borderColor: dark.border,
    padding: 16,
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(31,168,87,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardNumber: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: dark.green,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    color: dark.textPrimary,
  },
  cardSubtitle: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: 13,
    color: dark.textMuted,
  },
  actions: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: dark.surfaceRaised,
  },
  pressed: {
    opacity: 0.85,
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCourses: {
    backgroundColor: 'rgba(31,168,87,0.15)',
  },
  actionQuestions: {
    backgroundColor: 'rgba(255,107,107,0.15)',
  },
  actionTest: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  actionLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: dark.textPrimary,
  },
})
