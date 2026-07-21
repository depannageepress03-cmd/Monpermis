import { Scale } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { BrandName } from '../components/BrandName'
import { PageNavbar } from '../components/PageNavbar'
import '../styles/auth.css'
import '../styles/learner.css'

function ParagraphWithBrand({ text }: { text: string }) {
  const parts = text.split('Monpermis.bj')
  if (parts.length === 1) return <p>{text}</p>
  return (
    <p>
      {parts.map((part, index) => (
        <span key={`${index}-${part.slice(0, 12)}`}>
          {part}
          {index < parts.length - 1 ? <BrandName as="span" /> : null}
        </span>
      ))}
    </p>
  )
}

const SECTIONS = [
  {
    title: '1. Éditeur du service',
    paragraphs: [
      'Le service Monpermis.bj est édité et exploité dans le cadre de l’activité de formation à la conduite automobile au Bénin.',
      'Application mobile et site web : Monpermis.bj (marque commerciale).',
      'Contact : noreply@monpermis.bj (demandes générales via le support indiqué dans l’application).',
    ],
  },
  {
    title: '2. Directeur de la publication',
    paragraphs: [
      'Le directeur de la publication est le responsable de l’édition de Monpermis.bj.',
    ],
  },
  {
    title: '3. Hébergement',
    paragraphs: [
      'Le site et l’API sont hébergés par Render Services, Inc. (render.com).',
      'L’application mobile est distribuée via les stores Android / iOS selon les plateformes disponibles.',
    ],
  },
  {
    title: '4. Propriété intellectuelle',
    paragraphs: [
      'L’ensemble des éléments de Monpermis.bj (textes, graphismes, logo, interfaces, contenus pédagogiques) est protégé. Toute reproduction non autorisée est interdite.',
    ],
  },
  {
    title: '5. Données personnelles',
    paragraphs: [
      'Le traitement des données personnelles est décrit dans la Politique de confidentialité accessible depuis l’application et le site.',
    ],
  },
  {
    title: '6. Responsabilité',
    paragraphs: [
      'Monpermis.bj fournit un accompagnement pédagogique à la préparation du permis. L’éditeur ne peut être tenu responsable d’une utilisation non conforme du service ni des décisions administratives liées à l’examen du permis.',
    ],
  },
] as const

export function MentionsLegalesPage() {
  const navigate = useNavigate()

  return (
    <div className="auth-page">
      <div className="auth-container learner-container">
        <PageNavbar
          title="Mentions légales"
          icon={<Scale size={20} />}
          onBack={() => navigate(-1)}
        />

        <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 20px' }}>
          Dernière mise à jour : juillet 2026
        </p>

        {SECTIONS.map((section) => (
          <section key={section.title} className="auth-card learner-card" style={{ marginBottom: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{section.title}</h2>
            {section.paragraphs.map((paragraph) => (
              <ParagraphWithBrand key={paragraph} text={paragraph} />
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}
