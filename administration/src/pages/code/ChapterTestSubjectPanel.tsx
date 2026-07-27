import { useCallback, useEffect, useState } from 'react'
import { ClipboardList, Shuffle } from 'lucide-react'
import { fetchCurrentTestSubject } from '../../api/questions'
import { getAdminToken, isAuthError } from '../../context/AdminAuthContext'
import type { TestSubjectSummary } from '../../types/questions'

export function ChapterTestSubjectPanel({ chapterId }: { chapterId: string }) {
  const [bankCount, setBankCount] = useState(0)
  const [publishedCount, setPublishedCount] = useState(0)
  const [requiredCount, setRequiredCount] = useState(20)
  const [subjects, setSubjects] = useState<TestSubjectSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const token = getAdminToken()
    if (!token) {
      setError('Session expirée. Reconnectez-vous.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await fetchCurrentTestSubject(token, chapterId)
      setBankCount(data.bankCount)
      setPublishedCount(
        typeof data.publishedCount === 'number' ? data.publishedCount : data.bankCount,
      )
      setRequiredCount(data.requiredCount)
      setSubjects(Array.isArray(data.subjects) ? data.subjects : [])
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [chapterId])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="revision-questions-panel">
      <div className="revision-test-subject-meta">
        <div>
          <p className="revision-test-subject-kicker">Évaluation du chapitre</p>
          <p className="revision-test-subject-summary">
            Banque : {bankCount} · Publiées : {publishedCount} · Sujets : {subjects.length} ·{' '}
            {requiredCount} Q / sujet
          </p>
        </div>
      </div>

      {loading ? (
        <p className="revision-empty">Chargement…</p>
      ) : subjects.length === 0 ? (
        <p className="revision-empty">
          Publiez des questions pour créer automatiquement Sujet 1, Sujet 2, etc. (1 sujet dès la
          1ʳᵉ question publiée ; à partir de {requiredCount} publiées, un sujet tous les 5
          questions).
        </p>
      ) : (
        <>
          <div className="revision-course">
            <div className="revision-course-header">
              <div className="revision-course-toggle" style={{ cursor: 'default' }}>
                <Shuffle size={18} />
                <span>Sujets générés automatiquement</span>
                <span className="revision-count">{subjects.length}</span>
              </div>
              <ClipboardList size={18} aria-hidden />
            </div>
            <div className="revision-course-body">
              <p>
                L’apprenant choisit un sujet dans l’app. Chaque sujet contient jusqu’à{' '}
                <strong>{requiredCount}</strong> questions distinctes. Plus vous publiez de
                questions, plus le nombre de sujets augmente.
              </p>
            </div>
          </div>

          <div className="revision-courses-stack">
            {subjects.map((subject) => (
              <div key={subject.id || subject.number} className="revision-course">
                <div className="revision-course-header">
                  <div className="revision-course-toggle" style={{ cursor: 'default' }}>
                    <ClipboardList size={18} />
                    <span>{subject.label}</span>
                    <span className="revision-count">
                      {subject.questionCount} question
                      {subject.questionCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {error ? <p className="form-error">{error}</p> : null}
    </div>
  )
}
