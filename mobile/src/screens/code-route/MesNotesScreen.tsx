import { useCallback, useEffect, useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { BookOpen, Car, FileText } from 'lucide-react-native'
import {
  ActivityIndicator,
  Animated,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { ContentError, fetchLearnerJourney, type LearnerJourney } from '../../api/revision'
import { DarkScreen } from '../../components/DarkScreen'
import { FadeUp } from '../../components/FadeUp'
import { LegalFooter } from '../../components/LegalFooter'
import { PageNavbar } from '../../components/PageNavbar'
import { ScreenLoader } from '../../components/ScreenLoader'
import { useFocusRefresh } from '../../hooks/useFocusRefresh'
import { useHeaderFade } from '../../hooks/useHeaderFade'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import type { RootStackParamList } from '../../navigation/types'
import { brand, dark, fonts, shadows } from '../../theme'
import { animateLayout } from '../../utils/layoutAnim'

type Nav = NativeStackNavigationProp<RootStackParamList, 'MesNotes'>

export function MesNotesScreen() {
  const navigation = useNavigation<Nav>()
  const { user, loading: authLoading } = useRequireAuth(navigation)
  const [journey, setJourney] = useState<LearnerJourney | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { onScroll, dividerOpacity } = useHeaderFade()

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const data = await fetchLearnerJourney()
      animateLayout()
      setJourney(data)
    } catch (err) {
      setError(err instanceof ContentError ? err.message : 'Chargement impossible')
      setJourney(null)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (user) void load()
  }, [user, load])

  useFocusRefresh(Boolean(user), () => {
    void load(true)
  })

  if (authLoading || !user) return <ScreenLoader />

  const practice = journey?.practiceExams
  const examScores = practice?.scores ?? []
  const average20 =
    examScores.length > 0
      ? (examScores.reduce(
          (sum, s) => sum + (s.total > 0 ? s.correct / s.total : 0),
          0,
        ) /
          examScores.length) *
        20
      : null
  const averageLabel = average20 == null ? '—' : average20.toFixed(1).replace('.', ',')
  const codeRatio =
    journey && journey.code.chaptersTotal > 0
      ? Math.max(0, Math.min(1, journey.code.chaptersDone / journey.code.chaptersTotal))
      : 0
  const conduiteRatio =
    journey && journey.conduite.chaptersTotal > 0
      ? Math.max(
          0,
          Math.min(1, journey.conduite.chaptersDone / journey.conduite.chaptersTotal),
        )
      : 0

  return (
    <DarkScreen>
      <PageNavbar
        title="Mes notes"
        icon={FileText}
        onBack={() => navigation.navigate('CodeRoute')}
      />
      <Animated.View style={[styles.barDivider, { opacity: dividerOpacity }]} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        onScroll={onScroll}
        scrollEventThrottle={16}
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
        <FadeUp delay={40}>
        <View style={styles.head}>
          <Text style={styles.kicker}>Progression</Text>
          <Text style={styles.title}>Mes notes</Text>
          <Text style={styles.subtitle}>
            Avancée du parcours et notes mises à jour en temps réel.
          </Text>
        </View>
        </FadeUp>

        {loading ? <ActivityIndicator color={dark.green} /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {journey ? (
          <>
            <FadeUp delay={80}>
            <View style={styles.stats}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{averageLabel}</Text>
                <Text style={styles.statLabel}>Moyenne / 20</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{practice?.passedCount ?? 0}</Text>
                <Text style={styles.statLabel}>Réussis</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{practice?.completedCount ?? 0}</Text>
                <Text style={styles.statLabel}>Passés</Text>
              </View>
            </View>
            </FadeUp>

            <FadeUp delay={130}>
            <View style={[styles.track, styles.trackCode]}>
              <View style={styles.trackTop}>
                <View style={styles.trackIcon}>
                  <BookOpen size={18} color={dark.green} />
                </View>
                <View style={styles.trackCopy}>
                  <Text style={styles.trackTitle}>Code de la route</Text>
                  <Text style={styles.trackStop}>
                    {journey.code.currentStop?.label ?? 'Aucun parcours code'}
                  </Text>
                </View>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    styles.progressFillGreen,
                    { width: `${Math.round(codeRatio * 100)}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressLabel}>
                {journey.code.chaptersDone}/{journey.code.chaptersTotal} chapitres validés
              </Text>
            </View>
            </FadeUp>

            <FadeUp delay={170}>
            <View style={[styles.track, styles.trackDrive]}>
              <View style={styles.trackTop}>
                <View style={styles.trackIcon}>
                  <Car size={18} color="#B45309" />
                </View>
                <View style={styles.trackCopy}>
                  <Text style={styles.trackTitle}>Conduite / pratique</Text>
                  <Text style={styles.trackStop}>
                    {journey.conduite.currentStop?.label ?? 'Aucun parcours conduite'}
                  </Text>
                </View>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    styles.progressFillGold,
                    { width: `${Math.round(conduiteRatio * 100)}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressLabel}>
                {journey.conduite.chaptersDone}/{journey.conduite.chaptersTotal} chapitres
                terminés
              </Text>
            </View>
            </FadeUp>

            <FadeUp delay={210}>
            <Text style={styles.sectionTitle}>Examens test · sur 20</Text>
            </FadeUp>
            {practice ? (
              <Text style={styles.sectionSub}>
                {practice.completedCount}/{practice.examTotal} passés ·{' '}
                {practice.passedCount} réussis (seuil {practice.passScore}/20)
              </Text>
            ) : null}
            {examScores.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>Aucune note pour le moment</Text>
                <Text style={styles.emptyText}>
                  Passez un examen blanc pour voir votre note ici en direct.
                </Text>
              </View>
            ) : (
              examScores.map((score) => (
                <View key={score.id} style={styles.scoreRow}>
                  <View
                    style={[
                      styles.badge,
                      score.passed ? styles.badgePass : styles.badgeFail,
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        score.passed ? styles.badgeTextPass : styles.badgeTextFail,
                      ]}
                    >
                      {score.scoreLabel}
                    </Text>
                  </View>
                  <View style={styles.scoreBody}>
                    <Text style={styles.scoreTitle}>Examen {score.examNumber}</Text>
                    <Text style={styles.scoreMeta}>Seuil {score.passScore}/20</Text>
                  </View>
                  <View
                    style={[styles.pill, score.passed ? styles.pillPass : styles.pillFail]}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        score.passed ? styles.pillTextPass : styles.pillTextFail,
                      ]}
                    >
                      {score.passed ? 'Réussi' : 'À revoir'}
                    </Text>
                  </View>
                </View>
              ))
            )}

            <FadeUp delay={250}>
            <Text style={styles.sectionTitle}>Sujets test · chapitres</Text>
            </FadeUp>
            {journey.testScores.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>Aucune note de sujet chapitre</Text>
                <Text style={styles.emptyText}>
                  Validez un sujet test pour voir votre score ici.
                </Text>
              </View>
            ) : (
              journey.testScores.map((score) => {
                const ratio = score.total > 0 ? score.correct / score.total : 0
                const good = ratio >= 0.5
                return (
                  <View key={score.chapterId} style={styles.scoreRow}>
                    <View style={[styles.badge, good ? styles.badgePass : styles.badgeFail]}>
                      <Text
                        style={[
                          styles.badgeText,
                          good ? styles.badgeTextPass : styles.badgeTextFail,
                        ]}
                      >
                        {score.scoreLabel}
                      </Text>
                    </View>
                    <View style={styles.scoreBody}>
                      <Text style={styles.scoreTitle}>{score.chapterName}</Text>
                      <Text style={styles.scoreMeta}>
                        {score.correct}/{score.total} bonnes réponses
                      </Text>
                    </View>
                  </View>
                )
              })
            )}
          </>
        ) : null}
        <LegalFooter />
      </ScrollView>
    </DarkScreen>
  )
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 18, paddingBottom: 28 },
  barDivider: {
    height: 1,
    marginHorizontal: 18,
    backgroundColor: 'rgba(0,16,48,0.10)',
  },
  head: { alignItems: 'center', marginBottom: 16 },
  kicker: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: dark.green,
    marginBottom: 6,
  },
  title: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 28,
    color: dark.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    marginTop: 8,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: dark.textMuted,
    textAlign: 'center',
  },
  stats: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  stat: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,16,48,0.08)',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    ...shadows.sm,
  },
  statValue: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 22,
    color: dark.textPrimary,
  },
  statLabel: {
    marginTop: 4,
    fontFamily: fonts.body,
    fontSize: 11,
    color: dark.textMuted,
    textAlign: 'center',
  },
  track: {
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,16,48,0.08)',
  },
  trackCode: { backgroundColor: brand.greenLight },
  trackDrive: { backgroundColor: brand.goldLight },
  trackTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  trackIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,16,48,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackCopy: { flex: 1 },
  trackTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: dark.textPrimary,
  },
  trackStop: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: dark.textMuted,
    marginTop: 2,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(0,16,48,0.10)',
    overflow: 'hidden',
    marginTop: 10,
  },
  progressFill: { height: '100%', borderRadius: 999 },
  progressFillGreen: { backgroundColor: dark.green },
  progressFillGold: { backgroundColor: '#F59E0B' },
  progressLabel: {
    marginTop: 6,
    fontFamily: fonts.body,
    fontSize: 12,
    color: dark.textMuted,
    textAlign: 'right',
  },
  sectionTitle: {
    marginTop: 20,
    marginBottom: 6,
    fontFamily: fonts.displayBold,
    fontSize: 17,
    color: dark.textPrimary,
    textAlign: 'center',
  },
  sectionSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: dark.textMuted,
    textAlign: 'center',
    marginBottom: 10,
  },
  emptyBox: {
    backgroundColor: dark.surface,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(0,16,48,0.15)',
    borderRadius: 20,
    padding: 22,
    marginBottom: 10,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: dark.textPrimary,
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: dark.textMuted,
    textAlign: 'center',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,16,48,0.08)',
    borderRadius: 20,
    padding: 12,
    marginBottom: 10,
    ...shadows.sm,
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePass: { backgroundColor: brand.greenLight },
  badgeFail: { backgroundColor: 'rgba(232,93,59,0.14)' },
  badgeText: { fontFamily: fonts.displayBold, fontSize: 14 },
  badgeTextPass: { color: '#007A3A' },
  badgeTextFail: { color: '#C2410C' },
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
    marginTop: 2,
  },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  pillPass: { backgroundColor: brand.greenLight },
  pillFail: { backgroundColor: 'rgba(232,93,59,0.14)' },
  pillText: { fontFamily: fonts.bodyBold, fontSize: 11 },
  pillTextPass: { color: '#007A3A' },
  pillTextFail: { color: '#C2410C' },
  error: { color: dark.coral, marginBottom: 12, fontFamily: fonts.body },
})
