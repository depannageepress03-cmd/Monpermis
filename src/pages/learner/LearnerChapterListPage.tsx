import { useCallback, useEffect, useState } from 'react'
import { BookOpen, ClipboardList, HelpCircle, Layers, Lock } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ContentError,
  fetchConduiteChapters,
  fetchConduiteProgressFull,
  fetchRevisionChapters,
  fetchRevisionProgressFull,
  type LearnerChapter,
} from '../../api/content'
import { useAuth } from '../../hooks/useAuth'
import { PageNavbar } from '../../components/PageNavbar'
import {
  isChapterQuestionsUnlocked,
  isChapterQuizUnlocked,
  isChapterTestSubjectUnlocked,
  isChapterUnlocked,
} from '../../utils/unlock'
import '../../styles/auth.css'
import '../../styles/learner.css'

type Track = 'revision' | 'conduite'

export function LearnerChapterListPage({
  track,
  title,
  kicker,
  backTo,
  backLabel,
  navTitle,
  coursesPath,
  questionsPath,
  testSubjectPath,
}: {
  track: Track
  title: string
  kicker: string
  backTo: string
  backLabel: string
  navTitle?: string
  coursesPath: (chapterId: string) => string
  questionsPath?: (chapterId: string) => string
  testSubjectPath?: (chapterId: string) => string
}) {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [chapters, setChapters] = useState<LearnerChapter[]>([])
  const [completedCourseIdsByChapter, setCompletedCourseIdsByChapter] = useState<
    Record<string, Set<string>>
  >({})
  const [completedTestIds, setCompletedTestIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [data, progress] = await Promise.all([
        track === 'revision' ? fetchRevisionChapters() : fetchConduiteChapters(),
        track === 'revision' ? fetchRevisionProgressFull() : fetchConduiteProgressFull(),
      ])
      setChapters(data)

      const byChapter: Record<string, Set<string>> = {}
      for (const entry of progress.completedCourses) {
        if (!byChapter[entry.chapterId]) byChapter[entry.chapterId] = new Set()
        byChapter[entry.chapterId].add(entry.courseId)
      }
      setCompletedCourseIdsByChapter(byChapter)
      setCompletedTestIds(new Set(progress.completedTests.map((entry) => entry.chapterId)))
    } catch (err) {
      setError(err instanceof ContentError ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [track])

  useEffect(() => {
    if (user) void load()
  }, [user, load])

  if (authLoading || !user) return null

  const showSectionIcons = track === 'revision' && questionsPath && testSubjectPath

  return (
    <div className="auth-page">
      <div className="auth-container learner-container">
        <PageNavbar
          title={navTitle || title}
          icon={track === 'conduite' ? <BookOpen size={22} /> : <Layers size={22} />}
          onBack={() => navigate(backTo)}
          tone={track === 'conduite' ? 'drive' : 'default'}
          backLabel={backLabel}
        />

        <header className="auth-header learner-header">
          <p className="learner-kicker">{kicker}</p>
          <p>
            {showSectionIcons
              ? 'Suivez chaque chapitre dans l’ordre : cours, questions, puis sujet test pour progresser sereinement.'
              : 'Parcourez les leçons dans l’ordre pour avancer dans votre formation. Chaque chapitre regroupe les cours pratiques publiés par l’auto-école.'}
          </p>
        </header>

        <div className="auth-card learner-card">
          {loading ? <p className="subtitle">Chargement…</p> : null}
          {error ? (
            <div className="learner-empty">
              <p className="form-error">{error}</p>
              <button type="button" className="btn-primary" onClick={() => void load()}>
                Réessayer
              </button>
            </div>
          ) : null}
          {!loading && !error && chapters.length === 0 ? (
            <div className="learner-empty">
              <h2>Aucun chapitre publié</h2>
              <p className="subtitle">Les chapitres publiés par l’administration apparaîtront ici.</p>
            </div>
          ) : null}
          {!loading && !error ? (
            <div className="learner-list">
              {chapters.map((chapter, index) => {
                const numberedName = `${index + 1}. ${chapter.name}`
                const chapterUnlocked =
                  track === 'revision'
                    ? isChapterUnlocked(index, chapters[index - 1]?.id, completedTestIds)
                    : index === 0 ||
                      isChapterQuizUnlocked(
                        chapters[index - 1]?.courses.map((c) => c.id) ?? [],
                        completedCourseIdsByChapter[chapters[index - 1]?.id ?? ''] ?? new Set(),
                      )
                const courseIds = chapter.courses.map((course) => course.id)
                const completedForChapter =
                  completedCourseIdsByChapter[chapter.id] ?? new Set()
                const quizUnlocked = isChapterQuizUnlocked(courseIds, completedForChapter)
                const questionsUnlocked = isChapterQuestionsUnlocked(chapterUnlocked)
                const testSubjectUnlocked = isChapterTestSubjectUnlocked(
                  chapterUnlocked,
                  courseIds,
                  completedForChapter,
                )
                const testDone = completedTestIds.has(chapter.id)

                if (showSectionIcons) {
                  return (
                    <div
                      key={chapter.id}
                      className={`learner-chapter-card${!chapterUnlocked ? ' is-locked' : ''}`}
                    >
                      <div className="learner-chapter-card-top">
                        <span className="learner-item-icon">
                          {chapterUnlocked ? index + 1 : <Lock size={14} />}
                        </span>
                        <span className="learner-item-body">
                          <strong>{numberedName}</strong>
                          <small>
                            {!chapterUnlocked
                              ? 'Validez le sujet test du chapitre précédent'
                              : testDone
                                ? `${chapter.courses.length} cours · Chapitre validé`
                                : quizUnlocked
                                  ? `${chapter.courses.length} cours · Sujet test débloqué`
                                  : `${chapter.courses.length} cours · Questions ouvertes · Terminez les cours pour le sujet test`}
                          </small>
                        </span>
                      </div>
                      <div className="learner-chapter-actions">
                        {chapterUnlocked ? (
                          <Link
                            to={coursesPath(chapter.id)}
                            state={{ chapter: { ...chapter, name: numberedName } }}
                            className="learner-chapter-action"
                          >
                            <span className="learner-chapter-action-icon is-courses">
                              <BookOpen size={15} />
                            </span>
                            <span>Cours</span>
                          </Link>
                        ) : (
                          <span className="learner-chapter-action is-disabled">
                            <span className="learner-chapter-action-icon">
                              <Lock size={13} />
                            </span>
                            <span>Cours</span>
                          </span>
                        )}
                        {questionsUnlocked ? (
                          <Link
                            to={questionsPath!(chapter.id)}
                            state={{ chapterName: numberedName }}
                            className="learner-chapter-action"
                          >
                            <span className="learner-chapter-action-icon is-questions">
                              <HelpCircle size={15} />
                            </span>
                            <span>Questions</span>
                          </Link>
                        ) : (
                          <span className="learner-chapter-action is-disabled">
                            <span className="learner-chapter-action-icon">
                              <Lock size={13} />
                            </span>
                            <span>Questions</span>
                          </span>
                        )}
                      </div>
                      <div className="learner-chapter-test-row">
                        {testSubjectUnlocked ? (
                          <Link
                            to={testSubjectPath!(chapter.id)}
                            state={{ chapterName: numberedName }}
                            className="learner-chapter-action learner-chapter-action--test"
                          >
                            <span className="learner-chapter-action-icon is-test">
                              <ClipboardList size={15} />
                            </span>
                            <span>Sujet test</span>
                          </Link>
                        ) : (
                          <span className="learner-chapter-action learner-chapter-action--test is-disabled">
                            <span className="learner-chapter-action-icon">
                              <Lock size={13} />
                            </span>
                            <span>Sujet test</span>
                          </span>
                        )}
                      </div>
                    </div>
                  )
                }

                if (!chapterUnlocked) {
                  return (
                    <div key={chapter.id} className="learner-item is-disabled">
                      <span className="learner-item-icon is-locked">
                        <Lock size={20} />
                      </span>
                      <span className="learner-item-body">
                        <strong>{numberedName}</strong>
                        <small>Terminez le chapitre précédent pour débloquer</small>
                      </span>
                    </div>
                  )
                }

                return (
                  <Link
                    key={chapter.id}
                    to={coursesPath(chapter.id)}
                    state={{ chapter: { ...chapter, name: numberedName } }}
                    className="learner-item"
                  >
                    <span className="learner-item-icon">{index + 1}</span>
                    <span className="learner-item-body">
                      <strong>{numberedName}</strong>
                      <small>{chapter.courses.length} cours</small>
                    </span>
                  </Link>
                )
              })}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
