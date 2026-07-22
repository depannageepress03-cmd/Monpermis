import { Shield } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { BrandName } from '../components/BrandName'
import { PageNavbar } from '../components/PageNavbar'
import '../styles/auth.css'
import '../styles/learner.css'
import '../styles/legal-footer.css'

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
    title: '1. Responsable du traitement',
    paragraphs: [
      "Monpermis.bj traite vos données personnelles pour fournir le service d'accompagnement à la préparation du permis de conduire.",
      'Pour toute question : contactez le support via l’adresse indiquée dans l’application ou sur le site.',
    ],
  },
  {
    title: '2. Données collectées',
    paragraphs: [
      'Nous collectons les données nécessaires au compte : identité, e-mail, téléphone, identifiants de connexion (ou compte Google), progression pédagogique, abonnements et réservations.',
      'Les paiements sont traités via FedaPay ; nous ne stockons pas les données complètes de carte bancaire.',
    ],
  },
  {
    title: '3. Finalités',
    paragraphs: ['Vos données sont utilisées pour :'],
    bullets: [
      'créer et sécuriser votre compte ;',
      'fournir les contenus, examens et réservations ;',
      'gérer les abonnements et la facturation ;',
      'envoyer des e-mails transactionnels (sécurité, confirmations) ;',
      'améliorer le service et assurer le support.',
    ],
  },
  {
    title: '4. Base légale et durée',
    paragraphs: [
      'Le traitement repose sur l’exécution du contrat (compte / abonnement) et, le cas échéant, sur votre consentement (ex. connexion Google).',
      'Les données sont conservées pendant la durée du compte, puis archivées ou supprimées selon les obligations légales applicables.',
    ],
  },
  {
    title: '5. Partage',
    paragraphs: [
      'Nous ne vendons pas vos données. Elles peuvent être partagées avec des prestataires techniques (hébergement, e-mail, paiement) uniquement pour opérer le service.',
    ],
  },
  {
    title: '6. Vos droits',
    paragraphs: [
      'Vous pouvez accéder à vos données, les rectifier depuis votre profil, et demander la suppression de votre compte directement dans l’application (Profil → Supprimer mon compte) ou auprès du support.',
    ],
  },
  {
    title: '7. Sécurité',
    paragraphs: [
      'Nous mettons en œuvre des mesures raisonnables (mots de passe hachés, accès authentifié, limitation des API) pour protéger vos informations.',
    ],
  },
] as const

export function PrivacyPolicyPage() {
  const navigate = useNavigate()

  return (
    <div className="auth-page">
      <div className="auth-container learner-container">
        <PageNavbar
          title="Politique de confidentialité"
          icon={<Shield size={20} />}
          onBack={() => navigate(-1)}
        />

        <div className="legal-doc">
          <p className="legal-doc-updated">
            <Shield size={16} aria-hidden />
            Dernière mise à jour : juillet 2026
          </p>

          {SECTIONS.map((section) => (
            <section key={section.title} className="legal-doc-card">
              <h2>{section.title}</h2>
              {section.paragraphs.map((paragraph) => (
                <ParagraphWithBrand key={paragraph} text={paragraph} />
              ))}
              {'bullets' in section && section.bullets ? (
                <ul>
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
