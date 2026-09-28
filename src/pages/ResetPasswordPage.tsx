import { Link, useSearchParams } from 'react-router-dom';
import { type FormEvent, useState } from 'react';
import { resetPassword } from '../api/auth-password';
import { LogoMark } from '../components/icons/LogoMark';
import { Button, TextField, IconButton } from '../components/ui';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const validatePassword = (pwd: string) => {
    if (pwd.length < 8) return 'Minimum 8 caractères';
    if (!/[A-Z]/.test(pwd) || !/[a-z]/.test(pwd) || !/\d/.test(pwd)) return 'Doit contenir majuscule, minuscule et chiffre';
    return '';
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const pwdError = validatePassword(password);
    if (pwdError) {
      setError(pwdError);
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (!token) {
      setError('Token invalide');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la réinitialisation');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
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
              Lien invalide
            </h1>
            <p style={{ margin: 0, fontSize: 14.5, color: '#5B6680' }}>
              Ce lien est invalide ou a expiré.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 24 }}>
            <Link to="/mot-de-passe-oublie" style={{ textAlign: 'center', fontSize: 14, color: '#067A37', fontWeight: 800, textDecoration: 'underline' }}>
              Contacter le support
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
            Nouveau mot de passe
          </h1>
          <p style={{ margin: 0, fontSize: 14.5, color: '#5B6680' }}>
            Choisis un mot de passe sécurisé pour ton compte.
          </p>
        </div>

        {done ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 24 }}>
            <div style={{ background: '#EAF7EF', border: '1px solid #B8E5D0', borderRadius: 12, padding: '12px 14px', color: '#067A37', fontSize: 14, lineHeight: 1.45 }} role="alert">
              Mot de passe réinitialisé !
            </div>
            <Link to="/connexion" style={{ textAlign: 'center', fontSize: 14, color: '#067A37', fontWeight: 800, textDecoration: 'none' }}>
              Se connecter
            </Link>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, fontSize: 12, color: '#8A93A8', marginTop: 24 }}>
              <Link to="/conditions-utilisation" style={{ textDecoration: 'none', color: '#8A93A8' }}>Conditions d'utilisation</Link>
              <Link to="/politique-de-confidentialite" style={{ textDecoration: 'none', color: '#8A93A8' }}>Confidentialité</Link>
              <Link to="/mentions-legales" style={{ textDecoration: 'none', color: '#8A93A8' }}>Mentions légales</Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            {error && (
              <div style={{ background: '#FFF1E6', border: '1px solid #F5C2C2', borderRadius: 12, padding: '12px 14px', color: '#C2410C', fontSize: 14, lineHeight: 1.45, marginBottom: 16 }} role="alert">
                {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <TextField
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Nouveau mot de passe"
                autoComplete="new-password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); if (error) setError(''); }}
                error={error}
                leftIcon={({ size, color }) => (
                  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
                    <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
                  </svg>
                )}
                rightIcon={({ size, color }) => (
                  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
                onRightIconClick={() => setShowPassword(!showPassword)}
              />

              <TextField
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirmer le mot de passe"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); if (error) setError(''); }}
                error={error}
                leftIcon={({ size, color }) => (
                  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
                    <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
                  </svg>
                )}
                rightIcon={({ size, color }) => (
                  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
                onRightIconClick={() => setShowConfirmPassword(!showConfirmPassword)}
              />
            </div>

            <Button variant="primary" size="md" fullWidth type="submit" loading={loading} disabled={loading} style={{ marginTop: 8 }}>
              {loading ? 'Réinitialisation…' : 'Réinitialiser'}
            </Button>

            <Link to="/connexion" style={{ textAlign: 'center', fontSize: 14, color: '#067A37', fontWeight: 800, textDecoration: 'none', display: 'block', marginTop: 24 }}>
              Retour à la connexion
            </Link>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, fontSize: 12, color: '#8A93A8', marginTop: 24 }}>
              <Link to="/conditions-utilisation" style={{ textDecoration: 'none', color: '#8A93A8' }}>Conditions d'utilisation</Link>
              <Link to="/politique-de-confidentialite" style={{ textDecoration: 'none', color: '#8A93A8' }}>Confidentialité</Link>
              <Link to="/mentions-legales" style={{ textDecoration: 'none', color: '#8A93A8' }}>Mentions légales</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ResetPasswordPage;