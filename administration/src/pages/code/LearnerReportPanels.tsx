import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Check, ClipboardCheck, Download, GraduationCap, UserRound } from 'lucide-react'
import {
  downloadLearnerReportPdf,
  fetchLearnerReport,
  type CourseStatus,
  type LearnerReport,
  type ReportExamRow,
} from '../../api/learnerReport'
import { fetchExamAttemptDetail, type ExamAttemptQuestion } from '../../api/tracking'
import { QuestionReview } from '../../components/ExamQuestionReview'
import { getAdminToken, isAuthError } from '../../context/AdminAuthContext'
import { Drawer, EmptyState, SkeletonBlock } from '../../ui'

export function fmtNote(value: number | null | undefined) {
  return value === null || value === undefined ? '—' : String(value).replace('.', ',')
}

function fmtDate(value?: string | null) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtDateTime(value?: string | null) {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export const COURSE_STATUS_TONE: Record<CourseStatus, string> = {
  not_started: '',
  in_progress: 'cx-amber',
  completed: 'cx-green',
  validated: 'cx-green',
  to_verify: 'cx-red',
}

type QuestionFilter = 'all' | ExamAttemptQuestion['state']

const MISSING = 'Non renseigné'

export function LearnerReportPanels({ userId }: { userId: string }) {
  const [report, setReport] = useState<LearnerReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pdfBusy, setPdfBusy] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)

  const [selected, setSelected] = useState<ReportExamRow | null>(null)
  const [questions, setQuestions] = useState<ExamAttemptQuestion[] | null>(null)
  const [questionsLoading, setQuestionsLoading] = useState(false)
  const [questionsError, setQuestionsError] = useState<string | null>(null)
  const [filter, setFilter] = useState<QuestionFilter>('all')

  const load = useCallback(
    async (silent = false) => {
      const token = getAdminToken()
      if (!token) {
        setError('Session expirée. Reconnectez-vous.')
        setLoading(false)
        return
      }
      if (!silent) setLoading(true)
      try {
        setReport(await fetchLearnerReport(token, userId))
        setError(null)
      } catch (err) {
        if (!silent) setError(isAuthError(err) ? err.message : 'Fiche indisponible')
      } finally {
        setLoading(false)
      }
    },
    [userId],
  )

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const timer = window.setInterval(() => void load(true), 15000)
    return () => window.clearInterval(timer)
  }, [load])

  const openRow = useCallback(async (row: ReportExamRow) => {
    const token = getAdminToken()
    if (!token) return
    setSelected(row)
    setQuestions(null)
    setQuestionsError(null)
    setFilter('all')
    setQuestionsLoading(true)
    try {
      setQuestions((await fetchExamAttemptDetail(token, row.attemptId)).questions)
    } catch (err) {
      setQuestionsError(isAuthError(err) ? err.message : 'Détail indisponible')
    } finally {
      setQuestionsLoading(false)
    }
  }, [])

  const counts = useMemo(() => {
    const c = { all: 0, correct: 0, wrong: 0, skipped: 0, unanswered: 0 }
    for (const q of questions ?? []) {
      c.all += 1
      c[q.state] += 1
    }
    return c
  }, [questions])

  const visibleQuestions = useMemo(
    () => (questions ?? []).filter((q) => filter === 'all' || q.state === filter),
    [questions, filter],
  )

  const remainingByChapter = useMemo(() => {
    const map = new Map<string, { name: string; titles: string[] }>()
    for (const lesson of report?.course.remaining ?? []) {
      const key = `${lesson.chapterOrder}|${lesson.chapterId}`
      if (!map.has(key)) map.set(key, { name: lesson.chapterName, titles: [] })
      map.get(key)!.titles.push(`${lesson.title}${lesson.state === 'in_progress' ? ' (en cours)' : ''}`)
    }
    return [...map.values()]
  }, [report])

  const handleDownload = async () => {
    const token = getAdminToken()
    if (!token) return
    setPdfBusy(true)
    setPdfError(null)
    try {
      await downloadLearnerReportPdf(token, userId)
    } catch (err) {
      setPdfError(isAuthError(err) ? err.message : 'Téléchargement impossible')
    } finally {
      setPdfBusy(false)
    }
  }

  if (loading && !report) return <SkeletonBlock rows={6} />
  if (error && !report) return <p className="cx-note cx-note-err" role="alert">{error}</p>
  if (!report) return null

  const { learner, exams, course } = report
  const summary = exams.summary
  const fullName = `${learner.firstName} ${learner.lastName}`.trim()
  const allIssues = [...exams.issues, ...course.issues]

  return (
    <>
      <section className="cx-panel">
        <div className="cx-panel-head cx-ph cx-ph-plain">
          <span className="cx-phi cx-phi-tile">
            <UserRound aria-hidden />
          </span>
          <div className="cx-ph-txt">
            <h2 className="cx-panel-title">Fiche de l’élève</h2>
            <p className="cx-muted">Identité, résultats aux examens blancs et progression dans le cours</p>
          </div>
          <button type="button" className="cx-btn cx-btn-fill" onClick={() => void handleDownload()} disabled={pdfBusy}>
            <Download aria-hidden />
            {pdfBusy ? 'Génération…' : 'Télécharger la fiche PDF'}
          </button>
        </div>

        {pdfError ? <p className="cx-note cx-note-err" role="alert">{pdfError}</p> : null}

        <dl className="cx-xr-identity">
          <div>
            <dt>Nom et prénoms</dt>
            <dd className={fullName ? '' : 'cx-xr-missing'}>{fullName || MISSING}</dd>
          </div>
          <div>
            <dt>Téléphone</dt>
            <dd>{learner.phone || '—'}</dd>
          </div>
          <div>
            <dt>E-mail</dt>
            <dd>{learner.email || '—'}</dd>
          </div>
          <div>
            <dt>Date d’inscription</dt>
            <dd>{fmtDate(learner.registeredAt)}</dd>
          </div>
          <div>
            <dt>Identifiant</dt>
            <dd className="cx-xr-mono">{learner.id}</dd>
          </div>
          <div>
            <dt>Moyenne générale</dt>
            <dd>
              {summary.average === null ? (
                <span className="cx-xr-missing">Aucun sujet évalué</span>
              ) : (
                <strong className="cx-xr-avg">{fmtNote(summary.average)} / 20</strong>
              )}
            </dd>
          </div>
        </dl>

        {report.missingInfo.length > 0 ? (
          <div className="cx-note cx-note-err" role="status">
            <strong>
              <AlertTriangle className="cx-ico-inline" aria-hidden /> Informations manquantes pour la fiche PDF
            </strong>
            <ul className="cx-xr-issues">
              {report.missingInfo.map((m) => (
                <li key={`${m.field}-${m.examNumber ?? ''}`}>{m.label}</li>
              ))}
            </ul>
            <span>
              Renseignez-les dans <Link to="/code/examens-test">Examens test</Link> (ouvrir un sujet → « Enregistrer la fiche »).
              Le PDF indiquera « {MISSING} » tant qu’elles manquent.
            </span>
          </div>
        ) : null}

        {allIssues.length > 0 ? (
          <div className="cx-note cx-note-err" role="status">
            <strong>
              <AlertTriangle className="cx-ico-inline" aria-hidden /> Incohérences détectées
            </strong>
            <ul className="cx-xr-issues">
              {allIssues.map((issue, i) => (
                <li key={`${issue.code}-${i}`}>{issue.message}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="cx-panel">
        <div className="cx-panel-head cx-ph cx-ph-plain">
          <span className="cx-phi cx-phi-tile">
            <ClipboardCheck aria-hidden />
          </span>
          <div className="cx-ph-txt">
            <h2 className="cx-panel-title">Résultats aux examens blancs</h2>
            <p className="cx-muted">
              Questions non traitées = ratées · Note /20 = correctes ÷ questions totales × 20 · seuil de réussite {exams.passScore}/20
            </p>
          </div>
        </div>

        <div className="cx-xr-summary cx-xr-summary-wide">
          <div className="cx-xr-stat">
            <span>Moyenne générale</span>
            <strong>{summary.average === null ? '—' : `${fmtNote(summary.average)}/20`}</strong>
          </div>
          <div className="cx-xr-stat">
            <span>Sujets évalués</span>
            <strong>{summary.evaluatedCount}</strong>
          </div>
          <div className="cx-xr-stat">
            <span>Terminés / non terminés</span>
            <strong>
              {summary.completedCount} / {summary.unfinishedCount}
            </strong>
          </div>
          <div className="cx-xr-stat">
            <span>Meilleure / plus faible</span>
            <strong>
              {fmtNote(summary.bestNote)} / {fmtNote(summary.lowestNote)}
            </strong>
          </div>
          <div className="cx-xr-stat">
            <span>Questions au total</span>
            <strong>{summary.totalQuestions}</strong>
          </div>
          <div className="cx-xr-stat">
            <span>Correctes</span>
            <strong>{summary.totalCorrect}</strong>
          </div>
          <div className="cx-xr-stat">
            <span>Incorrectes</span>
            <strong>{summary.totalIncorrect}</strong>
          </div>
          <div className="cx-xr-stat">
            <span>Non traitées</span>
            <strong>{summary.totalUnanswered}</strong>
          </div>
        </div>

        {exams.rows.length === 0 ? (
          <EmptyState title="Aucun sujet composé" description="Cet apprenant n’a pas encore commencé d’examen blanc." />
        ) : (
          <div className="cx-table-wrap">
            <table className="cx-data">
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Sujet</th>
                  <th>Auteur</th>
                  <th>Questions</th>
                  <th>Traitées</th>
                  <th>Correctes</th>
                  <th>Incorrectes</th>
                  <th>Non traitées</th>
                  <th>Statut</th>
                  <th>Note /20</th>
                  <th>Coef.</th>
                </tr>
              </thead>
              <tbody>
                {exams.rows.map((row, index) => (
                  <tr
                    key={row.attemptId}
                    className={`cx-click${row.counted ? '' : ' cx-muted-row'}`}
                    tabIndex={0}
                    title="Voir chaque question et la réponse choisie"
                    onClick={() => void openRow(row)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        void openRow(row)
                      }
                    }}
                  >
                    <td>{index + 1}</td>
                    <td>
                      <strong>{row.subject}</strong>
                      <div className={`cx-dim${row.sceneName ? '' : ' cx-xr-missing'}`}>
                        Scène : {row.sceneName || MISSING}
                      </div>
                      <div className="cx-dim">{fmtDateTime(row.composedAt)}</div>
                      {!row.counted ? <span className="cx-chip">Hors moyenne (une meilleure tentative existe)</span> : null}
                    </td>
                    <td className={row.author ? '' : 'cx-xr-missing'}>{row.author || MISSING}</td>
                    <td>{row.total}</td>
                    <td>{row.treated}</td>
                    <td>{row.correct}</td>
                    <td>{row.incorrect}</td>
                    <td>{row.unanswered}</td>
                    <td>
                      <span className={`cx-chip ${row.completed ? 'cx-green' : 'cx-amber'}`}>{row.statusLabel}</span>
                    </td>
                    <td>
                      <strong>{fmtNote(row.note)}</strong>
                    </td>
                    <td>{fmtNote(row.coefficient)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="cx-panel">
        <div className="cx-panel-head cx-ph cx-ph-plain">
          <span className="cx-phi cx-phi-tile">
            <GraduationCap aria-hidden />
          </span>
          <div className="cx-ph-txt">
            <h2 className="cx-panel-title">Progression dans le cours du Code de la route</h2>
            <p className="cx-muted">
              {course.completed} leçon{course.completed > 1 ? 's' : ''} terminée{course.completed > 1 ? 's' : ''} sur {course.total}{' '}
              obligatoire{course.total > 1 ? 's' : ''}
              {course.percent === null ? '' : ` · ${course.percent} %`}
            </p>
          </div>
          <span className={`cx-chip ${COURSE_STATUS_TONE[course.status]}`.trim()}>{course.statusLabel}</span>
        </div>

        <div className="cx-progress" aria-hidden>
          <i style={{ width: `${course.percent ?? 0}%` }} />
        </div>

        <div className="cx-xr-summary cx-xr-summary-wide" style={{ marginTop: '1rem' }}>
          <div className="cx-xr-stat">
            <span>Leçons obligatoires</span>
            <strong>{course.total}</strong>
          </div>
          <div className="cx-xr-stat">
            <span>Suivies</span>
            <strong>{course.followed}</strong>
          </div>
          <div className="cx-xr-stat">
            <span>Terminées</span>
            <strong>{course.completed}</strong>
          </div>
          <div className="cx-xr-stat">
            <span>Validées</span>
            <strong>{course.validated}</strong>
          </div>
          <div className="cx-xr-stat">
            <span>En cours</span>
            <strong>{course.inProgress}</strong>
          </div>
          <div className="cx-xr-stat">
            <span>Non commencées</span>
            <strong>{course.notStarted}</strong>
          </div>
          <div className="cx-xr-stat">
            <span>Chapitres validés</span>
            <strong>
              {course.chaptersValidated}/{course.chaptersTotal}
            </strong>
          </div>
        </div>
        <p className="cx-panel-note">
          « Suivie » = leçon ouverte ; « terminée » = leçon menée à son terme ; « validée » = leçon terminée et sujet test de son chapitre
          validé. Les notes d’examen ne remplacent pas ce suivi.
        </p>

        <details className="cx-xr-details" open={remainingByChapter.length > 0 && remainingByChapter.length <= 3}>
          <summary>Leçons restantes ({course.remaining.length})</summary>
          {course.remaining.length === 0 ? (
            <p className="cx-panel-note">{course.total > 0 ? 'Aucune leçon restante.' : 'Aucune leçon obligatoire publiée.'}</p>
          ) : (
            remainingByChapter.map((chapter) => (
              <div key={chapter.name} className="cx-xr-chapter">
                <strong>{chapter.name}</strong>
                <ul>
                  {chapter.titles.map((title) => (
                    <li key={title}>{title}</li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </details>

        <details className="cx-xr-details">
          <summary>Leçons déjà suivies ({course.followed})</summary>
          {course.lessons.filter((l) => l.state !== 'not_started').length === 0 ? (
            <p className="cx-panel-note">Aucune leçon suivie pour le moment.</p>
          ) : (
            <ul className="cx-xr-lessons">
              {course.lessons
                .filter((l) => l.state !== 'not_started')
                .map((l) => (
                  <li key={`${l.chapterId}-${l.courseId}`}>
                    <span>
                      {l.state === 'completed' ? <Check className="cx-ico-inline" aria-hidden /> : null} {l.chapterName} — {l.title}
                    </span>
                    <small>
                      {l.state === 'completed'
                        ? `Terminée le ${fmtDate(l.completedAt)}${l.validated ? ' · validée' : ''}`
                        : `Ouverte le ${fmtDate(l.openedAt)} · en cours`}
                    </small>
                  </li>
                ))}
            </ul>
          )}
        </details>
      </section>

      <Drawer
        wide
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.subject}${fullName ? ` — ${fullName}` : ''}` : ''}
        subtitle={selected ? `Composé le ${fmtDateTime(selected.composedAt)}` : undefined}
      >
        {selected ? (
          <div>
            <div className={`cx-xr-verdict ${selected.completed ? (selected.passed ? 'cx-ok' : 'cx-ko') : 'cx-stop'}`}>
              <span>{selected.completed ? 'Examen terminé — note finale' : 'Examen non terminé — note actuelle'}</span>
              <span className="cx-xr-note">
                {fmtNote(selected.note)}/20
              </span>
              <span>
                {selected.correct} correcte{selected.correct > 1 ? 's' : ''} sur {selected.total} questions
                {selected.completed ? (selected.passed ? ' · Réussi' : ' · Raté') : ''}
              </span>
            </div>
            <div className="cx-xr-summary">
              <div className="cx-xr-stat">
                <span>Traitées</span>
                <strong>{selected.treated}</strong>
              </div>
              <div className="cx-xr-stat">
                <span>Incorrectes</span>
                <strong>{selected.incorrect}</strong>
              </div>
              <div className="cx-xr-stat">
                <span>Non traitées</span>
                <strong>{selected.unanswered}</strong>
              </div>
              <div className="cx-xr-stat">
                <span>Total ratées</span>
                <strong>{selected.failed}</strong>
              </div>
            </div>
            {selected.issues.length > 0 ? (
              <ul className="cx-note cx-note-err cx-xr-issues">
                {selected.issues.map((i) => (
                  <li key={i.code}>{i.message}</li>
                ))}
              </ul>
            ) : null}

            <h3 className="cx-xr-section">Questions et réponses</h3>
            {questionsLoading ? (
              <SkeletonBlock rows={4} />
            ) : questionsError ? (
              <p className="cx-note cx-note-err">{questionsError}</p>
            ) : questions && questions.length > 0 ? (
              <>
                <div className="cx-xr-filter" role="group" aria-label="Filtrer les questions">
                  {(
                    [
                      ['all', 'Toutes'],
                      ['wrong', 'Fausses'],
                      ['correct', 'Bonnes'],
                      ['skipped', 'Zappées'],
                      ['unanswered', 'Non répondues'],
                    ] as [QuestionFilter, string][]
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      className={`cx-btn cx-btn-sm${filter === key ? ' cx-btn-fill' : ''}`}
                      onClick={() => setFilter(key)}
                      disabled={key !== 'all' && counts[key] === 0}
                    >
                      {label} ({counts[key]})
                    </button>
                  ))}
                </div>
                <ol className="cx-xr-list">
                  {visibleQuestions.map((q) => (
                    <QuestionReview key={q.questionId} question={q} />
                  ))}
                </ol>
              </>
            ) : (
              <EmptyState title="Aucune question" description="Les questions de cet examen n’ont pas pu être chargées." />
            )}
          </div>
        ) : null}
      </Drawer>
    </>
  )
}
