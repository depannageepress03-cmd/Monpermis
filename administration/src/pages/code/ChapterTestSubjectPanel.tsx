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

  const fill = requiredCount > 0 ? Math.min(100, Math.round((publishedCount / requiredCount) * 100)) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div className="cx-panel-head cx-ph cx-ph-plain" style={{ marginBottom: 0 }}>
        <span className="cx-phi cx-phi-tile">
          <Shuffle aria-hidden />
        </span>
        <div className="cx-ph-txt">
          <h2 className="cx-panel-title">Évaluation du chapitre</h2>
          <p className="cx-muted">Sujets générés automatiquement à partir des questions publiées</p>
        </div>
      </div>

      {loading ? (
        <p className="cx-empty">Chargement…</p>
      ) : (
        <>
          <div className="cx-kc-grid cx-kc-grid-3">
            <div className="cx-kc">
              <span className="cx-kc-ico cx-kc-sky">
                <ClipboardList aria-hidden />
              </span>
              <div className="cx-kc-body">
                <span className="cx-kc-label">En banque</span>
                <span className="cx-kc-value">{bankCount}</span>
                <span className="cx-kc-sub">questions au total</span>
              </div>
            </div>
            <div className="cx-kc">
              <span className="cx-kc-ico cx-kc-green">
                <ClipboardList aria-hidden />
              </span>
              <div className="cx-kc-body">
                <span className="cx-kc-label">Publiées</span>
                <span className="cx-kc-value">
                  {publishedCount} <small>/ {requiredCount}</small>
                </span>
                <span className="cx-kc-bar">
                  <i style={{ width: `${fill}%` }} />
                </span>
              </div>
            </div>
            <div className="cx-kc">
              <span className="cx-kc-ico cx-kc-gold">
                <Shuffle aria-hidden />
              </span>
              <div className="cx-kc-body">
                <span className="cx-kc-label">Sujets</span>
                <span className="cx-kc-value">{subjects.length}</span>
                <span className="cx-kc-sub">{requiredCount} questions par sujet</span>
              </div>
            </div>
          </div>

          {subjects.length === 0 ? (
            <p className="cx-note cx-note-info">
              Publiez des questions pour créer automatiquement Sujet 1, Sujet 2, etc. (1 sujet dès la
              1ʳᵉ question publiée ; à partir de {requiredCount} publiées, un sujet tous les 5
              questions).
            </p>
          ) : (
            <>
              <p className="cx-panel-note">
                L’apprenant choisit un sujet dans l’app. Chaque sujet contient jusqu’à{' '}
                <strong>{requiredCount}</strong> questions distinctes : plus vous publiez de questions,
                plus le nombre de sujets augmente.
              </p>
              <div className="cx-subjects">
                {subjects.map((subject) => (
                  <div key={subject.id || subject.number} className="cx-subject">
                    <b>{subject.label}</b>
                    <span>
                      {subject.questionCount} question{subject.questionCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {error ? <p className="cx-note cx-note-err">{error}</p> : null}
    </div>
  )
}
