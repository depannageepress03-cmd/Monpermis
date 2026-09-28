import { FormEvent, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { isAuthError, useAdminAuth } from '../context/AdminAuthContext';
import { normalizePhone, PHONE_PLACEHOLDER } from '../utils/validation';
import { LogoMark } from '../components/icons/LogoMark';
import { Button, TextField, IconButton } from '../../../src/components/ui';

export function LoginPage() {
  const { admin, loading, signIn, canManageAdmins } = useAdminAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  const homePath = useMemo(
    () => (canManageAdmins || admin?.role === 'superadmin' ? '/cockpit' : '/'),
    [admin?.role, canManageAdmins],
  );

  if (!loading && admin) {
    return <Navigate to={homePath} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(undefined);
    setSubmitting(true);

    try {
      const result = await signIn(normalizePhone(phone), password);
      navigate(result.homePath || '/', { replace: true });
    } catch (err) {
      if (isAuthError(err)) {
        setError(err.message);
      } else {
        setError('Connexion impossible. Vérifiez votre connexion réseau.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#EAEFF6', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -100, right: -100, width: 280, height: 280, borderRadius: '50%', background: 'rgba(11,170,79,0.12)', filter: 'blur(60px)', pointerEvents: 'none' }} />
      <div style={{ boxSizing: 'border-box', padding: '56px 22px 28px', maxWidth: 390, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
          <IconButton
            icon={({ size, color }: { size: number; color: string }) => (
              <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 6-6 6 6 6" />
              </svg>
            )}
            aria-label="Retour"
            onPress={() => window.history.back()}
          />
          <div style={{ width: 46, height: 46, borderRadius: 15, background: '#FFFFFF', boxShadow: '0 6px 18px -8px rgba(10,27,61,0.25)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LogoMark width={62} height={62} alt="Monpermis.bj" />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
          <h1 style={{ margin: 0, fontFamily: 'Sora, sans-serif', fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', color: '#0A1B3D' }}>
            Content de te revoir
          </h1>
          <p style={{ margin: 0, fontSize: 14.5, color: '#5B6680' }}>
            Connecte-toi pour reprendre la gestion.
          </p>
        </div>

        <div style={{ height: 52, boxSizing: 'border-box', padding: 5, borderRadius: 26, background: '#E8EDF6', display: 'flex', gap: 4 }}>
          <button type="button" style={{ flexGrow: 1, flexBasis: 0, border: 0, borderRadius: 21, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, cursor: 'pointer', background: '#FFFFFF', color: '#0A1B3D', boxShadow: '0 4px 12px -4px rgba(10,27,61,0.25)' }}>
            Téléphone
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {error && (
            <div style={{ background: '#FFF1E6', border: '1px solid #F5C2C2', borderRadius: 12, padding: '12px 14px', color: '#C2410C', fontSize: 14, lineHeight: 1.45, marginBottom: 16 }} role="alert">
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <TextField
              id="phone"
              type="tel"
              placeholder={PHONE_PLACEHOLDER}
              value={phone}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setPhone(normalizePhone(e.target.value)); if (error) setError(''); }}
              error={error}
              prefix={<span style={{ height: 40, padding: '0 12px', borderRadius: 20, background: '#F1F4F9', display: 'flex', alignItems: 'center', fontSize: 14, fontWeight: 700 }}>+229</span>}
              leftIcon={Mail}
            />

            <TextField
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setPassword(e.target.value); if (error) setError(''); }}
              error={error}
              leftIcon={LockKeyhole}
              rightIcon={showPassword ? EyeOff : Eye}
              onRightIconClick={() => setShowPassword(!showPassword)}
            />
          </div>

          <Button
            variant="primary"
            size="md"
            fullWidth
            loading={submitting}
            rightIcon={UserRound}
            onClick={handleSubmit}
          >
            Se connecter
          </Button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#8A93A8', fontSize: 12.5, fontWeight: 600, marginTop: 8 }}>
            <div style={{ flexGrow: 1, height: 1, background: '#E1E6EF' }} />
            ou
            <div style={{ flexGrow: 1, height: 1, background: '#E1E6EF' }} />
          </div>
        </form>

        <div style={{ marginTop: 'auto', textAlign: 'center', fontSize: 14, color: '#5B6680' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, fontSize: 12, color: '#8A93A8', marginTop: 24 }}>
            <a href="/conditions-utilisation" style={{ textDecoration: 'none', color: '#8A93A8' }}>Conditions d'utilisation</a>
            <a href="/politique-de-confidentialite" style={{ textDecoration: 'none', color: '#8A93A8' }}>Confidentialité</a>
            <a href="/mentions-legales" style={{ textDecoration: 'none', color: '#8A93A8' }}>Mentions légales</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;