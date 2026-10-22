import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { LinearGradient } from 'expo-linear-gradient'
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  FileText,
  GraduationCap,
  HelpCircle,
  MinusCircle,
  Trophy,
  TrendingDown,
  XCircle,
} from 'lucide-react-native'
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import {
  ContentError,
  fetchLearnerJourney,
  fetchLearnerResults,
  type LearnerJourney,
  type LearnerResultsReport,
  type ResultExamRow,
} from '../../api/revision'
import { DarkScreen } from '../../components/DarkScreen'
import { PageNavbar } from '../../components/PageNavbar'
import { ScreenLoader } from '../../components/ScreenLoader'
import { useFocusRefresh } from '../../hooks/useFocusRefresh'
import { useRequireAuth } from '../../hooks/useRequireAuth'
import type { RootStackParamList } from '../../navigation/types'
import { fonts } from '../../theme'
import { ResultReviewSheet } from './ResultReviewSheet'
import { RES, formatDateFr, formatNote, percent } from './resultsTheme'

type Nav = NativeStackNavigationProp<RootStackParamList, 'MesNotes'>

const EXAMS_PREVIEW = 4

export function MesNotesScreen() {
  const navigation = useNavigation<Nav>()
  const { user, loading: authLoading } = useRequireAuth(navigation)
  const [report, setReport] = useState<LearnerResultsReport | null>(null)
  const [journey, setJourney] = useState<LearnerJourney | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAllExams, setShowAllExams] = useState(false)
  const [showRemaining, setShowRemaining] = useState(false)
  const [selected, setSelected] = useState<ResultExamRow | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    const [reportResult, journeyResult] = await Promise.allSettled([
      fetchLearnerResults(),
      fetchLearnerJourney(),
    ])
    if (reportResult.status === 'fulfilled') {
      setReport(reportResult.value)
      setError(null)
    } else {
      setError(
        reportResult.reason instanceof ContentError ? reportResult.reason.message : 'Chargement impossible',
      )
    }
    if (journeyResult.status === 'fulfilled') setJourney(journeyResult.value)
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    if (user) void load()
  }, [user, load])

  useFocusRefresh(Boolean(user), () => {
    void load(true)
  })

  // Examens les plus récents d'abord ; le plus récent est mis en avant (carte bleue pleine).
  const exams = useMemo(
    () =>
      [...(report?.exams.rows ?? [])].sort(
        (a, b) => new Date(b.lastAt || 0).getTime() - new Date(a.lastAt || 0).getTime(),
      ),
    [report],
  )
  const visibleExams = showAllExams ? exams : exams.slice(0, EXAMS_PREVIEW)

  const remainingByChapter = useMemo(() => {
    const map = new Map<string, { name: string; titles: string[] }>()
    for (const lesson of report?.course.remaining ?? []) {
      const key = `${lesson.chapterOrder}|${lesson.chapterId}`
      if (!map.has(key)) map.set(key, { name: lesson.chapterName, titles: [] })
      map.get(key)!.titles.push(`${lesson.title}${lesson.state === 'in_progress' ? ' (en cours)' : ''}`)
    }
    return [...map.values()]
  }, [report])

  if (authLoading || !user) return <ScreenLoader />

  const summary = report?.exams.summary
  const course = report?.course
  const passScore = report?.exams.passScore ?? 14
  const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || '?'
  const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()

  return (
    <DarkScreen>
      <View style={styles.page}>
        <PageNavbar title="Mes résultats" icon={FileText} onBack={() => navigation.navigate('CodeRoute')} />

        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true)
                void load(true)
              }}
              tintColor={RES.navy}
            />
          }
        >
          <Text style={styles.hello}>Bonjour {user.firstName} !</Text>
          <Text style={styles.helloSub}>Voici le suivi de vos examens et de votre cours</Text>

          {loading && !report ? <ActivityIndicator color={RES.navy} style={{ marginTop: 24 }} /> : null}
          {error && !journey ? <Text style={styles.error}>Impossible de charger vos résultats. Tirez vers le bas pour réessayer.</Text> : null}

          {/* Serveur pas encore à jour : on affiche les notes déjà disponibles (ancien format). */}
          {!report && !loading && journey ? (
            <>
              <Text style={styles.note}>
                Le détail complet (moyenne, correction, progression) sera disponible dès la mise à jour du serveur.
                En attendant, voici vos notes.
              </Text>
              <SectionHead title="Examens blancs" />
              {journey.practiceExams.scores.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>Aucune note d’examen pour le moment.</Text>
                </View>
              ) : (
                <View style={styles.list}>
                  {journey.practiceExams.scores.map((score) => (
                    <Row
                      key={score.id}
                      icon={ClipboardCheck}
                      title={`Examen n° ${score.examNumber}`}
                      subtitle={`${score.passed ? 'Réussi' : 'Non réussi'} · seuil ${score.passScore}/20`}
                      right={score.scoreLabel}
                    />
                  ))}
                </View>
              )}
              <SectionHead title="Où j’en suis" />
              <View style={styles.list}>
                <Row
                  icon={ClipboardCheck}
                  title="Code de la route"
                  subtitle={journey.code.currentStop?.label ?? 'Aucun parcours code'}
                  right={`${journey.code.chaptersDone}/${journey.code.chaptersTotal}`}
                  rightLabel="chapitres"
                />
              </View>
              {journey.testScores.length > 0 ? (
                <>
                  <SectionHead title="Sujets test par chapitre" />
                  <View style={styles.list}>
                    {journey.testScores.map((score) => (
                      <Row
                        key={score.chapterId}
                        icon={ClipboardCheck}
                        title={score.chapterName}
                        subtitle={`${score.correct}/${score.total} bonnes réponses`}
                        right={score.scoreLabel}
                      />
                    ))}
                  </View>
                </>
              ) : null}
            </>
          ) : null}

          {report && summary && course ? (
            <>
              {/* Carte héros : identité + 3 chiffres clés */}
              <LinearGradient
                colors={[RES.navy, RES.navyDeep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.hero}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
                <Text style={styles.heroName}>{fullName}</Text>
                <Text style={styles.heroRole}>Élève · Code de la route</Text>
                <View style={styles.heroStats}>
                  <HeroStat value={summary.average === null ? '—' : formatNote(summary.average)} label="Moyenne /20" />
                  <HeroStat value={String(summary.evaluatedCount)} label="Examens" />
                  <HeroStat value={course.percent === null ? '—' : `${course.percent}%`} label="Cours" />
                </View>
              </LinearGradient>

              {summary.average === null ? (
                <Text style={styles.note}>
                  Aucun examen évalué pour le moment : la moyenne apparaîtra dès votre première réponse à un examen blanc.
                </Text>
              ) : (
                <Text style={styles.note}>
                  Moyenne calculée sur {summary.evaluatedCount} examen{summary.evaluatedCount > 1 ? 's' : ''} (meilleure
                  tentative de chaque sujet). Seuil de réussite : {passScore}/20.
                </Text>
              )}

              {/* Examens blancs */}
              <SectionHead
                title="Examens blancs"
                action={exams.length > EXAMS_PREVIEW ? (showAllExams ? 'Réduire' : 'Tout voir') : undefined}
                onAction={() => setShowAllExams((v) => !v)}
              />
              {exams.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>Aucun examen blanc composé pour le moment.</Text>
                </View>
              ) : (
                <View style={styles.grid}>
                  {visibleExams.map((row, index) => (
                    <ExamCard
                      key={row.attemptId}
                      row={row}
                      featured={index === 0}
                      onPress={() => setSelected(row)}
                    />
                  ))}
                </View>
              )}

              {/* Synthèse (cartes défilantes) */}
              <SectionHead title="Synthèse" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.folders}>
                <Folder icon={HelpCircle} label="Questions au total" value={String(summary.totalQuestions)} />
                <Folder icon={CheckCircle2} label="Correctes" value={String(summary.totalCorrect)} tone="ok" />
                <Folder icon={XCircle} label="Incorrectes" value={String(summary.totalIncorrect)} tone="ko" />
                <Folder icon={MinusCircle} label="Non traitées" value={String(summary.totalUnanswered)} tone="warn" />
                <Folder icon={ClipboardCheck} label="Examens terminés" value={String(summary.completedCount)} />
                <Folder icon={ClipboardCheck} label="Non terminés" value={String(summary.unfinishedCount)} tone="warn" />
                <Folder icon={Trophy} label="Meilleure note" value={summary.bestNote === null ? '—' : `${formatNote(summary.bestNote)}/20`} />
                <Folder icon={TrendingDown} label="Plus faible" value={summary.lowestNote === null ? '—' : `${formatNote(summary.lowestNote)}/20`} />
              </ScrollView>

              {/* Mon cours */}
              <SectionHead title="Mon cours" />
              <View style={styles.list}>
                <Row
                  icon={GraduationCap}
                  title={`Leçons terminées : ${course.completed}/${course.total}`}
                  subtitle={course.statusLabel}
                  right={course.percent === null ? '—' : `${course.percent}%`}
                />
                <Row
                  icon={BookOpen}
                  title="Suivi des leçons"
                  subtitle={`${course.followed} suivie${course.followed > 1 ? 's' : ''} · ${course.inProgress} en cours · ${course.notStarted} non commencée${course.notStarted > 1 ? 's' : ''}`}
                  right={`${course.chaptersValidated}/${course.chaptersTotal}`}
                  rightLabel="chapitres validés"
                />
                {journey ? (
                  <Row
                    icon={ClipboardCheck}
                    title="Où j’en suis"
                    subtitle={journey.code.currentStop?.label ?? 'Aucun parcours code'}
                    right={`${journey.code.chaptersDone}/${journey.code.chaptersTotal}`}
                    rightLabel="chapitres"
                  />
                ) : null}
                {journey && journey.conduite.chaptersTotal > 0 ? (
                  <Row
                    icon={BookOpen}
                    title="Conduite / pratique"
                    subtitle={journey.conduite.currentStop?.label ?? 'Aucun parcours conduite'}
                    right={`${journey.conduite.chaptersDone}/${journey.conduite.chaptersTotal}`}
                    rightLabel="chapitres"
                  />
                ) : null}
              </View>

              {course.total === 0 ? (
                <Text style={styles.note}>
                  Le programme de cours n’est pas encore publié : la progression sera disponible dès son ouverture.
                </Text>
              ) : (
                <Pressable style={styles.remainingToggle} onPress={() => setShowRemaining((v) => !v)}>
                  <Text style={styles.remainingToggleText}>Leçons restantes ({course.remaining.length})</Text>
                  {showRemaining ? <ChevronUp size={18} color={RES.navy} /> : <ChevronDown size={18} color={RES.navy} />}
                </Pressable>
              )}
              {showRemaining
                ? remainingByChapter.map((chapter) => (
                    <View key={chapter.name} style={styles.chapterBox}>
                      <Text style={styles.chapterName}>{chapter.name}</Text>
                      {chapter.titles.map((title) => (
                        <Text key={title} style={styles.chapterLesson}>
                          • {title}
                        </Text>
                      ))}
                    </View>
                  ))
                : null}

              {/* Notes des sujets de chapitre (existant, conservé) */}
              {journey && journey.testScores.length > 0 ? (
                <>
                  <SectionHead title="Sujets test par chapitre" />
                  <View style={styles.list}>
                    {journey.testScores.map((score) => (
                      <Row
                        key={score.chapterId}
                        icon={ClipboardCheck}
                        title={score.chapterName}
                        subtitle={`${score.correct}/${score.total} bonnes réponses`}
                        right={score.scoreLabel}
                      />
                    ))}
                  </View>
                </>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      </View>

      <ResultReviewSheet row={selected} passScore={passScore} onClose={() => setSelected(null)} />
    </DarkScreen>
  )
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.heroStat}>
      <Text style={styles.heroStatValue}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
  )
}

