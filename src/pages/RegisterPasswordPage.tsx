import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { type FormEvent, useState } from 'react'
import { registerUser } from '../api/auth'
import { LogoMark } from '../components/icons/LogoMark'
import { Button, TextField, IconButton } from '../components/ui'
import { validatePassword } from '../utils/validation'

type RegisterDraft = {
  firstName: string
  lastName: string
  email: string
  phone?: string
}

export function RegisterPasswordPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const draft = (location.state as RegisterDraft | null) || null
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string; form?: string }>({})
  const [loading, setLoading] = useState(false)

  if (!draft?.firstName || !draft?.lastName || !draft?.email) {
    return <Navigate to="/inscription" replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const passwordError = validatePassword(password)
    const confirmPasswordError = !confirmPassword
      ? 'Confirme ton mot de passe'
      : confirmPassword !== password
        ? 'Les mots de passe ne correspondent pas'
        : undefined

    if (passwordError || confirmPasswordError) {
      setErrors({ password: passwordError, confirmPassword: confirmPasswordError })
      return
    }

    setErrors({})
    setLoading(true)
    try {
      const { message } = await registerUser({
        firstName: draft.firstName,
        lastName: draft.lastName,
        email: draft.email,
        phone: draft.phone || undefined,
        password,
      })
      navigate('/', {
        replace: true,
        state: {
          message: message || 'Compte créé. Vérifie ton email puis connecte-toi.',
        },
      })
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : 'Inscription impossible' })
    } finally {
      setLoading(false)
    }
  }

  if (!draft?.firstName || !draft?.lastName || !draft?.email) {
    return <Navigate to="/inscription" replace />
  }

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
            Mot de passe
          </h1>
          <p style={{ margin: 0, fontSize: 14.5, color: '#5B6680' }}>
            Choisis un mot de passe pour sécuriser ton compte.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {errors.form && (
            <div style={{ background: '#FFF1E6', border: '1px solid #F5C2C2', borderRadius: 12, padding: '12px 14px', color: '#C2410C', fontSize: 14, lineHeight: 1.45, marginBottom: 16 }} role="alert">
              {errors.form}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <TextField
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Ton mot de passe"
              autoComplete="new-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors({ ...errors, password: undefined }); }}
              error={errors.password}
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
              placeholder="Confirme ton mot de passe"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined }); }}
              error={errors.confirmPassword}
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

          <p style={{ fontSize: 12.5, color: '#5B6680', lineHeight: 1.5 }}>
            Min. 8 caractères, avec majuscule, minuscule et chiffre.
          </p>

          <Button variant="primary" size="md" fullWidth type="submit" loading={loading} disabled={loading} style={{ marginTop: 8 }}>
            {loading ? 'Inscription en cours…' : "S'inscrire"}
          </Button>

          <div style={{ textAlign: 'center', fontSize: 14, color: '#5B6680', marginTop: 24 }}>
            <Link to="/inscription" style={{ fontWeight: 800, textDecoration: 'none', color: '#067A37' }}>Retour</Link>
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

export default RegisterPasswordPage;