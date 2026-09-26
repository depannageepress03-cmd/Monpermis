import { Link, useNavigate } from 'react-router-dom';
import { type FormEvent, useState } from 'react';
import { saveSession, type AuthUser } from '../api/auth';
import { GoogleAuthButton } from '../components/GoogleAuthButton';
import { LogoMark } from '../components/icons/LogoMark';
import { Button, TextField, IconButton } from '../components/ui';
import { normalizePhone, validateEmail, validateName, validatePhone } from '../utils/validation';

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  terms?: string;
  form?: string;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  // Compte créé par email ; le téléphone reste optionnel (rappels, Mobile Money).
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const newErrors: FormErrors = {
      firstName: validateName(firstName, 'Le prénom'),
      lastName: validateName(lastName, 'Le nom'),
      email: validateEmail(email),
      phone: phone.trim() ? validatePhone(phone) : undefined,
      terms: !acceptTerms ? 'Vous devez accepter les conditions' : undefined,
    };
    if (Object.values(newErrors).some(Boolean)) {
      setErrors(newErrors);
      return;
    }
    navigate('/inscription/mot-de-passe', {
      state: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() ? normalizePhone(phone) : '',
      },
    });
  };

  const handleGoogleSuccess = (user: AuthUser, token: string) => {
    saveSession(token, user, true);
    if (!String(user.phone || '').trim()) {
      navigate('/profil', {
        replace: true,
        state: {
          phoneRequired:
            'Ajoute ton numéro de téléphone pour payer en Mobile Money et recevoir les rappels.',
        },
      });
      return;
    }
    navigate('/accueil', { replace: true });
  };

  return (
    <div style={{ minHeight: '100dvh', background: '#F5F7FB', position: 'relative', overflow: 'hidden' }}>
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
            onPress={() => navigate(-1)}
          />
          <div style={{ width: 46, height: 46, borderRadius: 15, background: '#FFFFFF', boxShadow: '0 6px 18px -8px rgba(10,27,61,0.25)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LogoMark width={62} height={62} alt="Monpermis.bj" />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
          <h1 style={{ margin: 0, fontFamily: 'Sora, sans-serif', fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', color: '#0A1B3D' }}>
            Crée ton compte
          </h1>
          <p style={{ margin: 0, fontSize: 14.5, color: '#5B6680' }}>
            Quelques infos et tu démarres ta préparation au permis.
          </p>
        </div>

        <GoogleAuthButton
          onSuccess={handleGoogleSuccess}
          onError={(message) => setErrors({ form: message })}
        />

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#8A93A8', fontSize: 12.5, fontWeight: 600 }}>
            <div style={{ flexGrow: 1, height: 1, background: '#E1E6EF' }} />
            ou avec ton e-mail
            <div style={{ flexGrow: 1, height: 1, background: '#E1E6EF' }} />
          </div>

        <form onSubmit={handleSubmit} noValidate>
          {errors.form && (
            <div style={{ background: '#FFF1E6', border: '1px solid #F5C2C2', borderRadius: 12, padding: '12px 14px', color: '#C2410C', fontSize: 14, lineHeight: 1.45, marginBottom: 16 }} role="alert">
              {errors.form}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <TextField
                label="Prénom"
                id="firstName"
                placeholder="Prénom"
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => { setFirstName(e.target.value); if (errors.firstName) setErrors({ ...errors, firstName: undefined }); }}
                error={errors.firstName}
                style={{ flex: 1 }}
              />
              <TextField
                label="Nom"
                id="lastName"
                placeholder="Nom"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => { setLastName(e.target.value); if (errors.lastName) setErrors({ ...errors, lastName: undefined }); }}
                error={errors.lastName}
                style={{ flex: 1 }}
              />
            </div>

            <TextField
              label="E-mail"
              id="email"
              type="email"
              inputMode="email"
              placeholder="aicha@exemple.bj"
              autoComplete="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors({ ...errors, email: undefined }); }}
              error={errors.email}
            />

            <TextField
              label="Téléphone (optionnel)"
              id="phone"
              type="tel"
              inputMode="tel"
              placeholder="0147880143"
              autoComplete="tel"
              value={phone}
              onChange={(e) => { setPhone(normalizePhone(e.target.value)); if (errors.phone) setErrors({ ...errors, phone: undefined }); }}
              error={errors.phone}
              prefix={
                <span style={{ height: 40, padding: '0 12px', borderRadius: 20, background: '#F1F4F9', display: 'flex', alignItems: 'center', fontSize: 14, fontWeight: 700, color: '#0A1B3D' }}>
                  +229
                </span>
              }
            />

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, fontWeight: 600, color: '#3C4760', cursor: 'pointer' }}>
              <input type="checkbox" checked={acceptTerms} onChange={(e) => { setAcceptTerms(e.target.checked); if (errors.terms) setErrors({ ...errors, terms: undefined }); }} style={{ width: 18, height: 18, accentColor: '#0BAA4F', margin: 0, marginTop: 2, flexShrink: 0 }} />
              <span>
                J'accepte les <Link to="/conditions-utilisation" target="_blank" rel="noopener noreferrer" style={{ color: '#067A37', textDecoration: 'underline' }}>conditions d'utilisation</Link>
              </span>
            </label>
            {errors.terms && <span style={{ fontSize: 12.5, fontWeight: 600, color: '#C2410C' }}>{errors.terms}</span>}
          </div>

          <Button variant="primary" size="md" fullWidth type="submit" style={{ marginTop: 8 }}>
            Continuer
          </Button>

          <div style={{ textAlign: 'center', fontSize: 14, color: '#5B6680', marginTop: 24 }}>
            Déjà inscrit ? <Link to="/connexion" style={{ fontWeight: 800, textDecoration: 'none', color: '#067A37' }}>Se connecter</Link>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, fontSize: 12, color: '#8A93A8', marginTop: 24 }}>
            <Link to="/conditions-utilisation" style={{ textDecoration: 'none', color: '#8A93A8' }}>Conditions d'utilisation</Link>
            <Link to="/politique-de-confidentialite" style={{ textDecoration: 'none', color: '#8A93A8' }}>Confidentialité</Link>
            <Link to="/mentions-legales" style={{ textDecoration: 'none', color: '#8A93A8' }}>Mentions légales</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RegisterPage;