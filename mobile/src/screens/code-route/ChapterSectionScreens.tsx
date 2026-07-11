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
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  ContentError,
  fetchChapterQuestions,
  fetchChapterTestSubject,
  type RevisionQuestion,
} from '../../api/revision'
import { PageNavbar } from '../../components/PageNavbar'
import { ScreenLoader } from '../../components/ScreenLoader'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import type { RootStackParamList } from '../../navigation/types'
import { brand, colors } from '../../theme'

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
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
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

          {loadingList ? <ActivityIndicator color={brand.green} style={{ marginBottom: 16 }} /> : null}
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
                <HelpCircle size={20} color={colors.white} />
                <Text style={styles.startBtnText}>Commencer l’entraînement</Text>
                <ChevronRight size={20} color={colors.white} />
              </Pressable>

              {questions.map((question, index) => (
                <View key={question.id} style={styles.card}>
                  <View style={styles.iconWrap}>
                    <HelpCircle size={20} color="#B8860B" />
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
      </SafeAreaView>
    </View>
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
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
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

          {loadingList ? <ActivityIndicator color={brand.green} style={{ marginBottom: 16 }} /> : null}
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
                <ClipboardList size={22} color={brand.navy} />
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
                <ClipboardList size={20} color={colors.white} />
                <Text style={styles.startBtnText}>Commencer le sujet test</Text>
                <ChevronRight size={20} color={colors.white} />
              </Pressable>
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.white },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 28 },
  header: { marginBottom: 24 },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: brand.green,
    marginBottom: 6,
  },
  accentRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  accent: { height: 4, borderRadius: 999 },
  accentGreen: { width: 28, backgroundColor: brand.green },
  accentGold: { width: 18, backgroundColor: brand.gold },
  accentNavy: { width: 12, backgroundColor: brand.navy },
  subtitle: { fontSize: 15, lineHeight: 22, color: brand.navyMuted },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: brand.green,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  startBtnText: { flex: 1, color: colors.white, fontSize: 15, fontWeight: '700' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${brand.gold}55`,
    backgroundColor: brand.goldLight,
    padding: 14,
    marginBottom: 10,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: `${brand.navy}14`,
    backgroundColor: '#eef1f5',
    padding: 16,
    marginBottom: 14,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  cardContent: { flex: 1 },
  cardIndex: { fontSize: 12, fontWeight: '700', color: brand.navyMuted, marginBottom: 2 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: brand.navy },
  centerBox: { alignItems: 'center', paddingVertical: 28 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: brand.navy, marginBottom: 8 },
  emptyText: { fontSize: 14, lineHeight: 20, color: brand.navyMuted, textAlign: 'center' },
  errorText: { color: colors.error, marginBottom: 12, fontWeight: '600' },
  pressed: { opacity: 0.88 },
})
