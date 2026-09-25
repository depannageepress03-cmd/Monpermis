import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { setStatusBarStyle } from 'expo-status-bar'
import { ChevronDown, TrendingUp } from 'lucide-react-native'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { fetchLearnerJourney, fetchPracticeExams, type LearnerJourney, type PracticeExamScore } from '../api/revision'
import { fetchDrivingDashboard } from '../api/reservations'
import { ScreenLoader } from '../components/ScreenLoader'
import { useRequireAuth } from '../hooks/useRequireAuth'
import type { RootStackParamList } from '../navigation/types'
import { colors } from '../theme/tokens'
import { Chip } from '../components/ui-kit-core'
import { NotchedCard } from '../components/ui-kit-cards'
import { MainTabBar, ProgressRing } from '../components/ui-kit-nav'
import { useFocusEffect } from '@react-navigation/native'

type Nav = NativeStackNavigationProp<RootStackParamList, 'Progres'>

function formatDate(iso?: string | null) {
  if (!iso) return ''
  const [datePart] = iso.split('T')
  const [y, m, d] = (datePart || '').split('-')
  if (!y || !m || !d) return ''
  return `${d}-${m}-${y}`
}

function formatTime(iso?: string | null) {
  if (!iso || !iso.includes('T')) return ''
  const [, timePart] = iso.split('T')
  const [h, min] = (timePart || '').split(':')
  if (!h || !min) return ''
  return `${h}:${min}`
}

