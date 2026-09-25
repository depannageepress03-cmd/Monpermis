import { useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, Car, Smartphone } from 'lucide-react';
import { markOnboardingDone } from '../utils/onboarding';
import { LogoMark } from '../components/icons/LogoMark';
import { Button, Chip } from '../components/ui';

export function OnboardingPage() {
  const navigate = useNavigate();

  const finish = () => {
    markOnboardingDone();
    navigate('/connexion', { replace: true });
  };

  return (
    <div style={{ minHeight: '100dvh', background: '#FFFFFF', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -90, left: -80, width: 260, height: 260, borderRadius: '50%', background: 'rgba(11,170,79,0.14)', filter: 'blur(50px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 40, right: -90, width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,180,0,0.16)', filter: 'blur(55px)', pointerEvents: 'none' }} />

      <div style={{ position: 'absolute', top: 72, left: 0, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, maxWidth: 390, margin: '0 auto', padding: '0 20px' }}>
        <div style={{ width: 196, height: 196, borderRadius: 48, background: '#FFFFFF', boxShadow: '0 30px 60px -28px rgba(10,27,61,0.35), 0 0 0 1px #EEF1F6', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LogoMark width={265} height={265} alt="Logo Monpermis.bj" />
        </div>
        <div style={{ marginTop: 22, fontFamily: 'Sora, sans-serif', fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', color: '#0A1B3D' }}>
          Monpermis<span style={{ color: '#0BAA4F' }}>.bj</span>
        </div>
        <div style={{ fontSize: 15, color: '#5B6680', fontWeight: 500 }}>Le code et la conduite, au même endroit.</div>
        <div style={{ marginTop: 18, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', padding: '0 24px' }}>
          <Chip variant="green" size="sm">
            <BookOpen size={15} strokeWidth={2.2} />
            QCM & examens blancs
          </Chip>
          <Chip variant="yellow" size="sm">
            <Car size={15} strokeWidth={2.2} />
            Leçons de conduite
          </Chip>
          <Chip variant="navy" size="sm">
            <Smartphone size={15} strokeWidth={2.2} />
            Mobile Money
          </Chip>
        </div>
      </div>

      <div style={{ position: 'absolute', left: 0, bottom: 0, width: '100%', maxWidth: 390, margin: '0 auto', height: 336, boxSizing: 'border-box', padding: '34px 24px 34px', borderRadius: '40px 40px 0 0', background: 'radial-gradient(120% 90% at 100% 0%, rgba(11,170,79,0.38) 0%, rgba(11,170,79,0) 55%), linear-gradient(165deg, #16306A 0%, #0A1B3D 55%, #06122A 100%)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.16)', display: 'flex', flexDirection: 'column', gap: 14, color: '#FFFFFF', overflow: 'hidden' }}>
        <svg width="220" height="220" viewBox="0 0 220 220" fill="none" style={{ position: 'absolute', right: -40, top: -20, opacity: 0.18, pointerEvents: 'none' }}>
          <path d="M60 220 L190 20H220L110 220Z" fill="white" />
          <path d="M150 60L140 76M128 96L118 112M106 132L96 148M84 168L74 184" stroke="#FFB400" strokeWidth="6" strokeLinecap="round" />
        </svg>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ width: 22, height: 6, borderRadius: 3, background: '#FFB400' }} />
          <div style={{ width: 6, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.35)' }} />
          <div style={{ width: 6, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.35)' }} />
        </div>
        <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 30, lineHeight: 1.12, fontWeight: 700, letterSpacing: '-0.02em' }}>
          Ton permis,<br />étape par étape.
        </div>
        <div style={{ fontSize: 14.5, lineHeight: 1.5, color: 'rgba(255,255,255,0.78)' }}>
          Révise le code, passe des examens blancs et réserve tes heures de conduite avec ton moniteur.
        </div>
        <Button variant="slider" size="md" fullWidth onClick={finish}>
          <span>Commencer</span>
          <ArrowRight size={20} strokeWidth={2.2} />
        </Button>
        <div style={{ textAlign: 'center', fontSize: 14, color: 'rgba(255,255,255,0.75)' }}>
          Déjà inscrit ? <button type="button" onClick={finish} style={{ fontWeight: 800, textDecoration: 'none', color: '#FFFFFF', background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}>Se connecter</button>
        </div>
      </div>
    </div>
  );
}

export default OnboardingPage;