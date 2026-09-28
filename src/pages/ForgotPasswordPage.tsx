import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { LogoMark } from '../components/icons/LogoMark';
import { Button, IconButton } from '../components/ui';
import { supportWhatsAppUrl } from '../utils/support';

export function ForgotPasswordPage() {
  const whatsappHref = supportWhatsAppUrl(
    'Bonjour Monpermis, j\'ai oublié mon code de connexion. Mon numéro : ',
  );

  return (
    <div style={{ minHeight: '100dvh', background: '#EAEFF6', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -100, right: -100, width: 280, height: 280, borderRadius: '50%', background: 'rgba(11,170,79,0.12)', filter: 'blur(60px)', pointerEvents: 'none' }} />
      <div style={{ boxSizing: 'border-box', padding: '56px 22px 28px', maxWidth: 390, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
          <IconButton
            icon={({ size, color }) => (
              <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 6-6 6 6 6" />
              </svg>
            )}
            ariaLabel="Retour"
            onPress={() => window.history.back()}
          />
          <div style={{ width: 46, height: 46, borderRadius: 15, background: '#FFFFFF', boxShadow: '0 6px 18px -8px rgba(10,27,61,0.25)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LogoMark width={62} height={62} alt="Monpermis.bj" />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
          <h1 style={{ margin: 0, fontFamily: 'Sora, sans-serif', fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', color: '#0A1B3D' }}>
            Code oublié
          </h1>
          <p style={{ margin: 0, fontSize: 14.5, color: '#5B6680' }}>
            Contacte le support WhatsApp avec ton numéro pour réinitialiser ton code.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Button variant="primary" size="md" fullWidth leftIcon={<MessageCircle size={18} />}>
              Contacter le support WhatsApp
            </Button>
          </a>

          <Link to="/connexion" style={{ textAlign: 'center', fontSize: 14, color: '#5B6680', textDecoration: 'none' }}>
            Retour à la connexion
          </Link>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, fontSize: 12, color: '#8A93A8', marginTop: 24 }}>
            <Link to="/conditions-utilisation" style={{ textDecoration: 'none', color: '#8A93A8' }}>Conditions d'utilisation</Link>
            <Link to="/politique-de-confidentialite" style={{ textDecoration: 'none', color: '#8A93A8' }}>Confidentialité</Link>
            <Link to="/mentions-legales" style={{ textDecoration: 'none', color: '#8A93A8' }}>Mentions légales</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;