import { useCallback, useState } from 'react'
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { ChevronRight, ClipboardList, HelpCircle } from 'lucide-react-native'
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import {
  ContentError,
  fetchChapterQuestions,
  fetchChapterTestSubjects,
  type RevisionQuestion,
} from '../../api/revision'
import { rememberChapterOrder } from '../../data/codeRoute/chapterIndex'
import { DarkScreen } from '../../components/DarkScreen'
import { PageNavbar } from '../../components/PageNavbar'
import { ScreenLoader } from '../../components/ScreenLoader'
import { SkeletonList } from '../../components/Skeleton'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import type { RootStackParamList } from '../../navigation/types'
import { dark, fonts, radii } from '../../theme'

type Nav = NativeStackNavigationProp<RootStackParamList, 'ChapterQuestionsList'>
type Route = RouteProp<RootStackParamList, 'ChapterQuestionsList'>

export function ChapterQuestionsListScreen() {
  const navigation = useNavigation<Nav>()
  const route = useRoute<Route>()
  const { user, loading } = useRequireAuth(navigation)
  const { chapterId, chapterName, chapterOrder } = route.params

  const [questions, setQuestions] = useState<RevisionQuestion[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoadingList(true)
    setError(null)
    try {
      rememberChapterOrder(chapterId, chapterOrder, chapterName)
      const list = await fetchChapterQuestions(chapterId)
      setQuestions(list)
    } catch (err) {
      setError(err instanceof ContentError ? err.message : 'Chargement impossible')
      setQuestions([])
    } finally {
      setLoadingList(false)
    }
  }, [chapterId, chapterOrder, chapterName])

  useFocusEffect(
    useCallback(() => {
      if (user) void load()
    }, [user, load]),
  )

  if (loading || !user) return <ScreenLoader />

  const count = questions.length

  return (
    <DarkScreen>
      <PageNavbar
        title={chapterName}
        icon={HelpCircle}
        onBack={() => navigation.goBack()}
        numberOfLines={2}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Entraînement</Text>
          <Text style={styles.title}>Questions</Text>
          <Text style={styles.subtitle}>
            {loadingList
              ? 'Chargement…'
              : count > 0
                ? `${count} question${count !== 1 ? 's' : ''} — entraînez-vous à votre rythme.`
                : 'Aucune question publiée pour ce chapitre.'}
          </Text>
        </View>

        {loadingList ? <SkeletonList count={3} /> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {!loadingList && !error && count === 0 ? (
          <View style={styles.centerBox}>
            <Text style={styles.emptyTitle}>Aucune question</Text>
            <Text style={styles.emptyText}>Aucune question publiée pour ce chapitre.</Text>
          </View>
        ) : null}

        {!loadingList && !error && count > 0 ? (
          <Pressable
            style={({ pressed }) => [styles.startBtn, pressed && styles.pressed]}
            onPress={() =>
              navigation.navigate('ChapterQuestions', {
                chapterId,
                chapterName,
                chapterOrder,
                mode: 'practice',
              })
            }
            accessibilityRole="button"
            accessibilityLabel="Commencer l’entraînement"
          >
            <HelpCircle size={20} color="#0B0F1A" />
            <Text style={styles.startBtnText}>Commencer l’entraînement</Text>
            <ChevronRight size={20} color="#0B0F1A" />
          </Pressable>
        ) : null}
      </ScrollView>
    </DarkScreen>
  )
}

type TestNav = NativeStackNavigationProp<RootStackParamList, 'ChapterTestSubject'>
type TestRoute = RouteProp<RootStackParamList, 'ChapterTestSubject'>

export function ChapterTestSubjectScreen() {
  const navigation = useNavigation<TestNav>()
  const route = useRoute<TestRoute>()
  const { user, loading } = useRequireAuth(navigation)
  const { chapterId, chapterName, chapterOrder } = route.params

  const [subjects, setSubjects] = useState<
    { number: number; id: string; label: string; questionCount: number }[]
  >([])
  const [loadingList, setLoadingList] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoadingList(true)
    setError(null)
    try {
      rememberChapterOrder(chapterId, chapterOrder, chapterName)
      const data = await fetchChapterTestSubjects(chapterId)
      const list = Array.isArray(data?.subjects) ? data.subjects : []
      setSubjects(list)
    } catch (err) {
      setError(err instanceof ContentError ? err.message : 'Chargement impossible')
      setSubjects([])
    } finally {
      setLoadingList(false)
    }
  }, [chapterId, chapterOrder, chapterName])

  useFocusEffect(
    useCallback(() => {
      if (user) void load()
    }, [user, load]),
  )

  if (loading || !user) return <ScreenLoader />

  return (
    <DarkScreen>
      <PageNavbar
        title={chapterName}
        icon={ClipboardList}
        onBack={() => navigation.goBack()}
        numberOfLines={2}
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Évaluation</Text>
          <Text style={styles.title}>Sujets test</Text>
          <Text style={styles.subtitle}>
            {subjects.length > 0
              ? `${subjects.length} sujet${subjects.length > 1 ? 's' : ''} — choisissez-en un.`
              : 'Chaque sujet propose un jeu de questions différent.'}
          </Text>
        </View>

        {loadingList ? <SkeletonList count={3} /> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {!loadingList && !error && subjects.length === 0 ? (
          <View style={styles.centerBox}>
            <Text style={styles.emptyTitle}>Aucun sujet test</Text>
            <Text style={styles.emptyText}>Aucune question publiée pour ce chapitre.</Text>
          </View>
        ) : null}

        {!loadingList && !error
          ? subjects.map((subject) => (
              <Pressable
                key={subject.id || `sujet-${subject.number}`}
                style={({ pressed }) => [styles.startBtn, pressed && styles.pressed]}
                onPress={() =>
                  navigation.navigate('ChapterQuestions', {
                    chapterId,
                    chapterName,
                    chapterOrder,
                    mode: 'test',
                    subjectNumber: subject.number,
                  })
                }
                accessibilityRole="button"
                accessibilityLabel={subject.label}
              >
                <ClipboardList size={20} color="#0B0F1A" />
                <View style={styles.subjectCopy}>
                  <Text style={styles.startBtnText}>{subject.label}</Text>
                  <Text style={styles.subjectMeta}>
                    {subject.questionCount} question
                    {subject.questionCount !== 1 ? 's' : ''}
                  </Text>
                </View>
                <ChevronRight size={20} color="#0B0F1A" />
              </Pressable>
            ))
          : null}
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
  kicker: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: dark.green,
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  title: {
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
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    backgroundColor: dark.green,
    borderRadius: radii.lg,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  startBtnText: {
    flex: 1,
    color: '#0B0F1A',
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  subjectCopy: {
    flex: 1,
    gap: 2,
  },
  subjectMeta: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: 'rgba(11,15,26,0.72)',
  },
  centerBox: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  emptyTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 17,
    color: dark.textPrimary,
    marginBottom: 8,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: dark.textMuted,
    textAlign: 'center',
  },
  errorText: {
    color: dark.coral,
    marginBottom: 12,
    fontFamily: fonts.bodySemiBold,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
})