export function ProgresScreen() {
  const navigation = useNavigation<Nav>()
  const { user, loading } = useRequireAuth(navigation)
  const [journey, setJourney] = useState<LearnerJourney | null>(null)
  const [examScores, setExamScores] = useState<PracticeExamScore[]>([])
  const [drivingDone, setDrivingDone] = useState(0)
  const [drivingTotal, setDrivingTotal] = useState(20)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (silent = false) => {
    if (!user) return
    if (!silent) setRefreshing(true)
    try {
      const [journeyData, examsData, drivingData] = await Promise.all([
        fetchLearnerJourney().catch(() => null),
        fetchPracticeExams().then((data) => data.scores ?? []).catch(() => [] as PracticeExamScore[]),
        fetchDrivingDashboard().then((data) => data.progress).catch(() => null),
      ])
      setJourney(journeyData)
      setExamScores(examsData)
      if (drivingData) {
        setDrivingDone(drivingData.heuresEffectuees ?? 0)
        setDrivingTotal(drivingData.heuresObjectif ?? 20)
      }
    } finally {
      setRefreshing(false)
    }
  }, [user])

  useEffect(() => {
    void load()
  }, [load])

  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('dark')
      void load(true)
      return () => setStatusBarStyle('dark')
    }, [load]),
  )

  const code = journey?.code
  const codeTotal = code?.chaptersTotal ?? 0
  const codeDone = code?.chaptersDone ?? 0
  const courseRatio = codeTotal > 0 ? codeDone / codeTotal : 0
  const exams = journey?.practiceExams
  const examRatio = exams && exams.examTotal > 0 ? Math.min(1, (exams.passedCount ?? 0) / exams.examTotal) : 0
  const driveRatio = drivingTotal > 0 ? Math.min(1, drivingDone / drivingTotal) : 0
  const percent = Math.round(courseRatio * 100)
  const last = examScores[examScores.length - 1]
  const prev = examScores[examScores.length - 2]
  const delta = last && prev ? last.correct - prev.correct : null
  const examsPassed = exams?.passedCount ?? 0
  const examsTotal = exams?.examTotal ?? 0
  const lastErrors = last ? Math.max(0, last.total - last.correct) : 0

  const lastTest = useMemo(() => {
    const scored = [...(journey?.testScores ?? [])].sort((a, b) =>
      String(b.completedAt || '').localeCompare(String(a.completedAt || '')),
    )
    return scored[0] ?? null
  }, [journey])

  if (loading || !user) return <ScreenLoader />

  return (
    <View style={styles.root}>
      <View style={styles.halo} pointerEvents="none" />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          bounces
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load()}
              tintColor={colors.green}
            />
          }
        >
          <View style={styles.headRow}>
            <View>
              <Text style={styles.h1}>Ma progression</Text>
              <Text style={styles.sub}>Code, examens et conduite</Text>
            </View>
            <View style={styles.filter} accessibilityRole="button" accessibilityLabel="Filtrer la période">
              <Text style={styles.filterText}>30 jours</Text>
              <ChevronDown size={14} color={colors.navy} strokeWidth={2.4} />
            </View>
          </View>

          <ProgressRing
            course={courseRatio}
            exams={examRatio}
            driving={driveRatio}
            percent={percent}
            trend={delta != null && delta !== 0 ? `${delta > 0 ? '+' : ''}${delta} pts` : undefined}
          />

          <View style={styles.cards}>
            <View style={styles.mini}>
              <View style={styles.legendRow}>
                <View style={[styles.dot, { backgroundColor: colors.green }]} />
                <Text style={styles.legend}>Cours</Text>
              </View>
              <Text style={styles.miniNum}>
                {codeDone}
                <Text style={styles.miniDen}>/{codeTotal}</Text>
              </Text>
            </View>
            <View style={styles.mini}>
              <View style={styles.legendRow}>
                <View style={[styles.dot, { backgroundColor: colors.navy }]} />
                <Text style={styles.legend}>Examens</Text>
              </View>
              <Text style={styles.miniNum}>
                {examsPassed}
                <Text style={styles.miniDen}>/{examsTotal} moy.</Text>
              </Text>
            </View>
            <View style={styles.mini}>
              <View style={styles.legendRow}>
                <View style={[styles.dot, { backgroundColor: colors.yellow }]} />
                <Text style={styles.legend}>Conduite</Text>
              </View>
              <Text style={styles.miniNum}>
                {drivingDone}
                <Text style={styles.miniDen}>/{drivingTotal} h</Text>
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Activité récente</Text>

          {last ? (
            <NotchedCard
              tabLabel="Examen blanc"
              tabColor={colors.navy}
              time={formatTime(last.completedAt)}
              date={formatDate(last.completedAt)}
            >
              <Text style={styles.examTitle}>Examen blanc n°{last.examNumber}</Text>
              <View style={styles.chipRow}>
                <Chip variant="yellow" small>
                  <Text style={styles.yellowChipText}>{last.correct}/{last.total}</Text>
                </Chip>
                <Chip variant={last.passed ? 'green' : 'glass'} small>
                  <Text style={last.passed ? styles.greenChipText : styles.glassChipText}>
                    {last.passed ? 'Réussi' : 'À revoir'}
                  </Text>
                </Chip>
              </View>
              <View style={styles.divider} />
              <Text style={styles.examMeta}>{lastErrors} erreur{lastErrors > 1 ? 's' : ''} à revoir</Text>
            </NotchedCard>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Passe ton premier examen blanc pour voir tes résultats ici.</Text>
            </View>
          )}

          {lastTest ? (
            <NotchedCard
              tabLabel="Sujet test"
              tabColor={colors.greenTint2}
              tone="light"
              tabIcon={<View style={styles.tabDot} />}
              date={formatDate(lastTest.completedAt)}
            >
              <Text style={[styles.examTitle, { color: colors.greenInk }]}>{lastTest.chapterName}</Text>
              <Text style={styles.testMeta}>
                {lastTest.correct}/{lastTest.total} bonnes réponses
              </Text>
            </NotchedCard>
          ) : null}
          <View style={{ height: 120 }} />
        </ScrollView>
      </SafeAreaView>
      <MainTabBar activeId="progres" />
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  halo: {
    position: 'absolute',
    top: 120,
    left: 50,
    width: 290,
    height: 290,
    borderRadius: 145,
    backgroundColor: colors.green,
    opacity: 0.1,
  },
  safe: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 56,
    gap: 14,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  h1: {
    fontFamily: 'Sora_700Bold',
    fontSize: 26,
    letterSpacing: -0.52,
    color: colors.navy,
  },
  sub: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: colors.muted,
    marginTop: 3,
  },
  filter: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12.5,
    color: colors.navy,
  },
  cards: {
    flexDirection: 'row',
    gap: 8,
  },
  mini: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legend: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11.5,
    color: colors.muted,
  },
  miniNum: {
    fontFamily: 'Sora_700Bold',
    fontSize: 16,
    color: colors.navy,
  },
  miniDen: {
    fontFamily: 'Sora_700Bold',
    fontSize: 13,
    color: colors.subtle,
  },
  sectionTitle: {
    marginTop: 6,
    fontFamily: 'Sora_700Bold',
    fontSize: 18,
    color: colors.navy,
  },
  examTitle: {
    fontFamily: 'Sora_700Bold',
    fontSize: 17,
    color: '#FFFFFF',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  yellowChipText: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 12,
    color: colors.navy,
  },
  greenChipText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    color: colors.greenDark,
  },
  glassChipText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  examMeta: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.8)',
  },
  testMeta: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12.5,
    color: colors.ink2,
  },
  tabDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.green,
  },
  empty: {
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    padding: 18,
  },
  emptyText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13.5,
    color: colors.muted,
  },
})
