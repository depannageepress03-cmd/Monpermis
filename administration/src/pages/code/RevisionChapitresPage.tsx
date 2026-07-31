import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChapterTestSubjectPanel } from './ChapterTestSubjectPanel'
import {
  BookOpen,
  ClipboardList,
  HelpCircle,
} from 'lucide-react'
import {
  fetchChapters,
  updateChapter,
} from '../../api/revision'
import { AdminSectionHeader } from '../../components/AdminSectionHeader'
import { CmsWorkspace, EmptyState, SkeletonBlock } from '../../ui'
import { PublishSwitch } from '../../components/PublishSwitch'
import { getAdminToken, isAuthError } from '../../context/AdminAuthContext'
import type { Chapter } from '../../types/revision'

type ChapterWorkspaceTab = 'sujet-test'

interface ChapterPanelProps {
  chapter: Chapter
  onUpdated: () => void
  activeTab: ChapterWorkspaceTab
  onTabChange: (tab: ChapterWorkspaceTab) => void
}

function ChapterPanel({
  chapter,
  onUpdated,
  activeTab,
  onTabChange,
}: ChapterPanelProps) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePublishToggle = async (published: boolean) => {
    const token = getAdminToken()
    if (!token) return

    setBusy(true)
    setError(null)
    try {
      await updateChapter(token, chapter.id, { published })
      onUpdated()
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Publication impossible')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="revision-chapter selected revision-chapter-workspace">
      <div className="revision-chapter-header">
        <div className="revision-chapter-heading">
          <p className="revision-chapter-kicker">Chapitre sélectionné</p>
          <div className="revision-chapter-title">
            {chapter.name}
            {!chapter.published ? <span className="revision-tag">Brouillon</span> : null}
          </div>
        </div>
        <div className="revision-item-actions">
          <PublishSwitch checked={chapter.published} onChange={handlePublishToggle} disabled={busy} />
        </div>
      </div>
      {error ? <p className="form-error">{error}</p> : null}

      <div className="revision-chapter-body">
        <div className="revision-chapter-tabs" role="tablist" aria-label="Contenu du chapitre">
          <button
            type="button"
            role="tab"
            aria-selected={false}
            className="revision-chapter-tab"
            onClick={() => navigate(`/code/revision-chapitres/${chapter.id}/questions`)}
          >
            <HelpCircle size={15} />
            Questions
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'sujet-test'}
            className={`revision-chapter-tab${activeTab === 'sujet-test' ? ' active' : ''}`}
            onClick={() => onTabChange('sujet-test')}
          >
            <ClipboardList size={15} />
            Sujet Test
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={false}
            className="revision-chapter-tab"
            onClick={() => navigate('/code/cours')}
          >
            <BookOpen size={15} />
            Cours (page dédiée)
          </button>
        </div>

        <ChapterTestSubjectPanel chapterId={chapter.id} />
      </div>
    </div>
  )
}

function ChapterRailItem({
  chapter,
  active,
  onSelect,
}: {
  chapter: Chapter
  active: boolean
  onSelect: () => void
}) {
  return (
    <div className={`revision-rail-item${active ? ' active' : ''}`}>
      <button type="button" className="revision-rail-button" onClick={onSelect}>
        <span className="revision-rail-name">{chapter.name}</span>
        <span className="revision-rail-meta">
          {!chapter.published ? 'Brouillon' : 'Publié'}
        </span>
      </button>
    </div>
  )
}

export function RevisionChapitresPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ChapterWorkspaceTab>('sujet-test')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadChapters = useCallback(async (preferSelectedId?: string | null, silent = false) => {
    const token = getAdminToken()
    if (!token) return

    if (!silent) setLoading(true)
    setError(null)
    try {
      const { chapters: data } = await fetchChapters(token)
      setChapters(data)
      setSelectedChapterId((current) => {
        const preferred = preferSelectedId ?? current
        if (preferred && data.some((chapter) => chapter.id === preferred)) return preferred
        return data[0]?.id ?? null
      })
    } catch (err) {
      setError(isAuthError(err) ? err.message : 'Chargement impossible')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadChapters()
  }, [loadChapters])

  useEffect(() => {
    const chapterFromUrl = searchParams.get('chapter')
    const tabFromUrl = searchParams.get('tab')
    if (tabFromUrl === 'questions' && chapterFromUrl) {
      navigate(`/code/revision-chapitres/${chapterFromUrl}/questions`, { replace: true })
      return
    }
    if (chapterFromUrl) {
      setSelectedChapterId(chapterFromUrl)
    }
    if (tabFromUrl === 'sujet-test') {
      setActiveTab('sujet-test')
    }
    if (tabFromUrl === 'cours') {
      navigate('/code/cours', { replace: true })
    }
  }, [searchParams, navigate])

  const refresh = useCallback(
    (preferSelectedId?: string | null) => loadChapters(preferSelectedId, true),
    [loadChapters],
  )

  const selectedChapter = chapters.find((chapter) => chapter.id === selectedChapterId) ?? null

  const handleSelectChapter = (chapterId: string) => {
    setSelectedChapterId(chapterId)
    setActiveTab('sujet-test')
    setSearchParams({}, { replace: true })
  }

  const handleTabChange = (tab: ChapterWorkspaceTab) => {
    setActiveTab(tab)
    if (selectedChapterId) {
      setSearchParams({ chapter: selectedChapterId, tab }, { replace: true })
    }
  }

  return (
    <div className="revision-shell">
      <header className="revision-page-header">
        <AdminSectionHeader
          backTo="/code"
          backLabel="Code de la route"
          kicker="Formation"
          title="Révision par chapitres"
          subtitle="20 chapitres standards : questions et sujets test. Les cours se gèrent dans la page Cours."
        />
      </header>

      {loading ? (
        <div style={{ padding: 8 }}>
          <SkeletonBlock rows={5} />
        </div>
      ) : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}

      {!loading && chapters.length === 0 ? (
        <EmptyState
          title="Chapitres en cours de synchronisation"
          description="Les 20 chapitres standards seront créés automatiquement au prochain chargement."
        />
      ) : null}

      {!loading && chapters.length > 0 ? (
        <CmsWorkspace
          tree={
            <>
              <div className="revision-rail-header">
                <h3>Chapitres</h3>
                <span>{chapters.length}</span>
              </div>
              <div className="revision-rail-list">
                {chapters.map((chapter) => (
                  <ChapterRailItem
                    key={chapter.id}
                    chapter={chapter}
                    active={chapter.id === selectedChapterId}
                    onSelect={() => handleSelectChapter(chapter.id)}
                  />
                ))}
              </div>
            </>
          }
          editor={
            selectedChapter ? (
              <ChapterPanel
                key={selectedChapter.id}
                chapter={selectedChapter}
                onUpdated={() => refresh(selectedChapterId)}
                activeTab={activeTab}
                onTabChange={handleTabChange}
              />
            ) : (
              <EmptyState
                title="Aucun chapitre sélectionné"
                description="Sélectionnez un chapitre pour gérer les questions et le sujet test."
              />
            )
          }
        />
      ) : null}
    </div>
  )
}
