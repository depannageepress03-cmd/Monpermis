import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  ClipboardCheck,
  HelpCircle,
  Layers,
  List,
  Radar,
} from 'lucide-react'
import { CodeSection } from '../../components/model/CodeSection'
import { nf } from '../../components/model/ModelCharts'
import { fetchStandaloneCourses } from '../../api/courses'
import { fetchDashboardSummary, type DashboardSummary } from '../../api/dashboard'
import { fetchAdminPracticeExams } from '../../api/practiceExams'
import { fetchChapters } from '../../api/revision'
import { getAdminToken, isAuthError } from '../../context/AdminAuthContext'

type Overview = {
  chapters: { total: number; published: number }
  notions: { total: number; published: number }
  questions: number
  exams: { done: number; total: number; stale: boolean }
  learners: { active: number; total: number }
}

const EMPTY: Overview = {
  chapters: { total: 0, published: 0 },
  notions: { total: 0, published: 0 },
  questions: 0,
  exams: { done: 0, total: 0, stale: false },
  learners: { active: 0, total: 0 },
}

export function CodeRouteHubPage() {
  const [data, setData] = useState<Overview>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = getAdminToken()
    if (!token) {
      setError('Session expirée. Reconnectez-vous.')
      setLoading(false)
      return
    }
    let cancelled = false

    // Chaque source est indépendante : l'échec de l'une n'empêche pas d'afficher les autres.
    Promise.allSettled([
      fetchChapters(token),
      fetchStandaloneCourses(token),
      fetchAdminPracticeExams(token),
      fetchDashboardSummary(token),
    ]).then(([chapters, courses, exams, summary]) => {
      if (cancelled) return
      const next: Overview = { ...EMPTY }

      if (chapters.status === 'fulfilled') {
        // Les chapitres 1 à 20 sont ceux de l'apprenant ; « À classer » reste interne.
        const real = chapters.value.chapters.filter((c) => c.order >= 1 && c.order <= 20)
        next.chapters = { total: real.length, published: real.filter((c) => c.published).length }
      }
      if (courses.status === 'fulfilled') {
        next.notions = {
          total: courses.value.courses.length,
          published: courses.value.courses.filter((c) => c.published).length,
        }
      }
      if (exams.status === 'fulfilled') {
        next.exams = {
          done: exams.value.examCount,
          total: exams.value.examTotal,
          stale: Boolean(exams.value.stale),
        }
      }
      if (summary.status === 'fulfilled') {
        const s: DashboardSummary = summary.value.summary
        next.questions = s.code.questions
        next.learners = { active: s.users.active, total: s.users.total }
      }

      const failures = [chapters, courses, exams, summary].filter((r) => r.status === 'rejected')
      if (failures.length === 4) {
        const reason = (failures[0] as PromiseRejectedResult).reason
        setError(isAuthError(reason) ? reason.message : 'Chargement impossible')
      } else if (failures.length > 0) {
        setError('Certaines données n’ont pas pu être chargées.')
      }
      setData(next)
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [])

  const todo = useMemo(() => {
    const items: { key: string; to: string; title: string; sub: string }[] = []
    const draftChapters = data.chapters.total - data.chapters.published
    if (draftChapters > 0) {
      items.push({
        key: 'chapters',
        to: '/code/revision-chapitres',
        title: `${draftChapters} chapitre${draftChapters > 1 ? 's' : ''} non publié${draftChapters > 1 ? 's' : ''}`,
        sub: 'Invisible pour les apprenants tant qu’il n’est pas publié.',
      })
    }
    const draftNotions = data.notions.total - data.notions.published
    if (draftNotions > 0) {
      items.push({
        key: 'notions',
        to: '/code/cours',
        title: `${draftNotions} notion${draftNotions > 1 ? 's' : ''} en brouillon`,
        sub: 'Publiez-les pour qu’elles apparaissent dans l’app.',
      })
    }
    if (data.exams.total > 0 && (data.exams.done < data.exams.total || data.exams.stale)) {
      items.push({
        key: 'exams',
        to: '/code/examens-test',
        title: data.exams.stale
          ? 'La banque de questions a changé'
          : `${data.exams.total - data.exams.done} examen${data.exams.total - data.exams.done > 1 ? 's' : ''} à générer`,
        sub: 'Régénérez les examens test pour les mettre à jour.',
      })
    }
    return items
  }, [data])

  const chapterPct = data.chapters.total
    ? Math.round((data.chapters.published / data.chapters.total) * 100)
    : 0

  const spaces = [
    {
      to: '/code/revision-chapitres',
      tone: 'green',
      icon: <List aria-hidden />,
      title: 'Révision par chapitres',
      sub: 'Questions et sujets test, chapitre par chapitre.',
      stats: [
        { v: `${data.chapters.published}/${data.chapters.total}`, l: 'chapitres publiés' },
        { v: nf(data.questions), l: 'questions' },
      ],
    },
    {
      to: '/code/cours',
      tone: 'sky',
      icon: <BookOpen aria-hidden />,
      title: 'Cours',
      sub: 'Notions classées par chapitre, avec texte, image et vidéo.',
      stats: [
        { v: `${data.notions.published}/${data.notions.total}`, l: 'notions publiées' },
        { v: String(data.chapters.total), l: 'chapitres' },
      ],
    },
    {
      to: '/code/examens-test',
      tone: 'gold',
      icon: <ClipboardCheck aria-hidden />,
      title: 'Examens test',
      sub: 'Sujets mélangés sur tous les chapitres publiés.',
      stats: [
        { v: `${data.exams.done}/${data.exams.total}`, l: 'examens générés' },
        { v: nf(data.questions), l: 'questions en banque' },
      ],
    },
    {
      to: '/code/suivi-apprenants',
      tone: 'navy',
      icon: <Radar aria-hidden />,
      title: 'Suivi des apprenants',
      sub: 'Parcours, notes et progression de chaque élève.',
      stats: [
        { v: nf(data.learners.active), l: 'apprenants actifs' },
        { v: nf(data.learners.total), l: 'inscrits' },
      ],
    },
  ]

  return (
    <CodeSection
      title="Code de la route"
      subtitle="Pilotez les chapitres, les cours, les examens et la progression des apprenants."
    >
      {error ? <p className="cx-note cx-note-err">{error}</p> : null}

      <div className="cx-kc-grid">
        <div className="cx-kc">
          <span className="cx-kc-ico cx-kc-blue">
            <Layers aria-hidden />
          </span>
          <div className="cx-kc-body">
            <span className="cx-kc-label">Chapitres publiés</span>
            <span className="cx-kc-value">
              {loading ? '…' : data.chapters.published} <small>/ {data.chapters.total}</small>
            </span>
            <span className="cx-kc-bar">
              <i style={{ width: `${chapterPct}%` }} />
            </span>
          </div>
        </div>
        <div className="cx-kc">
          <span className="cx-kc-ico cx-kc-green">
            <HelpCircle aria-hidden />
          </span>
          <div className="cx-kc-body">
            <span className="cx-kc-label">Questions</span>
            <span className="cx-kc-value">{loading ? '…' : nf(data.questions)}</span>
            <span className="cx-kc-sub">en banque de révision</span>
          </div>
        </div>
        <div className="cx-kc">
          <span className="cx-kc-ico cx-kc-sky">
            <BookOpen aria-hidden />
          </span>
          <div className="cx-kc-body">
            <span className="cx-kc-label">Notions</span>
            <span className="cx-kc-value">
              {loading ? '…' : data.notions.published} <small>/ {data.notions.total}</small>
            </span>
            <span className="cx-kc-sub">publiées sur le total</span>
          </div>
        </div>
        <div className="cx-kc">
          <span className="cx-kc-ico cx-kc-gold">
            <ClipboardCheck aria-hidden />
          </span>
          <div className="cx-kc-body">
            <span className="cx-kc-label">Examens test</span>
            <span className="cx-kc-value">
              {loading ? '…' : data.exams.done} <small>/ {data.exams.total}</small>
            </span>
            <span className="cx-kc-sub">sujets générés</span>
          </div>
        </div>
      </div>

      <div className="cx-space-grid">
        {spaces.map((space) => (
          <Link key={space.to} to={space.to} className={`cx-space cx-tone-${space.tone}`}>
            <div className="cx-space-head">
              <span className="cx-space-ico">{space.icon}</span>
              <div>
                <h2>{space.title}</h2>
                <p>{space.sub}</p>
              </div>
            </div>
            <div className="cx-space-stats">
              {space.stats.map((stat) => (
                <div key={stat.l}>
                  <b>{loading ? '…' : stat.v}</b>
                  <span>{stat.l}</span>
                </div>
              ))}
            </div>
            <span className="cx-space-go">
              Ouvrir <ArrowRight aria-hidden />
            </span>
          </Link>
        ))}
      </div>

      <section className="cx-panel">
        <div className="cx-panel-head cx-ph cx-ph-plain">
          <span className="cx-phi cx-phi-tile">
            <AlertTriangle aria-hidden />
          </span>
          <div className="cx-ph-txt">
            <h2 className="cx-panel-title">À traiter</h2>
            <p className="cx-muted">Ce qui empêche le contenu d’être complet côté apprenant</p>
          </div>
        </div>
        <div className="cx-todo">
          {todo.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '.85rem', padding: '.8rem .4rem' }}>
              <span className="cx-todo-ico cx-ok">
                <Check aria-hidden />
              </span>
              <div>
                <b style={{ display: 'block', color: 'var(--ink)' }}>Tout est à jour</b>
                <span className="cx-sub" style={{ fontSize: '.82rem', color: 'var(--ink-soft)' }}>
                  Chapitres, notions et examens sont publiés.
                </span>
              </div>
            </div>
          ) : (
            todo.map((item) => (
              <Link key={item.key} to={item.to}>
                <span className="cx-todo-ico">
                  <AlertTriangle aria-hidden />
                </span>
                <div>
                  <b>{item.title}</b>
                  <span className="cx-sub">{item.sub}</span>
                </div>
                <ChevronRight className="cx-arrow" aria-hidden />
              </Link>
            ))
          )}
        </div>
      </section>
    </CodeSection>
  )
}
