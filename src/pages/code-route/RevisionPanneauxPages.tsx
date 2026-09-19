import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, Pause, Play, TriangleAlert } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PageNavbar } from '../../components/PageNavbar'
import { Reveal } from '../../components/Reveal'
import {
  getPanneauCategory,
  PANNEAUX_CATEGORIES,
} from '../../data/codeRoute/panneauxCatalog'
import { useAuth } from '../../hooks/useAuth'
import { resolveMediaUrl } from '../../utils/mediaUrl'
import {
  resolvePanneauAudioUrl,
  speakPanneau,
  stopPanneauSpeech,
} from '../../utils/panneauAudio'
import '../../styles/auth.css'
import '../../styles/learner.css'

export function RevisionPanneauxPage() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const total = useMemo(
    () => PANNEAUX_CATEGORIES.reduce((sum, cat) => sum + cat.count, 0),
    [],
  )

  if (loading || !user) return null

  return (
    <div className="auth-page">
      <div className="auth-container learner-container">
        <PageNavbar
          title="Révision panneaux"
          icon={<TriangleAlert size={22} />}
          onBack={() => navigate('/code-de-la-route')}
        />

        <header className="auth-header learner-header">
          <p className="learner-kicker">Signalisation</p>
          <h1>Révision des panneaux</h1>
          <p>
            {total} panneaux répartis en {PANNEAUX_CATEGORIES.length} catégories.
            Choisis une famille pour réviser.
          </p>
        </header>

        <div className="auth-card learner-card">
          <div className="learner-panneaux-hero">
            <img src="/code-route/cards/panneaux.png" alt="" draggable={false} />
          </div>
          <div className="learner-list learner-panneaux-cats">
            {PANNEAUX_CATEGORIES.map((cat, catIndex) => (
              <Reveal key={cat.id} delay={Math.min(catIndex, 8) * 40}>
              <Link
                className="learner-item"
                to={`/code-de-la-route/revision-panneaux/${cat.id}`}
              >
                <span className="learner-item-icon learner-panneaux-prefix">{cat.codePrefix}</span>
                <span className="learner-item-body">
                  <strong>{cat.label}</strong>
                  <small>
                    {cat.count} {cat.count > 1 ? 'panneaux' : 'panneau'}
                  </small>
                </span>
                <ChevronRight size={16} aria-hidden />
              </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function RevisionPanneauxCategoryPage() {
  const navigate = useNavigate()
  const { categoryId = '' } = useParams()
  const { user, loading } = useAuth()
  const category = getPanneauCategory(categoryId)
  const [playingCode, setPlayingCode] = useState<string | null>(null)

  useEffect(() => () => stopPanneauSpeech(), [])

  if (loading || !user) return null

  if (!category) {
    return (
      <div className="auth-page">
        <div className="auth-container learner-container">
          <PageNavbar
            title="Révision panneaux"
            icon={<TriangleAlert size={22} />}
            onBack={() => navigate('/code-de-la-route/revision-panneaux')}
          />
          <div className="auth-card learner-card learner-empty">
            <h2>Catégorie introuvable</h2>
            <p className="subtitle">Cette famille de panneaux n’existe pas.</p>
          </div>
        </div>
      </div>
    )
  }

  const togglePlay = (code: string, definition: string, audio?: string) => {
    if (playingCode === code) {
      stopPanneauSpeech()
      setPlayingCode(null)
      return
    }
    setPlayingCode(code)
    speakPanneau(
      {
        code,
        definition,
        audioUrl: resolvePanneauAudioUrl(audio),
      },
      () => {
        setPlayingCode((current) => (current === code ? null : current))
      },
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-container learner-container">
        <PageNavbar
          title={category.label}
          icon={<TriangleAlert size={22} />}
          onBack={() => {
            stopPanneauSpeech()
            navigate('/code-de-la-route/revision-panneaux')
          }}
        />

        <header className="auth-header learner-header">
          <p className="learner-kicker">Code {category.codePrefix}</p>
          <h1>{category.label}</h1>
          <p>
            {category.count} {category.count > 1 ? 'panneaux' : 'panneau'} — lis la définition ou
            écoute-la avec le bouton play.
          </p>
        </header>

        <div className="auth-card learner-card">
          <div className="learner-panneaux-cards">
            {category.signs.map((sign, signIndex) => {
              const def =
                sign.definition && sign.definition !== sign.code
                  ? sign.definition
                  : 'Définition à compléter pour ce panneau.'
              const playing = playingCode === sign.code
              return (
                <Reveal key={sign.code} delay={Math.min(signIndex, 8) * 40}>
                <article className="learner-panneau-card">
                  <div className="learner-panneau-card-media">
                    <img src={resolveMediaUrl(sign.image)} alt={sign.code} loading="lazy" />
                    <button
                      type="button"
                      className={`learner-panneau-play${playing ? ' is-playing' : ''}`}
                      aria-label={playing ? `Arrêter ${sign.code}` : `Écouter ${sign.code}`}
                      onClick={() => togglePlay(sign.code, def, sign.audio)}
                    >
                      {playing ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                  </div>
                  <div className="learner-panneau-card-body">
                    <p className="learner-panneau-card-code">{sign.code}</p>
                    <p className="learner-panneau-card-def">{def}</p>
                  </div>
                </article>
                </Reveal>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
