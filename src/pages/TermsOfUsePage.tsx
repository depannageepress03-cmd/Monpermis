import { FileText } from 'lucide-react'
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
    title: '1. Objet',
    paragraphs: [
      "Les présentes conditions régissent l'accès et l'utilisation de Monpermis.bj, application d'accompagnement à la préparation du permis de conduire (code de la route et conduite).",
      "En créant un compte ou en utilisant l'application, vous acceptez ces conditions dans leur intégralité.",
    ],
  },
  {
    title: '2. Description du service',
    paragraphs: [
      "Monpermis.bj propose des contenus pédagogiques, des exercices, des examens blancs et un suivi de progression pour préparer le code de la route et la conduite.",
      "Les informations fournies sont à titre pédagogique. Elles ne se substituent pas aux textes officiels ni aux consignes de votre auto-école ou de l'autorité compétente. Vérifiez toujours les règles en vigueur auprès des sources officielles.",
    ],
  },
  {
    title: '3. Inscription et compte utilisateur',
    paragraphs: [
      "L'inscription nécessite des informations exactes (identité, e-mail, téléphone le cas échéant) et un mot de passe respectant les critères de sécurité affichés.",
      "Vous êtes responsable de la confidentialité de vos identifiants et de toute activité réalisée depuis votre compte. Un compte est personnel et ne doit pas être partagé.",
    ],
  },
  {
    title: '4. Communications',
    paragraphs: [
      "En vous inscrivant, vous pouvez recevoir des e-mails transactionnels (bienvenue, sécurité du compte) et des messages liés à votre progression ou à votre formation.",
      "Vous pouvez exercer vos droits et supprimer votre compte depuis Profil → Supprimer mon compte, ou en contactant le support.",
    ],
  },
  {
    title: '5. Utilisation acceptable',
    paragraphs: ['L’utilisateur s’engage à ne pas :'],
    bullets: [
      'utiliser le service à des fins illégales ou frauduleuses ;',
      'tenter d’accéder de manière non autorisée aux systèmes ou données ;',
      'copier, redistribuer ou vendre les contenus sans autorisation ;',
      'publier ou transmettre des contenus nuisibles, diffamatoires ou contraires à la loi ;',
      'usurper l’identité d’un tiers ou créer de faux comptes.',
    ],
  },
  {
    title: '6. Propriété intellectuelle',
    paragraphs: [
      "La marque Monpermis.bj, l'interface, les contenus pédagogiques, le code et les éléments graphiques sont protégés.",
      "Toute reproduction non autorisée est interdite, sauf usage personnel et privé dans le cadre de votre formation.",
    ],
  },
  {
    title: '7. Disponibilité et responsabilité',
    paragraphs: [
      "Le service est fourni « en l'état ». Monpermis.bj ne garantit pas une disponibilité ininterrompue.",
      "L'application ne peut être tenue responsable des décisions prises sur la base des contenus affichés, ni du résultat d'un examen officiel (code ou conduite).",
    ],
  },
  {
    title: '8. Suspension et résiliation',
    paragraphs: [
      "Nous nous réservons le droit de suspendre ou supprimer un compte en cas de violation des présentes conditions.",
      "Vous pouvez supprimer votre compte à tout moment depuis Profil → Supprimer mon compte, ou en contactant le support.",
    ],
  },
  {
    title: '9. Données personnelles',
    paragraphs: [
      "Vos données sont traitées pour créer et gérer votre compte, assurer le suivi pédagogique et améliorer le service.",
      "Pour toute question relative à vos données, contactez l'éditeur de Monpermis.bj.",
    ],
  },
  {
    title: '10. Droit applicable',
    paragraphs: [
      "Les présentes conditions sont régies par le droit applicable dans le pays d'exploitation du service.",
      "En cas de litige, les parties s'efforceront de trouver une solution amiable avant toute action judiciaire.",
    ],
  },
] as const

export function TermsOfUsePage() {
  const navigate = useNavigate()

  return (
    <div className="auth-page">
      <div className="auth-container learner-container">
        <PageNavbar
          title="Conditions d'utilisation"
          icon={<FileText size={20} />}
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
            {'bullets' in section && section.bullets ? (
              <ul style={{ paddingLeft: 18, margin: 0 }}>
                {section.bullets.map((bullet) => (
                  <li key={bullet} style={{ marginBottom: 4 }}>
                    {bullet}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}

        <button
          type="button"
          className="signin-register-link"
          style={{ background: 'none', border: 0, cursor: 'pointer', padding: '12px 0' }}
          onClick={() => navigate('/inscription')}
        >
          ← Retour à l'inscription
        </button>
      </div>
    </div>
  )
}
