import { Link, useSearchParams } from 'react-router-dom';
import { type FormEvent, useEffect, useState } from 'react';
import { resendVerificationEmail, verifyEmail } from '../api/auth-password';
import { LogoMark } from '../components/icons/LogoMark';
import { Button, TextField, IconButton } from '../components/ui';
import { validateEmail } from '../utils/validation';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [error, setError] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('Lien invalide ou expiré.');
      return;
    }

    let cancelled = false;
    verifyEmail(token)
      .then(() => {
        if (!cancelled) setStatus('ok');
      })
      .catch((err) => {
        if (!cancelled) {
          setStatus('error');
          setError(err instanceof Error ? err.message : 'Vérification impossible');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleResend = async (e: FormEvent) => {
    e.preventDefault();
    const emailError = validateEmail(resendEmail);
    if (emailError) {
      setResendMsg(emailError);
      return;
    }
    setResending(true);
    setResendMsg('');
    try {
      await resendVerificationEmail(resendEmail.trim());
      setResendMsg('Si un compte non vérifié existe, un nouveau lien a été envoyé.');
    } catch (err) {
      setResendMsg(err instanceof Error ? err.message : 'Envoi impossible');
    } finally {
      setResending(false);
    }
  };

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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6, textAlign: 'center' }}>
          <h1 style={{ margin: 0, fontFamily: 'Sora, sans-serif', fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', color: '#0A1B3D' }}>
            Vérification
          </h1>
          <p style={{ margin: 0, fontSize: 14.5, color: '#5B6680' }}>
            Dernière étape avant de prendre la route.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', textAlign: 'center', marginTop: 24 }}>
          {status === 'loading' && (
            <p style={{ color: '#5B6680', fontWeight: 600 }}>Vérification en cours…</p>
          )}

          {status === 'ok' && (
            <>
              <div style={{ background: '#EAF7EF', border: '1px solid #B8E5D0', borderRadius: 12, padding: '12px 14px', color: '#067A37', fontSize: 14, lineHeight: 1.45, fontWeight: 700, marginBottom: 12 }}>
                Email vérifié avec succès !
              </div>
              <Link to="/connexion" style={{ color: '#067A37', fontWeight: 800, textDecoration: 'none', display: 'inline-block' }}>
                Se connecter
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div style={{ background: '#FFF1E6', border: '1px solid #F5C2C2', borderRadius: 12, padding: '12px 14px', color: '#C2410C', fontSize: 14, lineHeight: 1.45, fontWeight: 700, marginBottom: 16, maxWidth: 360 }}>
                {error}
              </div>
              <form onSubmit={handleResend} style={{ maxWidth: 360, width: '100%', textAlign: 'left' }}>
                <p style={{ color: '#5B6680', fontSize: 14, marginBottom: 8 }}>
                  Lien expiré ? Renseigne ton email pour recevoir un nouveau lien.
                </p>
                <TextField
                  type="email"
                  placeholder="Adresse email"
                  value={resendEmail}
                  onChange={(e) => { setResendEmail(e.target.value); if (resendMsg) setResendMsg(''); }}
                  style={{ marginBottom: 8 }}
                />
                {resendMsg && (
                  <p style={{ color: '#0A1B3D', fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{resendMsg}</p>
                )}
                <Button variant="primary" size="md" fullWidth type="submit" loading={resending} disabled={resending} style={{ marginTop: 8 }}>
                  {resending ? 'Envoi…' : 'Renvoyer le lien'}
                </Button>
              </form>
              <Link to="/connexion" style={{ color: '#067A37', fontWeight: 700, textDecoration: 'none', display: 'inline-block', marginTop: 16 }}>
                Retour à la connexion
              </Link>
            </>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, fontSize: 12, color: '#8A93A8', marginTop: 24 }}>
          <Link to="/conditions-utilisation" style={{ textDecoration: 'none', color: '#8A93A8' }}>Conditions d'utilisation</Link>
          <Link to="/politique-de-confidentialite" style={{ textDecoration: 'none', color: '#8A93A8' }}>Confidentialité</Link>
          <Link to="/mentions-legales" style={{ textDecoration: 'none', color: '#8A93A8' }}>Mentions légales</Link>
        </div>
      </div>
    </div>
  );
}

export default VerifyEmailPage;