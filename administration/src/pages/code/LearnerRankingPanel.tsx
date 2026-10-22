import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Search } from 'lucide-react'
import {
  downloadLearnerReportPdf,
  fetchRanking,
  type RankingEntry,
} from '../../api/learnerReport'
import { getAdminToken, isAuthError } from '../../context/AdminAuthContext'
import { EmptyState, SkeletonBlock } from '../../ui'
import { COURSE_STATUS_TONE, fmtNote } from './LearnerReportPanels'

/** Classement par moyenne générale (coefficients appliqués) — compare tous les apprenants. */
export function LearnerRankingPanel() {
  const navigate = useNavigate()
  const [entries, setEntries] = useState<RankingEntry[]>([])
  const [passScore, setPassScore] = useState(14)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [onlyUnfinishedSubjects, setOnlyUnfinishedSubjects] = useState(false)
  const [onlyUnfinishedCourse, setOnlyUnfinishedCourse] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

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
      const data = await fetchRanking(token)
      setEntries(data.entries)
      setPassScore(data.passScore)
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Classement indisponible')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return entries.filter((e) => {
      if (needle && !`${e.firstName} ${e.lastName} ${e.email} ${e.phone}`.toLowerCase().includes(needle)) return false
      if (onlyUnfinishedSubjects && e.unfinishedCount === 0) return false
      if (onlyUnfinishedCourse && (e.course.status === 'completed' || e.course.status === 'validated')) return false
      return true
    })
  }, [entries, query, onlyUnfinishedSubjects, onlyUnfinishedCourse])

  const download = async (userId: string) => {
    const token = getAdminToken()
    if (!token) return
    setBusyId(userId)
    setError(null)
    try {
      await downloadLearnerReportPdf(token, userId)
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Téléchargement impossible')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="cx-panel">
      <div className="cx-toolbar" style={{ marginBottom: '.8rem' }}>
        <label className="cx-search">
          <Search aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher par nom, e-mail ou téléphone…"
            aria-label="Rechercher un apprenant"
          />
        </label>
        <span className="cx-chip">
          {filtered.length} / {entries.length} apprenant{entries.length > 1 ? 's' : ''}
        </span>
      </div>

      <div className="cx-xr-filter">
        <label className="cx-chip" style={{ cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={onlyUnfinishedSubjects}
            onChange={(e) => setOnlyUnfinishedSubjects(e.target.checked)}
          />{' '}
          Sujets non terminés
        </label>
        <label className="cx-chip" style={{ cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={onlyUnfinishedCourse}
            onChange={(e) => setOnlyUnfinishedCourse(e.target.checked)}
          />{' '}
          Cours non terminé
        </label>
      </div>

      <p className="cx-panel-note">
        Classement par moyenne générale des examens blancs (meilleure tentative de chaque sujet, coefficients appliqués).
        Les sujets non évalués ne comptent pas comme zéro ; un apprenant sans sujet évalué n’a pas de rang. Seuil de réussite : {passScore}/20.
      </p>

      {error ? <p className="cx-note cx-note-err" role="alert">{error}</p> : null}
      {loading ? <SkeletonBlock rows={6} /> : null}

      {!loading && !error ? (
        filtered.length === 0 ? (
          <EmptyState title="Aucun apprenant" description="Aucun apprenant ne correspond à ces critères." />
        ) : (
          <div className="cx-table-wrap">
            <table className="cx-data">
              <thead>
                <tr>
                  <th>Rang</th>
                  <th>Apprenant</th>
                  <th>Moyenne /20</th>
                  <th>Sujets évalués</th>
                  <th>Terminés</th>
                  <th>Non terminés</th>
                  <th>Meilleure / faible</th>
                  <th>Cours</th>
                  <th>Fiche</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr
                    key={e.userId}
                    className="cx-click"
                    tabIndex={0}
                    title="Ouvrir la fiche de l’élève"
                    onClick={() => navigate(`/code/suivi-apprenants/${e.userId}`)}
                    onKeyDown={(ev) => {
                      if (ev.key === 'Enter') navigate(`/code/suivi-apprenants/${e.userId}`)
                    }}
                  >
                    <td>
                      <strong>{e.rank ?? '—'}</strong>
                    </td>
                    <td>
                      <strong>
                        {e.firstName} {e.lastName}
                      </strong>
                      <div className="cx-dim">{e.email || e.phone}</div>
                    </td>
                    <td>
                      {e.average === null ? (
                        <span className="cx-dim">—</span>
                      ) : (
                        <span className={`cx-chip ${e.average >= passScore ? 'cx-green' : 'cx-red'}`}>{fmtNote(e.average)}</span>
                      )}
                    </td>
                    <td>{e.evaluatedCount}</td>
                    <td>{e.completedCount}</td>
                    <td>{e.unfinishedCount > 0 ? <span className="cx-warn-n">{e.unfinishedCount}</span> : 0}</td>
                    <td>
                      {fmtNote(e.bestNote)} / {fmtNote(e.lowestNote)}
                    </td>
                    <td>
                      <span className={`cx-chip ${COURSE_STATUS_TONE[e.course.status]}`.trim()}>{e.course.statusLabel}</span>
                      <div className="cx-dim">
                        {e.course.completed}/{e.course.total}
                        {e.course.percent === null ? '' : ` · ${e.course.percent} %`}
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="cx-btn cx-btn-sm"
                        disabled={busyId === e.userId}
                        onClick={(ev) => {
                          ev.stopPropagation()
                          void download(e.userId)
                        }}
                      >
                        <Download aria-hidden /> {busyId === e.userId ? '…' : 'PDF'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : null}
    </section>
  )
}
