import { Lock } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchSubscriptionMe, type SubscriptionAccess } from '../api/subscriptions'
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
    icon: (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <rect x="10" y="12" width="44" height="10" rx="2" fill="#ef4444" />
        <text x="14" y="19" fill="#fff" fontSize="8" fontWeight="700">?</text>
        <rect x="10" y="26" width="44" height="10" rx="2" fill="#eab308" />
        <text x="14" y="33" fill="#fff" fontSize="8" fontWeight="700">?</text>
        <rect x="10" y="40" width="44" height="10" rx="2" fill="#22c55e" />
        <text x="14" y="47" fill="#fff" fontSize="8" fontWeight="700">?</text>
      </svg>
    ),
  },
  {
    id: 'examens-test',
    label: 'Examens test',
    subtitle: '(auto-évaluation)',
    className: 'category-yellow',
    icon: (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <rect x="14" y="10" width="36" height="44" rx="4" fill="#fff" opacity="0.95" />
        <circle cx="32" cy="30" r="12" fill="#3b82f6" />
        <text x="32" y="35" textAnchor="middle" fill="#fff" fontSize="16" fontWeight="700">?</text>
      </svg>
    ),
  },
  {
    id: 'mes-notes',
    label: 'Mes notes & avancée',
    subtitle: '',
    className: 'category-green',
    icon: (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <ellipse cx="24" cy="22" rx="16" ry="12" fill="#eab308" />
        <text x="24" y="26" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="700">Q</text>
        <ellipse cx="40" cy="38" rx="16" ry="12" fill="#3b82f6" />
        <text x="40" y="42" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="700">A</text>
      </svg>
    ),
  },
  {
    id: 'e-codepermis',
    label: 'E-Codepermis',
    subtitle: '(examen blanc)',
    className: 'category-purple',
    icon: (
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <rect x="14" y="12" width="36" height="40" rx="4" fill="#fff" opacity="0.95" />
        <rect x="18" y="18" width="10" height="10" rx="2" fill="#22c55e" />
        <text x="23" y="26" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="700">a</text>
        <rect x="30" y="18" width="10" height="10" rx="2" fill="#eab308" />
        <text x="35" y="26" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="700">✓</text>
        <rect x="18" y="30" width="10" height="10" rx="2" fill="#ef4444" />
        <text x="23" y="38" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="700">c</text>
        <rect x="30" y="30" width="10" height="10" rx="2" fill="#3b82f6" />
        <text x="35" y="38" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="700">d</text>
      </svg>
    ),
  },
] as const

function CategoryIcon({ children }: { children: ReactNode }) {
  return <span className="category-icon">{children}</span>
}

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
        <header className="auth-header auth-header-compact code-route-header code-route-anim-header">
          <div className="code-route-accents" aria-hidden="true">
            <span className="code-route-accent code-route-accent-green" />
            <span className="code-route-accent code-route-accent-gold" />
            <span className="code-route-accent code-route-accent-navy" />
          </div>
          <p className="code-route-subtitle">
            Choisissez un module pour réviser, vous tester ou passer un examen blanc.
          </p>
          <p className="code-route-detail">
            Avancez à votre rythme : cours par chapitres, examens test, suivi de vos notes,
            puis un examen blanc en conditions réelles.
          </p>
        </header>

        <div className="code-route-banner" aria-hidden="true">
          <div className="code-route-banner-track">
            {[0, 1].flatMap((copy) =>
              [1, 2, 3, 4, 5, 6].map((n) => (
                <img
                  key={`${copy}-${n}`}
                  src={`/code-route/banner-${n}.jpg`}
                  alt=""
                  className="code-route-banner-item"
                  loading={copy === 0 && n <= 3 ? 'eager' : 'lazy'}
                  draggable={false}
                />
              )),
            )}
          </div>
        </div>

        <div className="category-grid">
          {categories.map((category, index) => {
            const eCodeLocked = category.id === 'e-codepermis' && !subscription?.accessECodepermis
            return (
            <button
              key={category.id}
              type="button"
              className={`category-card ${category.className} code-route-anim-card${eCodeLocked ? ' is-locked' : ''}`}
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
              <CategoryIcon>{category.icon}</CategoryIcon>
              <span className="category-label">{category.label}</span>
              {category.subtitle ? (
                <span className="category-subtitle">{category.subtitle}</span>
              ) : null}
              {eCodeLocked ? (
                <span className="category-subtitle">
                  <Lock size={12} /> Abonnement adapté requis
                </span>
              ) : null}
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
