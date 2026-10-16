import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { BookOpen, HelpCircle, RefreshCw, Search } from 'lucide-react'
import { fetchChapters, updateChapter } from '../../api/revision'
import { CodeSection } from '../../components/model/CodeSection'
import { PublishSwitch } from '../../components/PublishSwitch'
import { getAdminToken, isAuthError } from '../../context/AdminAuthContext'
import { EmptyState, SkeletonBlock } from '../../ui'
import type { Chapter } from '../../types/revision'
import { ChapterTestSubjectPanel } from './ChapterTestSubjectPanel'

/** Chapitres de l'apprenant (1 à 20) : le chapitre tampon « À classer » n'a ni questions ni sujets. */
const isLearnerChapter = (chapter: Chapter) => chapter.order >= 1

export function RevisionChapitresPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadChapters = useCallback(async (preferId?: string | null, silent = false) => {
    const token = getAdminToken()
    if (!token) return
    if (!silent) setLoading(true)
    setError(null)
    try {
      const { chapters: data } = await fetchChapters(token)
      const learner = data.filter(isLearnerChapter)
      setChapters(learner)
      setSelectedChapterId((current) => {
        const preferred = preferId ?? current
        if (preferred && learner.some((chapter) => chapter.id === preferred)) return preferred
        return learner[0]?.id ?? null
      })
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadChapters()
  }, [loadChapters])

  // Liens profonds : ?chapter=<id> sélectionne ; ?tab=questions / ?tab=cours redirigent.
  useEffect(() => {
    const chapterFromUrl = searchParams.get('chapter')
    const tabFromUrl = searchParams.get('tab')
    if (tabFromUrl === 'questions' && chapterFromUrl) {
      navigate(`/code/revision-chapitres/${chapterFromUrl}/questions`, { replace: true })
      return
    }
    if (tabFromUrl === 'cours') {
      navigate(chapterFromUrl ? `/code/cours?chapter=${chapterFromUrl}` : '/code/cours', { replace: true })
      return
    }
    if (chapterFromUrl) setSelectedChapterId(chapterFromUrl)
  }, [searchParams, navigate])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return chapters
    return chapters.filter((chapter) => `${chapter.order} ${chapter.name}`.toLowerCase().includes(needle))
  }, [chapters, query])

  const selected = chapters.find((chapter) => chapter.id === selectedChapterId) ?? null
  const publishedCount = chapters.filter((chapter) => chapter.published).length

  const select = (id: string) => {
    setSelectedChapterId(id)
    setSearchParams({}, { replace: true })
  }

  const togglePublish = async (published: boolean) => {
    const token = getAdminToken()
    if (!token || !selected) return
    setBusy(true)
    setError(null)
    try {
      await updateChapter(token, selected.id, { published })
      await loadChapters(selected.id, true)
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Publication impossible')
    } finally {
      setBusy(false)
    }
  }

  return (
    <CodeSection
      title="Révision par chapitres"
      subtitle={`${chapters.length} chapitres standards · ${publishedCount} publié${publishedCount > 1 ? 's' : ''}. Questions et sujets test de chaque chapitre.`}
      actions={
        <button type="button" className="cx-refresh" onClick={() => void loadChapters(null, true)}>
          <RefreshCw aria-hidden />
          Actualiser
        </button>
      }
    >
      {error ? <p className="cx-note cx-note-err" role="alert">{error}</p> : null}
      {loading ? <SkeletonBlock rows={5} /> : null}

      {!loading && chapters.length === 0 ? (
        <EmptyState
          title="Chapitres en cours de synchronisation"
          description="Les 20 chapitres standards seront créés automatiquement au prochain chargement."
        />
      ) : null}

      {!loading && chapters.length > 0 ? (
        <div className="cx-split">
          <aside className="cx-panel cx-sticky" aria-label="Liste des chapitres">
            <div className="cx-panel-head cx-ph cx-ph-plain">
              <div className="cx-ph-txt">
                <h2 className="cx-panel-title">Chapitres</h2>
                <p className="cx-muted">{filtered.length} affiché{filtered.length > 1 ? 's' : ''}</p>
              </div>
            </div>
            <label className="cx-search" style={{ margin: '0 0 .8rem' }}>
              <Search aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un chapitre…"
                aria-label="Rechercher un chapitre"
              />
            </label>
            <div className="cx-chap-list">
              {filtered.map((chapter) => (
                <button
                  key={chapter.id}
                  type="button"
                  className={`cx-chap${chapter.id === selectedChapterId ? ' cx-sel' : ''}`}
                  onClick={() => select(chapter.id)}
                  aria-current={chapter.id === selectedChapterId ? 'true' : undefined}
                >
                  <span className="cx-chap-num">{chapter.order}</span>
                  <span>
                    <span className="cx-chap-name">{chapter.name}</span>
                    <span className="cx-chap-meta">{chapter.published ? 'Publié' : 'Brouillon'}</span>
                  </span>
                  <span className={`cx-chap-dot${chapter.published ? ' cx-pub' : ''}`} aria-hidden />
                </button>
              ))}
              {filtered.length === 0 ? <p className="cx-empty">Aucun chapitre ne correspond.</p> : null}
            </div>
          </aside>

          {selected ? (
            <section className="cx-panel" key={selected.id}>
              <div className="cx-detail-head">
                <span className="cx-chap-num">{selected.order}</span>
                <div className="cx-detail-title">
                  <small>Chapitre sélectionné</small>
                  <h2>{selected.name}</h2>
                </div>
                <div className="cx-pub">
                  <span className={`cx-chip ${selected.published ? 'cx-green' : 'cx-amber'}`}>
                    {selected.published ? 'Publié' : 'Brouillon'}
                  </span>
                  <PublishSwitch checked={selected.published} onChange={togglePublish} disabled={busy} />
                </div>
              </div>

              <div className="cx-link-cards" style={{ margin: '1.1rem 0' }}>
                <Link to={`/code/revision-chapitres/${selected.id}/questions`} className="cx-link-card">
                  <span className="cx-lc-ico">
                    <HelpCircle aria-hidden />
                  </span>
                  <span>
                    <b>Banque de questions</b>
                    <span className="cx-sub">Consulter les questions, audios et réponses</span>
                  </span>
                </Link>
                <Link to={`/code/cours?chapter=${selected.id}`} className="cx-link-card">
                  <span className="cx-lc-ico">
                    <BookOpen aria-hidden />
                  </span>
                  <span>
                    <b>Notions du chapitre</b>
                    <span className="cx-sub">Gérer les cours rattachés à ce chapitre</span>
                  </span>
                </Link>
              </div>

              <ChapterTestSubjectPanel chapterId={selected.id} />
            </section>
          ) : (
            <EmptyState
              title="Aucun chapitre sélectionné"
              description="Sélectionnez un chapitre pour gérer les questions et le sujet test."
            />
          )}
        </div>
      ) : null}
    </CodeSection>
  )
}
