import {
  BookOpen,
  Check,
  ChevronRight,
  ClipboardList,
  GraduationCap,
  LineChart,
  Lock,
  Pencil,
  ShieldCheck,
  Smartphone,
  TriangleAlert,
  Trophy,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  computeModuleAmount,
  fetchAccessMe,
  fetchAccessModules,
  type AccessMe,
  type AccessModule,
} from '../api/accessRequests'
import { fetchLearnerJourney, type LearnerJourney } from '../api/content'
import { CodeRouteBanner } from '../components/CodeRouteBanner'
import { MobileMoneyCheckout } from '../components/MobileMoneyCheckout'
import { CodeModuleIcon } from '../components/ModuleIcons'
import { PageNavbar } from '../components/PageNavbar'
import { PageLoader } from '../components/PageLoader'
import { Reveal } from '../components/Reveal'
import { AnimatedCounter } from '../components/AnimatedCounter'
import { useAuth } from '../hooks/useAuth'
import { AppShell, userInitialsOf, type AppTab } from '../components/layout/AppShell'
import { Button, Card, IconBadge, ProgressBar, SectionTitle, StatCard } from '../components/ui'
import '../styles/auth.css'
import '../styles/learner.css'

const TAB_ROUTES: Record<AppTab, string> = {
  accueil: '/accueil',
  code: '/code-de-la-route',
  conduite: '/conduite',
  progres: '/code-de-la-route/mes-notes',
  profil: '/profil',
}