function SectionHead({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={10}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

function ExamCard({
  row,
  featured,
  onPress,
}: {
  row: ResultExamRow
  featured: boolean
  onPress: () => void
}) {
  const answered = percent(row.treated, row.total)
  const fg = featured ? '#fff' : RES.ink
  const sub = featured ? 'rgba(255,255,255,0.75)' : RES.muted
  const status = row.completed ? (row.passed ? 'Terminé · Réussi' : 'Terminé · Raté') : 'Non terminé'

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${row.subject}, note ${formatNote(row.note)} sur 20`}
      style={({ pressed }) => [styles.examCard, featured ? styles.examCardFeatured : styles.examCardTint, pressed && { opacity: 0.9 }]}
    >
      <Text style={[styles.examDate, { color: sub }]}>{formatDateFr(row.lastAt)}</Text>
      <View style={styles.examTitleRow}>
        <View style={[styles.examIcon, { borderColor: featured ? 'rgba(255,255,255,0.6)' : RES.navy }]}>
          <ClipboardCheck size={16} color={fg} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.examName, { color: fg }]} numberOfLines={1}>
            Examen n° {row.examNumber}
          </Text>
          <Text style={[styles.examStatus, { color: sub }]} numberOfLines={1}>
            {status}
          </Text>
        </View>
      </View>

      <Text style={[styles.examLabel, { color: sub }]}>Questions traitées</Text>
      <View style={[styles.barTrack, { backgroundColor: featured ? 'rgba(255,255,255,0.25)' : '#C9D8F3' }]}>
        <View style={[styles.barFill, { width: `${answered}%`, backgroundColor: featured ? '#fff' : RES.navy }]} />
      </View>
      <View style={styles.examFoot}>
        <Text style={[styles.examLabel, { color: sub, marginTop: 0 }]}>
          {row.treated}/{row.total}
        </Text>
        <Text style={[styles.examNote, { color: fg }]}>
          {formatNote(row.note)}
          <Text style={{ fontSize: 11 }}>/20</Text>
        </Text>
      </View>
      {!row.counted ? (
        <Text style={[styles.examLabel, { color: sub }]} numberOfLines={1}>
          Hors moyenne (meilleure tentative ailleurs)
        </Text>
      ) : null}
    </Pressable>
  )
}

function Folder({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof HelpCircle
  label: string
  value: string
  tone?: 'ok' | 'ko' | 'warn'
}) {
  const color = tone === 'ok' ? RES.ok : tone === 'ko' ? RES.ko : tone === 'warn' ? RES.warn : RES.navy
  return (
    <View style={styles.folder}>
      <View style={[styles.folderIcon, { borderColor: color }]}>
        <Icon size={18} color={color} />
      </View>
      <View>
        <Text style={styles.folderValue}>{value}</Text>
        <Text style={styles.folderLabel}>{label}</Text>
      </View>
    </View>
  )
}

function Row({
  icon: Icon,
  title,
  subtitle,
  right,
  rightLabel,
}: {
  icon: typeof HelpCircle
  title: string
  subtitle: string
  right: string
  rightLabel?: string
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Icon size={20} color={RES.navy} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.rowSub} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.rowRightValue}>{right}</Text>
        {rightLabel ? <Text style={styles.rowRightLabel}>{rightLabel}</Text> : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: RES.bg },
  scroll: { paddingHorizontal: 20, paddingBottom: 32 },
  hello: { fontFamily: fonts.displayBold, fontSize: 24, color: RES.ink },
  helloSub: { fontFamily: fonts.body, fontSize: 13, color: RES.muted, marginTop: 2, marginBottom: 16 },
  error: { fontFamily: fonts.body, color: RES.ko, marginVertical: 12 },
  note: { fontFamily: fonts.body, fontSize: 12.5, lineHeight: 18, color: RES.muted, marginTop: 10 },

  hero: { borderRadius: 26, paddingVertical: 22, paddingHorizontal: 16, alignItems: 'center' },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.displayBold, fontSize: 24, color: '#fff' },
  heroName: { fontFamily: fonts.displayBold, fontSize: 17, color: '#fff', marginTop: 10, textAlign: 'center' },
  heroRole: { fontFamily: fonts.body, fontSize: 12.5, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  heroStats: { flexDirection: 'row', alignSelf: 'stretch', marginTop: 18 },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatValue: { fontFamily: fonts.displayBold, fontSize: 24, color: '#fff' },
  heroStatLabel: { fontFamily: fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 12 },
  sectionTitle: { fontFamily: fonts.displayBold, fontSize: 16, color: RES.ink },
  sectionAction: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: RES.muted },

  emptyBox: { backgroundColor: RES.tint, borderRadius: 18, padding: 16 },
  emptyText: { fontFamily: fonts.body, fontSize: 13.5, color: RES.muted },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  examCard: { width: '48.5%', borderRadius: 20, padding: 14 },
  examCardFeatured: { backgroundColor: RES.navy },
  examCardTint: { backgroundColor: RES.tint },
  examDate: { fontFamily: fonts.bodyMedium, fontSize: 10.5 },
  examTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  examIcon: { width: 32, height: 32, borderRadius: 9, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  examName: { fontFamily: fonts.bodyBold, fontSize: 14 },
  examStatus: { fontFamily: fonts.body, fontSize: 10.5, marginTop: 1 },
  examLabel: { fontFamily: fonts.body, fontSize: 10.5, marginTop: 12 },
  barTrack: { height: 5, borderRadius: 3, marginTop: 5, overflow: 'hidden' },
  barFill: { height: 5, borderRadius: 3 },
  examFoot: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 6 },
  examNote: { fontFamily: fonts.displayBold, fontSize: 20 },

  folders: { gap: 10, paddingRight: 8 },
  folder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: RES.tint,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    minWidth: 150,
  },
  folderIcon: { width: 38, height: 38, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  folderValue: { fontFamily: fonts.displayBold, fontSize: 17, color: RES.ink },
  folderLabel: { fontFamily: fonts.body, fontSize: 11, color: RES.muted, marginTop: 1 },

  list: { gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: RES.line,
  },
  rowIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: RES.tint, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: RES.ink },
  rowSub: { fontFamily: fonts.body, fontSize: 12, color: RES.muted, marginTop: 2 },
  rowRight: { alignItems: 'flex-end', maxWidth: 90 },
  rowRightValue: { fontFamily: fonts.displayBold, fontSize: 15, color: RES.navy },
  rowRightLabel: { fontFamily: fonts.body, fontSize: 10, color: RES.muted },

  remainingToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    backgroundColor: RES.tint,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  remainingToggleText: { fontFamily: fonts.bodySemiBold, fontSize: 13.5, color: RES.navy },
  chapterBox: { backgroundColor: '#fff', borderRadius: 16, padding: 12, marginTop: 8, borderWidth: 1, borderColor: RES.line, gap: 3 },
  chapterName: { fontFamily: fonts.bodyBold, fontSize: 13, color: RES.ink },
  chapterLesson: { fontFamily: fonts.body, fontSize: 12.5, color: RES.muted, lineHeight: 18 },
})
