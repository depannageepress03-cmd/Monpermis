import { Lock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  computeModuleAmount,
  fetchAccessMe,
  fetchAccessModules,
  type AccessMe,
  type AccessModule,
} from '../api/accessRequests'
import { CodeRouteBanner } from '../components/CodeRouteBanner'
import { MobileMoneyCheckout } from '../components/MobileMoneyCheckout'
import { CodeModuleIcon } from '../components/ModuleIcons'
import { PageNavbar } from '../components/PageNavbar'
import { PageLoader } from '../components/PageLoader'
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
    subtitle: '(24 sujets · tous les chapitres)',
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

function formatPrice(amount: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function CodeRoutePage() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [accessMe, setAccessMe] = useState<AccessMe | null>(null)
  const [modules, setModules] = useState<AccessModule[]>([])
  const [accessLoading, setAccessLoading] = useState(true)
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    const refresh = () => {
      void Promise.all([fetchAccessMe(), fetchAccessModules()])
        .then(([me, catalog]) => {
          setAccessMe(me)
          setModules(catalog)
        })
        .catch(() => {
          setAccessMe(null)
          setModules([])
        })
        .finally(() => setAccessLoading(false))
    }
    refresh()
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', refresh)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', refresh)
    }
  }, [user])

  if (loading || !user) return <PageLoader />

  const codeModule = modules.find((m) => m.key === 'code')
  const codePrice = codeModule ? computeModuleAmount('code', codeModule.price, 1) : 2000

  return (
    <div className="auth-page">
      <div className="auth-container auth-container-wide code-route-page">
        <PageNavbar
          title="Code de la route"
          icon={<CodeModuleIcon size={28} />}
          onBack={() => navigate('/accueil')}
        />

        {accessLoading ? (
          <div className="auth-card learner-card learner-empty">
            <p>Vérification de votre accès…</p>
          </div>
        ) : !accessMe?.access.code ? (
          <div className="auth-card learner-card learner-empty subscription-locked-state">
            <Lock size={32} aria-hidden="true" />
            <h2>Souscrire au Code</h2>
            <p>Forfait mensuel pour débloquer la révision, les sujets test et l’examen blanc.</p>
            <div className="offer-pick-list">
              <div className="offer-pick is-selected">
                <h3>Code de la route</h3>
                <p>{formatPrice(codePrice)} / mois</p>
              </div>
            </div>
            <button type="button" className="btn-primary" onClick={() => setCheckoutOpen(true)}>
              Payer {formatPrice(codePrice)}
            </button>
            <MobileMoneyCheckout
              open={checkoutOpen}
              items={[{ module: 'code', quantity: 1 }]}
              modules={modules}
              defaultPhone={user.phone}
              onClose={() => setCheckoutOpen(false)}
              onSuccess={(access) => {
                setAccessMe(access)
                setCheckoutOpen(false)
              }}
            />
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
            const eCodeLocked = category.id === 'e-codepermis' && !accessMe?.access.ecodepermis
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
                    <Lock size={12} /> Accès E-Codepermis requis
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