const categoriesBase = [
  {
    id: 'revision-chapitres',
    label: 'Révision par chapitres',
    subtitle: 'Révise chapitre par chapitre avec des questions ciblées.',
    className: 'category-pink',
    image: '/code-route/cards/revision.jpg',
    Icon: Pencil,
  },
  {
    id: 'revision-panneaux',
    label: 'Révision panneaux',
    subtitle: 'Apprends tous les panneaux par catégorie.',
    className: 'category-cyan',
    image: '/code-route/cards/panneaux.png',
    Icon: TriangleAlert,
  },
  {
    id: 'examens-test',
    label: 'Examens test',
    subtitle: 'Sujets pour te tester sur tous les chapitres.',
    className: 'category-yellow',
    image: '/code-route/cards/examens.jpg',
    Icon: ClipboardList,
  },
  {
    id: 'mes-notes',
    label: 'Mes notes & avancée',
    subtitle: 'Suis tes résultats et ta progression en temps réel.',
    className: 'category-green',
    image: '/code-route/cards/notes.jpg',
    Icon: LineChart,
  },
  {
    id: 'cours',
    label: 'Cours',
    subtitle: 'Accède à tous les cours et modules expliqués en détail.',
    className: 'category-purple',
    image: '/code-route/cards/ecodepermis.jpg',
    Icon: GraduationCap,
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
  const [journey, setJourney] = useState<LearnerJourney | null>(null)
  const [accessLoading, setAccessLoading] = useState(true)
  const [checkoutOpen, setCheckoutOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    const refresh = () => {
      void Promise.all([
        fetchAccessMe(),
        fetchAccessModules(),
        fetchLearnerJourney().catch(() => null),
      ])
        .then(([me, catalog, journeyData]) => {
          setAccessMe(me)
          setModules(catalog)
          setJourney(journeyData)
        })
        .catch(() => {
          setAccessMe(null)
          setModules([])
          setJourney(null)
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

  const categories = useMemo(() => {
    const examTotal = journey?.practiceExams.examTotal
    return categoriesBase.map((category) =>
      category.id === 'examens-test' && typeof examTotal === 'number' && examTotal > 0
        ? { ...category, subtitle: `${examTotal} sujets disponibles pour te tester.` }
        : category,
    )
  }, [journey])

  if (loading || !user) return <PageLoader />

  const codeModule = modules.find((m) => m.key === 'code')
  const codePrice = codeModule ? computeModuleAmount('code', codeModule.price, 1) : 2000
  const done = journey?.code.chaptersDone ?? 0
  const total = journey?.code.chaptersTotal ?? 0
  const chapterName = journey?.code.currentStop?.chapterName || journey?.code.currentStop?.label

  return (
    <AppShell
      activeTab="code"
      userInitials={userInitialsOf(user?.firstName, user?.lastName)}
      onNavigate={(tab) => navigate(TAB_ROUTES[tab])}
      onOpenNotifications={() => navigate('/notifications')}
      onOpenProfile={() => navigate('/profil')}
    >
    <div className="auth-page code-route-page-root">
      <div className="auth-container auth-container-wide code-route-page">
        <PageNavbar
          title="Code de la route"
          icon={<CodeModuleIcon size={22} />}
          onBack={() => navigate('/accueil')}
        />

        {accessLoading ? (
          <Card className="learner-empty">
            <p>Vérification de votre accès…</p>
          </Card>
        ) : !accessMe?.access.code ? (
          <Card className="code-unlock">
            <div className="code-unlock-hero">
              <SectionTitle>Débloque tout le contenu</SectionTitle>
              <ul>
                <li>
                  <Check size={16} /> Révision complète
                </li>
                <li>
                  <Check size={16} /> Sujets test
                </li>
                <li>
                  <Check size={16} /> Examens blancs
                </li>
              </ul>
            </div>
            <div className="code-unlock-lock">
              <IconBadge icon={<Lock size={32} />} tone="green" />
            </div>
            <SectionTitle>Souscrire au Code</SectionTitle>
            <div className="code-unlock-benefits">
              <p>
                <BookOpen size={16} /> Tous les chapitres du Code de la route
              </p>
              <p>
                <ClipboardList size={16} /> Tests pour t’évaluer
              </p>
              <p>
                <Trophy size={16} /> Examens blancs
              </p>
            </div>
            <div className="code-unlock-price">
              <StatCard icon={<Trophy size={14} />} label="Abonnement Code" value={formatPrice(codePrice)} />
              <span>
                <ShieldCheck size={14} /> Paiement sécurisé
              </span>
            </div>
            <p className="code-unlock-mm">Paiement 100% sécurisé via Mobile Money</p>
            <Button variant="cta" tone="green" icon={<Smartphone size={18} />} onClick={() => setCheckoutOpen(true)}>
              Payer {formatPrice(codePrice)}
              <ChevronRight size={18} />
            </Button>
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
          </Card>
        ) : (
          <>
            <Reveal delay={60} eager>
            <Card>
              <StatCard
                icon={<BookOpen size={14} />}
                label={total > 0 ? 'Chapitres terminés' : 'Ton parcours Code'}
                value={total > 0 ? `${done}/${total}` : '—'}
              />
              <ProgressBar percent={total > 0 ? Math.round((done / total) * 100) : 0} />
              <p className="code-route-progress-caption">
                {total > 0 ? (
                  <>
                    <AnimatedCounter value={done} />/{total} chapitres
                    {chapterName ? ` · ${chapterName}` : ''}
                  </>
                ) : (
                  'Ton parcours Code'
                )}
              </p>
            </Card>
            </Reveal>
            <div className="code-route-banner-wrap">
              <CodeRouteBanner />
            </div>
            <SectionTitle>Choisis une rubrique</SectionTitle>
            <div className="category-grid">
              {categories.map((category, index) => {
                const Icon = category.Icon
                return (
                  <Card key={category.id} className={`${category.className} code-route-anim-card`}>
                  <button
                    type="button"
                    className="category-card category-card--photo"
                    style={{ animationDelay: `${0.12 + index * 0.07}s` }}
                    onClick={() => navigate(`/code-de-la-route/${category.id}`)}
                  >
                    <img src={category.image} alt="" className="category-card-image" draggable={false} />
                    <span className="category-card-shade" aria-hidden="true" />
                    <span className="category-card-body">
                      <IconBadge icon={<Icon size={16} />} tone="green" />
                      <span className="category-label">{category.label}</span>
                      <span className="category-subtitle">{category.subtitle}</span>
                    </span>
                    <span className="category-card-arrow">
                      <ChevronRight size={16} />
                    </span>
                  </button>
                  </Card>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
    </AppShell>
  )
}
