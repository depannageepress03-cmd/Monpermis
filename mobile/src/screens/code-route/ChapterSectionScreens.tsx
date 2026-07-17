import { useCallback, useState } from 'react'
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { ChevronRight, ClipboardList, HelpCircle } from 'lucide-react-native'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import {
  ContentError,
  fetchChapterQuestions,
  fetchChapterTestSubject,
  type RevisionQuestion,
} from '../../api/revision'
import { DarkScreen } from '../../components/DarkScreen'
import { PageNavbar } from '../../components/PageNavbar'
import { ScreenLoader } from '../../components/ScreenLoader'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import type { RootStackParamList } from '../../navigation/types'
import { dark, fonts } from '../../theme'

type Nav = NativeStackNavigationProp<RootStackParamList, 'ChapterQuestionsList'>
type Route = RouteProp<RootStackParamList, 'ChapterQuestionsList'>

export function ChapterQuestionsListScreen() {
  const navigation = useNavigation<Nav>()
  const route = useRoute<Route>()
  const { user, loading } = useRequireAuth(navigation)
  const { chapterId, chapterName } = route.params

  const [questions, setQuestions] = useState<RevisionQuestion[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoadingList(true)
    setError(null)
    try {
      const list = await fetchChapterQuestions(chapterId)
      setQuestions(list)
    } catch (err) {
      setError(err instanceof ContentError ? err.message : 'Chargement impossible')
      setQuestions([])
    } finally {
      setLoadingList(false)
    }
  }, [chapterId])

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
          icon={HelpCircle}
          onBack={() => navigation.navigate('RevisionChapitres')}
          numberOfLines={2}
        />

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.kicker}>Questions</Text>
            <View style={styles.accentRow}>
              <View style={[styles.accent, styles.accentGreen]} />
              <View style={[styles.accent, styles.accentGold]} />
              <View style={[styles.accent, styles.accentNavy]} />
            </View>
            <Text style={styles.subtitle}>
              {questions.length} question{questions.length !== 1 ? 's' : ''} · entraînement
            </Text>
          </View>

          {loadingList ? <ActivityIndicator color={dark.green} style={{ marginBottom: 16 }} /> : null}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {!loadingList && !error && questions.length === 0 ? (
            <View style={styles.centerBox}>
              <Text style={styles.emptyTitle}>Aucune question</Text>
              <Text style={styles.emptyText}>Aucune question publiée pour ce chapitre.</Text>
            </View>
          ) : null}

          {!loadingList && !error && questions.length > 0 ? (
            <>
              <Pressable
                style={({ pressed }) => [styles.startBtn, pressed && styles.pressed]}
                onPress={() =>
                  navigation.navigate('ChapterQuestions', {
                    chapterId,
                    chapterName,
                    mode: 'practice',
                  })
                }
              >
                <HelpCircle size={20} color={'#0B0F1A'} />
                <Text style={styles.startBtnText}>Commencer l’entraînement</Text>
                <ChevronRight size={20} color={'#0B0F1A'} />
              </Pressable>

              {questions.map((question, index) => (
                <View key={question.id} style={styles.card}>
                  <View style={styles.iconWrap}>
                    <HelpCircle size={20} color={dark.coral} />
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.cardIndex}>Question {index + 1}</Text>
                    <Text style={styles.cardTitle}>
                      {question.answers.length} réponse
                      {question.answers.length !== 1 ? 's' : ''} possible
                      {question.answers.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
              ))}
            </>
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
  const { chapterId, chapterName } = route.params

  const [questions, setQuestions] = useState<RevisionQuestion[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoadingList(true)
    setError(null)
    try {
      const list = await fetchChapterTestSubject(chapterId)
      setQuestions(list)
    } catch (err) {
      setError(err instanceof ContentError ? err.message : 'Chargement impossible')
      setQuestions([])
    } finally {
      setLoadingList(false)
    }
  }, [chapterId])

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
          onBack={() => navigation.navigate('RevisionChapitres')}
          numberOfLines={2}
        />

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.kicker}>Sujet test</Text>
            <View style={styles.accentRow}>
              <View style={[styles.accent, styles.accentGreen]} />
              <View style={[styles.accent, styles.accentGold]} />
              <View style={[styles.accent, styles.accentNavy]} />
            </View>
            <Text style={styles.subtitle}>Évaluez-vous sur ce chapitre.</Text>
          </View>

          {loadingList ? <ActivityIndicator color={dark.green} style={{ marginBottom: 16 }} /> : null}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {!loadingList && !error && questions.length === 0 ? (
            <View style={styles.centerBox}>
              <Text style={styles.emptyTitle}>Aucun sujet test</Text>
              <Text style={styles.emptyText}>Aucun sujet test publié pour ce chapitre.</Text>
            </View>
          ) : null}

          {!loadingList && !error && questions.length > 0 ? (
            <>
              <View style={styles.summaryCard}>
                <ClipboardList size={22} color={dark.textPrimary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Sujet du chapitre</Text>
                  <Text style={styles.cardIndex}>
                    {questions.length} question{questions.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>

              <Pressable
                style={({ pressed }) => [styles.startBtn, pressed && styles.pressed]}
                onPress={() =>
                  navigation.navigate('ChapterQuestions', {
                    chapterId,
                    chapterName,
                    mode: 'test',
                  })
                }
              >
                <ClipboardList size={20} color={'#0B0F1A'} />
                <Text style={styles.startBtnText}>Commencer le sujet test</Text>
                <ChevronRight size={20} color={'#0B0F1A'} />
              </Pressable>
            </>
          ) : null}
        </ScrollView>
      </DarkScreen>
  )
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 28 },
  header: { marginBottom: 24 },
  kicker: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: dark.green,
    marginBottom: 6,
  },
  accentRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  accent: { height: 4, borderRadius: 999 },
  accentGreen: { width: 28, backgroundColor: dark.green },
  accentGold: { width: 18, backgroundColor: dark.coral },
  accentNavy: { width: 12, backgroundColor: dark.textMuted },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: dark.textMuted,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: dark.green,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  startBtnText: {
    flex: 1,
    color: '#0B0F1A',
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.surface,
    padding: 14,
    marginBottom: 10,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.surfaceRaised,
    padding: 16,
    marginBottom: 14,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dark.coralSoft,
  },
  cardContent: { flex: 1 },
  cardIndex: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: dark.textMuted,
    marginBottom: 2,
  },
  cardTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: dark.textPrimary,
  },
  centerBox: { alignItems: 'center', paddingVertical: 28 },
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
  pressed: { opacity: 0.88 },
})
