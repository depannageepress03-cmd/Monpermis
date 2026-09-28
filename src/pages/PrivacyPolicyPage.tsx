import type { CSSProperties } from 'react';
import { Shield, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
;
import { IconButton } from '../components/ui';
import { BrandName } from '../components/BrandName';

function ParagraphWithBrand({ text, style }: { text: string; style?: CSSProperties }) {
  const parts = text.split('Monpermis.bj');
  if (parts.length === 1) return <p style={style}>{text}</p>;
  return (
    <p style={style}>
      {parts.map((part, index) => (
        <span key={`${index}-${part.slice(0, 12)}`}>
          {part}
          {index < parts.length - 1 ? <BrandName as="span" /> : null}
        </span>
      ))}
    </p>
  );
}

const SECTIONS = [
  {
    title: '1. Responsable du traitement',
    paragraphs: [
      "Monpermis.bj traite vos données personnelles pour fournir le service d'accompagnement à la préparation du permis de conduire.",
      'Pour toute question : contactez le support via l\'adresse indiquée dans l\'application ou sur le site.',
    ],
  },
  {
    title: '2. Données collectées',
    paragraphs: [
      'Nous collectons les données nécessaires au compte : identité, téléphone, identifiants de connexion, progression pédagogique, abonnements et réservations.',
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
      'Le traitement repose sur l\'exécution du contrat (compte / abonnement) et, le cas échéant, sur votre consentement.',
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
      'Vous pouvez accéder à vos données, les rectifier depuis votre profil, et demander la suppression de votre compte directement dans l\'application (Profil → Supprimer mon compte) ou auprès du support.',
    ],
  },
  {
    title: '7. Sécurité',
    paragraphs: [
      'Nous mettons en œuvre des mesures raisonnables (mots de passe hachés, accès authentifié, limitation des API) pour protéger vos informations.',
    ],
  },
] as const;

export function PrivacyPolicyPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100dvh', background: '#EAEFF6', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -100, right: -100, width: 280, height: 280, borderRadius: '50%', background: 'rgba(11,170,79,0.12)', filter: 'blur(60px)', pointerEvents: 'none' }} />
      <div style={{ boxSizing: 'border-box', padding: '56px 20px 0', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 800, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <IconButton
            icon={ChevronLeft}
            iconSize={20}
            ariaLabel="Retour"
            onPress={() => navigate(-1)}
          />
          <h1 style={{ margin: 0, fontFamily: 'Sora, sans-serif', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', color: '#0A1B3D', flex: 1, textAlign: 'center' }}>
            Politique de confidentialité
          </h1>
          <div style={{ width: 46 }} />
        </div>

        <div style={{ fontSize: 13.5, color: '#5B6680', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
          <Shield size={16} aria-hidden="true" />
          Dernière mise à jour : juillet 2026
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 720, margin: '0 auto', padding: '0 20px' }}>
          {SECTIONS.map((section) => (
            <section key={section.title} style={{ background: '#FFFFFF', borderRadius: 24, padding: '20px', boxShadow: '0 10px 30px -18px rgba(10,27,61,0.3)' }}>
              <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 12, color: '#0A1B3D' }}>{section.title}</h2>
              {section.paragraphs.map((paragraph) => (
                <ParagraphWithBrand key={paragraph} text={paragraph} style={{ color: '#0A1B3D', lineHeight: 1.6, marginBottom: 8 }} />
              ))}
              {'bullets' in section && section.bullets ? (
                <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                  {section.bullets.map((bullet) => (
                    <li key={bullet} style={{ color: '#0A1B3D', lineHeight: 1.6, marginBottom: 6 }}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, fontSize: 12, color: '#8A93A8', marginTop: 24, paddingBottom: 120 }}>
          <a href="/conditions-utilisation" style={{ textDecoration: 'none', color: '#8A93A8' }}>Conditions d'utilisation</a>
          <a href="/politique-de-confidentialite" style={{ textDecoration: 'none', color: '#8A93A8' }}>Confidentialité</a>
          <a href="/mentions-legales" style={{ textDecoration: 'none', color: '#8A93A8' }}>Mentions légales</a>
        </div>
      </div>
    </div>
  );
}

export default PrivacyPolicyPage;