import type { CSSProperties } from 'react';
import { FileText, ChevronLeft } from 'lucide-react';
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
    paragraphs: ['L\'utilisateur s\'engage à ne pas :'],
    bullets: [
      'utiliser le service à des fins illégales ou frauduleuses ;',
      'tenter d\'accéder de manière non autorisée aux systèmes ou données ;',
      'copier, redistribuer ou vendre les contenus sans autorisation ;',
      'publier ou transmettre des contenus nuisibles, diffamatoires ou contraires à la loi ;',
      'usurper l\'identité d\'un tiers ou créer de faux comptes.',
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
] as const;

export function TermsOfUsePage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100dvh', background: '#F5F7FB', position: 'relative', overflow: 'hidden' }}>
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
            Conditions d'utilisation
          </h1>
          <div style={{ width: 46 }} />
        </div>

        <div style={{ fontSize: 13.5, color: '#5B6680', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
          <FileText size={16} aria-hidden="true" />
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

export default TermsOfUsePage;