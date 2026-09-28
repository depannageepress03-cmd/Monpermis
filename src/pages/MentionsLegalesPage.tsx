import type { CSSProperties } from 'react';
import { Scale, ChevronLeft } from 'lucide-react';
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
    title: '1. Éditeur du service',
    paragraphs: [
      'Le service Monpermis.bj est édité et exploité dans le cadre de l\'activité de formation à la conduite automobile au Bénin.',
      'Application mobile et site web : Monpermis.bj (marque commerciale).',
      'Contact : noreply@monpermis.bj (demandes générales via le support indiqué dans l\'application).',
    ],
  },
  {
    title: '2. Directeur de la publication',
    paragraphs: [
      'Le directeur de la publication est le responsable de l\'édition de Monpermis.bj.',
    ],
  },
  {
    title: '3. Hébergement',
    paragraphs: [
      'Le site et l\'API sont hébergés par Render Services, Inc. (render.com).',
      'L\'application est accessible via le site web et disponible sur le store Android.',
    ],
  },
  {
    title: '4. Propriété intellectuelle',
    paragraphs: [
      'L\'ensemble des éléments de Monpermis.bj (textes, graphismes, logo, interfaces, contenus pédagogiques) est protégé. Toute reproduction non autorisée est interdite.',
    ],
  },
  {
    title: '5. Données personnelles',
    paragraphs: [
      'Le traitement des données personnelles est décrit dans la Politique de confidentialité accessible depuis l\'application et le site.',
    ],
  },
  {
    title: '6. Responsabilité',
    paragraphs: [
      'Monpermis.bj fournit un accompagnement pédagogique à la préparation du permis. L\'éditeur ne peut être tenu responsable d\'une utilisation non conforme du service ni des décisions administratives liées à l\'examen du permis.',
    ],
  },
] as const;

export function MentionsLegalesPage() {
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
            Mentions légales
          </h1>
          <div style={{ width: 46 }} />
        </div>

        <div style={{ fontSize: 13.5, color: '#5B6680', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
          <Scale size={16} aria-hidden="true" />
          Dernière mise à jour : juillet 2026
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 720, margin: '0 auto', padding: '0 20px' }}>
          {SECTIONS.map((section) => (
            <section key={section.title} style={{ background: '#FFFFFF', borderRadius: 24, padding: '20px', boxShadow: '0 10px 30px -18px rgba(10,27,61,0.3)' }}>
              <h2 style={{ fontFamily: 'Sora, sans-serif', fontSize: 18, fontWeight: 700, marginBottom: 12, color: '#0A1B3D' }}>{section.title}</h2>
              {section.paragraphs.map((paragraph) => (
                <ParagraphWithBrand key={paragraph} text={paragraph} style={{ color: '#0A1B3D', lineHeight: 1.6, marginBottom: 8 }} />
              ))}
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

export default MentionsLegalesPage;