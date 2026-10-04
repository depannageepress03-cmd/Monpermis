import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { LinearGradient } from 'expo-linear-gradient'
import {
  ArrowRight,
  BookOpen,
  Car,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Flag,
  RefreshCw,
  Sparkles,
  Target,
  Trophy,
  WifiOff,
} from 'lucide-react-native'
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { ContentError, fetchLearnerJourney, type LearnerJourney } from '../../api/revision'
import { Bouncy } from '../../components/Bouncy'
import { DarkScreen } from '../../components/DarkScreen'
import { FadeUp } from '../../components/FadeUp'
import { PageNavbar } from '../../components/PageNavbar'
import { ProgressBar } from '../../components/ProgressBar'
import { ProgressRing } from '../../components/ProgressRing'
import { ScreenLoader } from '../../components/ScreenLoader'
import { SkeletonCard } from '../../components/Skeleton'
import { useFocusRefresh } from '../../hooks/useFocusRefresh'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import type { RootStackParamList } from '../../navigation/types'
import { brand, dark, fonts, shadows } from '../../theme'

type Nav = NativeStackNavigationProp<RootStackParamList, 'MesNotes'>

const GOLD_DEEP = '#B8860B'

function ratio(done: number, total: number) {
  if (!total) return 0
  return Math.max(0, Math.min(1, done / total))
}

function pct(done: number, total: number) {
  return Math.round(ratio(done, total) * 100)
}

function formatDate(value?: string | null) {
  if (!value) return ''
  try {
    return new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  } catch {
    return ''
  }
}

