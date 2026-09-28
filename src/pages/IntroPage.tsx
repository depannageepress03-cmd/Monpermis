import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStoredUser } from '../hooks/useAuth';
import { hasCompletedOnboarding } from '../utils/onboarding';
import { Link } from 'react-router-dom';
import { LogoMark } from '../components/icons/LogoMark';
;
import { Chip } from '../components/ui/Chip';

export function IntroPage() {
  const navigate = useNavigate();
  const doneRef = useRef(false);
  const user = getStoredUser();
  const [activeStep, setActiveStep] = useState(0);

  const goNext = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    if (user) {
      navigate('/accueil', { replace: true });
      return;
    }
    navigate(hasCompletedOnboarding() ? '/' : '/bienvenue', { replace: true });
  }, [navigate, user]);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(goNext, 5500);
    return () => clearTimeout(timeout);
  }, [goNext]);

  return (
    <div style={{ minHeight: '100dvh', background: '#FFFFFF', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -90, left: -80, width: 260, height: 260, borderRadius: '50%', background: 'rgba(11,170,79,0.14)', filter: 'blur(50px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 40, right: -90, width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,180,0,0.16)', filter: 'blur(55px)', pointerEvents: 'none' }} />

      <div style={{ position: 'absolute', top: 72, left: 0, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 196, height: 196, borderRadius: 48, background: '#FFFFFF', boxShadow: '0 30px 60px -28px rgba(10,27,61,0.35), 0 0 0 1px #EEF1F6', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <LogoMark width={250} height={250} alt="Logo Monpermis.bj" />
        </div>
        <div style={{ marginTop: 22, fontFamily: 'Sora, sans-serif', fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', color: '#0A1B3D' }}>
          Monpermis<span style={{ color: '#0BAA4F' }}>.bj</span>
        </div>
        <div style={{ fontSize: 15, color: '#5B6680', fontWeight: 500 }}>Le code et la conduite, au même endroit.</div>
        <div style={{ marginTop: 18, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', padding: '0 24px' }}>
          <Chip variant="green" size="sm">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5 10 17l9-10" /></svg>
            QCM & examens blancs
          </Chip>
          <Chip variant="yellow" size="sm">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="2.2" /><path d="M3.8 10.8h6M14.2 10.8h6M12 14.2v6.2" /></svg>
            Leçons de conduite
          </Chip>
          <Chip variant="navy" size="sm">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="3" width="12" height="18" rx="3" /><path d="M11 17.5h2" /></svg>
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
          <div style={{ width: 22, height: 6, borderRadius: 3, background: activeStep === 0 ? '#FFB400' : 'rgba(255,255,255,0.35)', transition: 'background 0.3s ease' }} />
          <div style={{ width: 6, height: 6, borderRadius: 3, background: activeStep === 1 ? '#FFB400' : 'rgba(255,255,255,0.35)', transition: 'background 0.3s ease' }} />
          <div style={{ width: 6, height: 6, borderRadius: 3, background: activeStep === 2 ? '#FFB400' : 'rgba(255,255,255,0.35)', transition: 'background 0.3s ease' }} />
        </div>
        <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 30, lineHeight: 1.12, fontWeight: 700, letterSpacing: '-0.02em' }}>
          Ton permis,<br />étape par étape.
        </div>
        <div style={{ fontSize: 14.5, lineHeight: 1.5, color: 'rgba(255,255,255,0.78)' }}>
          Révise le code, passe des examens blancs et réserve tes heures de conduite avec ton moniteur.
        </div>
        <Link to="/connexion" style={{ marginTop: 8, height: 60, borderRadius: 30, background: '#FFB400', color: '#0A1B3D', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 6px 0 26px', fontSize: 16, fontWeight: 800, textDecoration: 'none', boxShadow: '0 16px 30px -12px rgba(255,180,0,0.6)' }}>
          <span>Commencer</span>
          <span style={{ width: 48, height: 48, borderRadius: 24, background: '#0A1B3D', color: '#FFB400', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </span>
        </Link>
        <div style={{ textAlign: 'center', fontSize: 14, color: 'rgba(255,255,255,0.75)' }}>
          Déjà inscrit ? <Link to="/connexion" style={{ fontWeight: 800, textDecoration: 'none', color: '#FFFFFF' }}>Se connecter</Link>
        </div>
      </div>
    </div>
  );
}