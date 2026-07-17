import { useCallback, useEffect, useState } from 'react'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { FileText } from 'lucide-react-native'
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { ContentError, fetchLearnerJourney, type LearnerJourney } from '../../api/revision'
import { DarkScreen } from '../../components/DarkScreen'
import { PageNavbar } from '../../components/PageNavbar'
import { ScreenLoader } from '../../components/ScreenLoader'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import type { RootStackParamList } from '../../navigation/types'
import { dark, fonts } from '../../theme'

type Nav = NativeStackNavigationProp<RootStackParamList, 'MesNotes'>

export function MesNotesScreen() {
  const navigation = useNavigation<Nav>()
  const { user, loading: authLoading } = useRequireAuth(navigation)
  const [journey, setJourney] = useState<LearnerJourney | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      setJourney(await fetchLearnerJourney())
    } catch (err) {
      setError(err instanceof ContentError ? err.message : 'Chargement impossible')
      setJourney(null)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      if (user) void load()
    }, [user, load]),
  )

  useEffect(() => {
    if (!user) return
    const timer = setInterval(() => {
      void load(true)
    }, 4000)
    return () => clearInterval(timer)
  }, [user, load])

  if (authLoading || !user) return <ScreenLoader />

  return (
    <DarkScreen>
        <PageNavbar
          title="Mes notes & avancée"
          icon={FileText}
          onBack={() => navigation.navigate('CodeRoute')}
        />

        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true)
                void load(true)
              }}
              tintColor={dark.green}
            />
          }
        >
          <View style={styles.header}>
            <Text style={styles.kicker}>Progression</Text>
            <Text style={styles.subtitle}>
              Retrouvez où vous vous êtes arrêté et vos notes de sujets test.
            </Text>
          </View>

          {loading ? <ActivityIndicator color={dark.green} /> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {journey ? (
            <>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Où j’en suis</Text>
                <View style={styles.stopBox}>
                  <Text style={styles.stopLabel}>Code de la route</Text>
                  <Text style={styles.stopValue}>
                    {journey.code.currentStop?.label ?? 'Aucun parcours code'}
                  </Text>
                  <Text style={styles.stopMeta}>
                    {journey.code.chaptersDone}/{journey.code.chaptersTotal} chapitres validés
                  </Text>
                </View>
                <View style={styles.stopBox}>
                  <Text style={styles.stopLabel}>Conduite / pratique</Text>
                  <Text style={styles.stopValue}>
                    {journey.conduite.currentStop?.label ?? 'Aucun parcours conduite'}
                  </Text>
                  <Text style={styles.stopMeta}>
                    {journey.conduite.chaptersDone}/{journey.conduite.chaptersTotal} chapitres
                    terminés
                  </Text>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Examens test (sur 20)</Text>
                {journey.practiceExams ? (
                  <Text style={styles.empty}>
                    {journey.practiceExams.completedCount}/{journey.practiceExams.examTotal} passés
                    · {journey.practiceExams.passedCount} réussis (seuil{' '}
                    {journey.practiceExams.passScore}/20)
                  </Text>
                ) : null}
                {!journey.practiceExams || journey.practiceExams.scores.length === 0 ? (
                  <Text style={styles.empty}>
                    Aucune note d’examen test pour le moment.
                  </Text>
                ) : (
                  journey.practiceExams.scores.map((score) => (
                    <View key={score.id} style={styles.scoreRow}>
                      <View style={styles.scoreBadge}>
                        <Text style={styles.scoreBadgeText}>{score.scoreLabel}</Text>
                      </View>
                      <View style={styles.scoreBody}>
                        <Text style={styles.scoreTitle}>Examen {score.examNumber}</Text>
                        <Text style={styles.scoreMeta}>
                          {score.passed ? 'Réussi' : 'Non réussi'} · seuil {score.passScore}/20
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>Notes des sujets test</Text>
                {journey.testScores.length === 0 ? (
                  <Text style={styles.empty}>
                    Aucune note de sujet chapitre pour le moment.
                  </Text>
                ) : (
                  journey.testScores.map((score) => (
                    <View key={score.chapterId} style={styles.scoreRow}>
                      <View style={styles.scoreBadge}>
                        <Text style={styles.scoreBadgeText}>{score.scoreLabel}</Text>
                      </View>
                      <View style={styles.scoreBody}>
                        <Text style={styles.scoreTitle}>{score.chapterName}</Text>
                        <Text style={styles.scoreMeta}>
                          {score.correct}/{score.total} bonnes réponses
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            </>
          ) : null}
        </ScrollView>
      </DarkScreen>
  )
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 22, paddingBottom: 28 },
  header: { marginBottom: 20 },
  kicker: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: dark.green,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: dark.textMuted,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: dark.border,
    backgroundColor: dark.surface,
    padding: 16,
    marginBottom: 14,
    gap: 12,
  },
  cardTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 17,
    color: dark.textPrimary,
  },
  stopBox: {
    backgroundColor: dark.surfaceRaised,
    borderRadius: 14,
    padding: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: dark.border,
  },
  stopLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: dark.textMuted,
  },
  stopValue: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: dark.textPrimary,
  },
  stopMeta: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: dark.textMuted,
  },
  empty: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: dark.textMuted,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: dark.surfaceRaised,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: dark.border,
  },
  scoreBadge: {
    minWidth: 52,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: dark.coralSoft,
  },
  scoreBadgeText: {
    fontFamily: fonts.displayBold,
    color: dark.textPrimary,
  },
  scoreBody: { flex: 1 },
  scoreTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: dark.textPrimary,
  },
  scoreMeta: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: dark.textMuted,
  },
  error: { color: dark.coral, marginBottom: 12, fontFamily: fonts.body },
})