function heroMessage(journey: LearnerJourney) {
  const codePct = pct(journey.code.chaptersDone, journey.code.chaptersTotal)
  const passed = journey.practiceExams?.passedCount ?? 0
  if (passed > 0) return `${passed} examen${passed > 1 ? 's' : ''} blanc${passed > 1 ? 's' : ''} réussi${passed > 1 ? 's' : ''}. Continue sur cette lancée.`
  if (codePct >= 100) return 'Tout le code est révisé. Place aux examens blancs.'
  if (codePct >= 50) return 'Plus de la moitié du parcours est derrière toi.'
  if (codePct > 0) return 'Tu as commencé : chaque chapitre validé compte.'
  return 'Ton parcours démarre ici. Première étape : la révision.'
}

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
      if (!silent) setJourney(null)
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

  const practice = journey?.practiceExams ?? null
  const examDistribution = useMemo(() => {
    if (!practice || !practice.examTotal) return { passed: 0, failed: 0, left: 1 }
    const failed = Math.max(0, practice.completedCount - practice.passedCount)
    const left = Math.max(0, practice.examTotal - practice.completedCount)
    return {
      passed: practice.passedCount / practice.examTotal,
      failed: failed / practice.examTotal,
      left: left / practice.examTotal,
    }
  }, [practice])

  if (authLoading || !user) return <ScreenLoader />

  const codePct = journey ? pct(journey.code.chaptersDone, journey.code.chaptersTotal) : 0

  return (
    <DarkScreen>
      <PageNavbar
        title="Mes notes & avancée"
        icon={FileText}
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
              void load(true)
            }}
            tintColor={dark.green}
          />
        }
      >
        {loading ? (
          <View>
            <SkeletonCard style={styles.skeletonHero} />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : null}

        {error && !loading ? (
          <View style={styles.errorCard}>
            <View style={styles.errorIcon}>
              <WifiOff size={20} color={dark.coral} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.errorTitle}>Impossible de charger tes notes</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
            <Pressable style={styles.retryBtn} onPress={() => void load()} hitSlop={8}>
              <RefreshCw size={16} color={dark.textPrimary} />
            </Pressable>
          </View>
        ) : null}

        {journey && !loading ? (
          <>
            <FadeUp delay={40}>
              <LinearGradient
                colors={['#E8F8EF', '#F3FBF6', '#FFFFFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.hero}
              >
                <View style={styles.heroCopy}>
                  <View style={styles.heroKickerRow}>
                    <Sparkles size={13} color={dark.green} />
                    <Text style={styles.heroKicker}>Progression</Text>
                  </View>
                  <Text style={styles.heroTitle}>Où j’en suis</Text>
                  <Text style={styles.heroText}>{heroMessage(journey)}</Text>
                </View>
                <ProgressRing progress={codePct / 100} size={104} stroke={10} delay={200}>
                  <Text style={styles.ringValue}>{codePct}%</Text>
                  <Text style={styles.ringLabel}>du code</Text>
                </ProgressRing>
              </LinearGradient>
            </FadeUp>

            <FadeUp delay={90}>
              <View style={styles.statsRow}>
                <View style={styles.statTile}>
                  <View style={[styles.statIcon, { backgroundColor: dark.greenSoft }]}>
                    <BookOpen size={15} color={dark.green} />
                  </View>
                  <Text style={styles.statValue}>
                    {journey.code.chaptersDone}
                    <Text style={styles.statTotal}>/{journey.code.chaptersTotal}</Text>
                  </Text>
                  <Text style={styles.statLabel}>chapitres</Text>
                </View>
                <View style={styles.statTile}>
                  <View style={[styles.statIcon, { backgroundColor: brand.goldLight }]}>
                    <Trophy size={15} color={GOLD_DEEP} />
                  </View>
                  <Text style={styles.statValue}>
                    {practice?.passedCount ?? 0}
                    <Text style={styles.statTotal}>/{practice?.examTotal ?? 0}</Text>
                  </Text>
                  <Text style={styles.statLabel}>examens réussis</Text>
                </View>
                <View style={styles.statTile}>
                  <View style={[styles.statIcon, { backgroundColor: brand.navyPale }]}>
                    <Target size={15} color={dark.textPrimary} />
                  </View>
                  <Text style={styles.statValue}>{journey.testScores.length}</Text>
                  <Text style={styles.statLabel}>sujets notés</Text>
                </View>
              </View>
            </FadeUp>

            <FadeUp delay={130}>
              <View style={styles.card}>
                <View style={styles.cardHead}>
                  <Text style={styles.cardTitle}>Mes parcours</Text>
                  <Text style={styles.cardHint}>Reprends là où tu t’es arrêté</Text>
                </View>

                <TrackRow
                  icon={<BookOpen size={18} color={dark.green} />}
                  iconBg={dark.greenSoft}
                  label="Code de la route"
                  value={journey.code.currentStop?.label ?? 'Aucun parcours code'}
                  done={journey.code.chaptersDone}
                  total={journey.code.chaptersTotal}
                  unit="chapitres validés"
                  color={dark.green}
                  cta={journey.code.chaptersTotal > 0 ? 'Reprendre' : undefined}
                  onPress={() => navigation.navigate('RevisionChapitres')}
                />
                <View style={styles.divider} />
                <TrackRow
                  icon={<Car size={18} color={GOLD_DEEP} />}
                  iconBg={brand.goldLight}
                  label="Conduite / pratique"
                  value={journey.conduite.currentStop?.label ?? 'Aucun parcours conduite'}
                  done={journey.conduite.chaptersDone}
                  total={journey.conduite.chaptersTotal}
                  unit="chapitres terminés"
                  color={brand.gold}
                  cta={journey.conduite.chaptersTotal > 0 ? 'Reprendre' : undefined}
                  onPress={() => navigation.navigate('Conduite')}
                />
              </View>
            </FadeUp>

            <FadeUp delay={170}>
              <View style={styles.card}>
                <View style={styles.cardHead}>
                  <Text style={styles.cardTitle}>Examens test</Text>
                  <Text style={styles.cardHint}>
                    Note sur 20 · seuil {practice?.passScore ?? 14}/20
                  </Text>
                </View>

                {practice && practice.examTotal > 0 ? (
                  <>
                    <View style={styles.distribution}>
                      <View style={[styles.distSeg, { flex: examDistribution.passed, backgroundColor: dark.green }]} />
                      <View style={[styles.distSeg, { flex: examDistribution.failed, backgroundColor: dark.coral }]} />
                      <View style={[styles.distSeg, { flex: examDistribution.left, backgroundColor: dark.surfaceRaised }]} />
                    </View>
                    <View style={styles.legendRow}>
                      <Legend color={dark.green} label={`${practice.passedCount} réussi${practice.passedCount > 1 ? 's' : ''}`} />
                      <Legend
                        color={dark.coral}
                        label={`${Math.max(0, practice.completedCount - practice.passedCount)} à retravailler`}
                      />
                      <Legend
                        color={'rgba(0,16,48,0.25)'}
                        label={`${Math.max(0, practice.examTotal - practice.completedCount)} restant${practice.examTotal - practice.completedCount > 1 ? 's' : ''}`}
                      />
                    </View>
                  </>
                ) : null}

                {!practice || practice.scores.length === 0 ? (
                  <EmptyBlock
                    icon={<ClipboardCheck size={22} color={dark.green} />}
                    title="Aucun examen passé"
                    text="Passe ton premier examen blanc : la note apparaîtra ici avec ton seuil de réussite."
                    cta="Passer un examen test"
                    onPress={() => navigation.navigate('ExamensTest')}
                  />
                ) : (
                  <View style={styles.list}>
                    {practice.scores.map((score) => (
                      <ScoreRow
                        key={score.id}
                        badge={score.scoreLabel}
                        passed={score.passed}
                        title={`Examen ${score.examNumber}`}
                        meta={`${score.passed ? 'Réussi' : 'À retravailler'} · ${score.correct}/${score.total} bonnes réponses`}
                        date={formatDate(score.completedAt)}
                        onPress={() =>
                          navigation.navigate('ExamensTestTake', { examNumber: score.examNumber })
                        }
                      />
                    ))}
                  </View>
                )}
              </View>
            </FadeUp>

            <FadeUp delay={210}>
              <View style={styles.card}>
                <View style={styles.cardHead}>
                  <Text style={styles.cardTitle}>Sujets test par chapitre</Text>
                  <Text style={styles.cardHint}>Ta meilleure note sur chaque chapitre</Text>
                </View>
                {journey.testScores.length === 0 ? (
                  <EmptyBlock
                    icon={<Flag size={22} color={dark.green} />}
                    title="Aucun sujet terminé"
                    text="Termine le sujet test d’un chapitre pour voir ta note ici."
                    cta="Voir les chapitres"
                    onPress={() => navigation.navigate('RevisionChapitres')}
                  />
                ) : (
                  <View style={styles.list}>
                    {journey.testScores.map((score) => (
                      <ScoreRow
                        key={score.chapterId}
                        badge={score.scoreLabel}
                        passed={score.total > 0 ? score.correct / score.total >= 0.7 : true}
                        title={score.chapterName}
                        meta={`${score.correct}/${score.total} bonnes réponses`}
                        progress={score.total ? score.correct / score.total : 0}
                        date={formatDate(score.completedAt)}
                      />
                    ))}
                  </View>
                )}
              </View>
            </FadeUp>
          </>
        ) : null}
      </ScrollView>
    </DarkScreen>
  )
}

