import { Lock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchSubscriptionMe, type SubscriptionAccess } from '../api/subscriptions'
import { CodeRouteBanner } from '../components/CodeRouteBanner'
import { CodeModuleIcon } from '../components/ModuleIcons'
import { PageNavbar } from '../components/PageNavbar'
import { useAuth } from '../hooks/useAuth'
import '../styles/auth.css'
import '../styles/learner.css'

const categories = [
  {
    id: 'revision-chapitres',
    label: 'Révision par chapitres',
    subtitle: '',
    className: 'category-pink',
    image: '/code-route/cards/revision.jpg',
  },
  {
    id: 'examens-test',
    label: 'Examens test',
    subtitle: '(auto-évaluation)',
    className: 'category-yellow',
    image: '/code-route/cards/examens.jpg',
  },
  {
    id: 'mes-notes',
    label: 'Mes notes & avancée',
    subtitle: '',
    className: 'category-green',
    image: '/code-route/cards/notes.jpg',
  },
  {
    id: 'e-codepermis',
    label: 'E-Codepermis',
    subtitle: '(examen blanc)',
    className: 'category-purple',
    image: '/code-route/cards/ecodepermis.jpg',
  },
] as const

export function CodeRoutePage() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [subscription, setSubscription] = useState<SubscriptionAccess | null>(null)
  const [subscriptionLoading, setSubscriptionLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    void fetchSubscriptionMe()
      .then(setSubscription)
      .catch(() => setSubscription(null))
      .finally(() => setSubscriptionLoading(false))
  }, [user])

  if (loading || !user) return null

  return (
    <div className="auth-page">
      <div className="auth-container auth-container-wide code-route-page">
        <PageNavbar
          title="Code de la route"
          icon={<CodeModuleIcon size={28} />}
          onBack={() => navigate('/accueil')}
        />

        {subscriptionLoading ? (
          <div className="auth-card learner-card learner-empty">
            <p>Vérification de votre accès…</p>
          </div>
        ) : !subscription?.accessCode ? (
          <div className="auth-card learner-card learner-empty subscription-locked-state">
            <Lock size={32} aria-hidden="true" />
            <h2>Le module Code est verrouillé</h2>
            <p>Votre abonnement doit inclure l’accès au Code de la route.</p>
            <button type="button" className="btn-primary" onClick={() => navigate('/abonnement')}>
              Voir les offres
            </button>
          </div>
        ) : (
          <>
        <div className="code-route-accents" aria-hidden="true">
          <span className="code-route-accent code-route-accent-green" />
          <span className="code-route-accent code-route-accent-gold" />
          <span className="code-route-accent code-route-accent-navy" />
        </div>

        <CodeRouteBanner />

        <div className="category-grid">
          {categories.map((category, index) => {
            const eCodeLocked = category.id === 'e-codepermis' && !subscription?.accessECodepermis
            return (
            <button
              key={category.id}
              type="button"
              className={`category-card category-card--photo ${category.className} code-route-anim-card${eCodeLocked ? ' is-locked' : ''}`}
              style={{ animationDelay: `${0.28 + index * 0.09}s` }}
              disabled={eCodeLocked}
              onClick={() => {
                if (eCodeLocked) {
                  navigate('/abonnement')
                  return
                }
                navigate(`/code-de-la-route/${category.id}`)
              }}
            >
              <img
                src={category.image}
                alt=""
                className="category-card-image"
                draggable={false}
              />
              <span className="category-card-shade" aria-hidden="true" />
              <span className="category-card-body">
                <span className="category-label">{category.label}</span>
                {category.subtitle ? (
                  <span className="category-subtitle">{category.subtitle}</span>
                ) : null}
                {eCodeLocked ? (
                  <span className="category-subtitle category-lock-row">
                    <Lock size={12} /> Abonnement adapté requis
                  </span>
                ) : null}
              </span>
            </button>
            )
          })}
        </div>
          </>
        )}
      </div>
    </div>
  )
}