function TrackRow({
  icon,
  iconBg,
  label,
  value,
  done,
  total,
  unit,
  color,
  cta,
  onPress,
}: {
  icon: ReactNode
  iconBg: string
  label: string
  value: string
  done: number
  total: number
  unit: string
  color: string
  cta?: string
  onPress: () => void
}) {
  const complete = total > 0 && done >= total
  return (
    <View style={styles.track}>
      <View style={styles.trackTop}>
        <View style={[styles.trackIcon, { backgroundColor: iconBg }]}>{icon}</View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.trackLabel}>{label}</Text>
          <Text style={styles.trackValue} numberOfLines={2}>
            {value}
          </Text>
        </View>
        <Text style={[styles.trackPct, { color: color === brand.gold ? GOLD_DEEP : color }]}>
          {pct(done, total)}%
        </Text>
      </View>
      <ProgressBar progress={ratio(done, total)} color={color} trackColor={dark.surfaceRaised} height={8} />
      <View style={styles.trackFoot}>
        <Text style={styles.trackMeta}>
          {done}/{total} {unit}
        </Text>
        {cta ? (
          <Pressable
            style={({ pressed }) => [styles.trackCta, pressed && styles.pressed]}
            onPress={onPress}
            hitSlop={6}
          >
            <Text style={styles.trackCtaText}>{complete ? 'Revoir' : cta}</Text>
            <ArrowRight size={14} color={dark.green} />
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legend}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  )
}

function ScoreRow({
  badge,
  passed,
  title,
  meta,
  date,
  progress,
  onPress,
}: {
  badge: string
  passed: boolean
  title: string
  meta: string
  date?: string
  progress?: number
  onPress?: () => void
}) {
  const content = (
    <View style={styles.scoreRow}>
      <View style={[styles.scoreBadge, passed ? styles.scoreBadgePass : styles.scoreBadgeFail]}>
        <Text style={[styles.scoreBadgeText, passed ? styles.scoreBadgeTextPass : styles.scoreBadgeTextFail]}>
          {badge}
        </Text>
      </View>
      <View style={styles.scoreBody}>
        <View style={styles.scoreTitleRow}>
          <Text style={styles.scoreTitle} numberOfLines={1}>
            {title}
          </Text>
          {date ? <Text style={styles.scoreDate}>{date}</Text> : null}
        </View>
        <Text style={styles.scoreMeta} numberOfLines={1}>
          {meta}
        </Text>
        {progress !== undefined ? (
          <View style={{ marginTop: 6 }}>
            <ProgressBar
              progress={progress}
              color={passed ? dark.green : dark.coral}
              trackColor={dark.surfaceRaised}
              height={5}
            />
          </View>
        ) : null}
      </View>
      {passed ? (
        <CheckCircle2 size={18} color={dark.green} />
      ) : onPress ? (
        <ArrowRight size={18} color={dark.textMuted} />
      ) : null}
    </View>
  )
  if (!onPress) return content
  return (
    <Bouncy scaleTo={0.98} onPress={onPress}>
      {content}
    </Bouncy>
  )
}

function EmptyBlock({
  icon,
  title,
  text,
  cta,
  onPress,
}: {
  icon: ReactNode
  title: string
  text: string
  cta: string
  onPress: () => void
}) {
  return (
    <View style={styles.emptyBox}>
      <View style={styles.emptyIcon}>{icon}</View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{text}</Text>
      <Bouncy scaleTo={0.97} onPress={onPress}>
        <View style={styles.emptyCta}>
          <Text style={styles.emptyCtaText}>{cta}</Text>
          <ArrowRight size={16} color="#FFFFFF" />
        </View>
      </Bouncy>
    </View>
  )
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingBottom: 28, paddingTop: 2 },
  skeletonHero: { minHeight: 150, borderRadius: 26 },

  hero: {
    borderRadius: 26,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 12,
    overflow: 'hidden',
    ...shadows.sm,
  },
  heroCopy: { flex: 1, minWidth: 0, gap: 6 },
  heroKickerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroKicker: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    color: dark.green,
  },
  heroTitle: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 24,
    lineHeight: 29,
    letterSpacing: -0.4,
    color: dark.textPrimary,
  },
  heroText: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: dark.textMuted,
  },
  ringValue: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 22,
    color: dark.textPrimary,
    letterSpacing: -0.5,
  },
  ringLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    color: dark.textMuted,
    marginTop: -2,
  },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statTile: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: dark.border,
  },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 20,
    letterSpacing: -0.4,
    color: dark.textPrimary,
  },
  statTotal: {
    fontFamily: fonts.displayBold,
    fontSize: 13,
    color: dark.textMuted,
  },
  statLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: dark.textMuted,
  },

  card: {
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 14,
    gap: 14,
    borderWidth: 1,
    borderColor: dark.border,
  },
  cardHead: { gap: 2 },
  cardTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 17,
    color: dark.textPrimary,
  },
  cardHint: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: dark.textMuted,
  },
  divider: { height: 1, backgroundColor: dark.border },

  track: { gap: 10 },
  trackTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  trackIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: dark.textMuted,
  },
  trackValue: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    lineHeight: 20,
    color: dark.textPrimary,
  },
  trackPct: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 18,
    letterSpacing: -0.3,
  },
  trackFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  trackMeta: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: dark.textMuted,
  },
  trackCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: dark.greenSoft,
  },
  trackCtaText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12.5,
    color: dark.green,
  },

  distribution: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
    gap: 2,
  },
  distSeg: { height: 10 },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: -4,
  },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 999 },
  legendText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: dark.textMuted,
  },

  list: { gap: 8 },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: dark.surface,
    borderRadius: 16,
    padding: 12,
  },
  scoreBadge: {
    minWidth: 58,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  scoreBadgePass: { backgroundColor: dark.greenSoft },
  scoreBadgeFail: { backgroundColor: dark.coralSoft },
  scoreBadgeText: { fontFamily: fonts.displayExtraBold, fontSize: 14, letterSpacing: -0.2 },
  scoreBadgeTextPass: { color: dark.green },
  scoreBadgeTextFail: { color: dark.coral },
  scoreBody: { flex: 1, minWidth: 0 },
  scoreTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scoreTitle: {
    flex: 1,
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: dark.textPrimary,
  },
  scoreDate: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: dark.textMuted,
  },
  scoreMeta: {
    marginTop: 2,
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: dark.textMuted,
  },

  emptyBox: {
    alignItems: 'center',
    borderRadius: 18,
    padding: 18,
    backgroundColor: dark.surface,
    gap: 6,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: dark.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: dark.textPrimary,
    textAlign: 'center',
  },
  emptyText: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: dark.textMuted,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: dark.green,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  emptyCtaText: {
    fontFamily: fonts.displayBold,
    fontSize: 14,
    color: '#FFFFFF',
  },

  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: dark.coralSoft,
    marginBottom: 14,
  },
  errorIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: dark.textPrimary,
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    lineHeight: 18,
    color: dark.textMuted,
    marginTop: 2,
  },
  retryBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.8 },
})
