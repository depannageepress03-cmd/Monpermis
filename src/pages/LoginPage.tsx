import { Link, useLocation, useNavigate } from 'react-router-dom'
import { type FormEvent, useEffect, useState } from 'react'
import { ChevronLeft, Eye, EyeOff } from 'lucide-react'
import { getAuthErrorDetails, loginUser, saveSession, type AuthUser } from '../api/auth'
import { GoogleAuthButton } from '../components/GoogleAuthButton'
import { Button, IconButton, LogoTile, TextField } from '../components/ui'
import { validateEmail, validatePassword } from '../utils/validation'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const flashMessage = (location.state as { message?: string } | null)?.message

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [errors, setErrors] = useState<{
    email?: string
    password?: string
    form?: string
    info?: string
  }>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (flashMessage) {
      setErrors((prev) => ({ ...prev, info: flashMessage }))
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [flashMessage, location.pathname, navigate])

  const redirectAfterAuth = (user: AuthUser) => {
    if (!String(user.phone || '').trim()) {
      navigate('/profil', {
        replace: true,
        state: {
          phoneRequired:
            'Ajoute ton numéro de téléphone pour payer en Mobile Money et recevoir les rappels.',
        },
      })
      return
    }
    navigate('/accueil', { replace: true })
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    const emailError = validateEmail(email)
    const passwordError = validatePassword(password)

    if (emailError || passwordError) {
      setErrors({ email: emailError, password: passwordError })
      return
    }

    setErrors({})
    setLoading(true)

    try {
      const { user, token } = await loginUser({ email: email.trim(), password })
      saveSession(token, user, remember)
      redirectAfterAuth(user)
    } catch (error) {
      const { message } = getAuthErrorDetails(error)
      setErrors({ form: message })
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSuccess = (user: AuthUser, token: string) => {
    saveSession(token, user, true)
    redirectAfterAuth(user)
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#F5F7FB', position: 'relative', overflow: 'hidden' }}>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: -110,
          right: -110,
          width: 300,
          height: 300,
          borderRadius: '50%',
          background: 'rgba(11,170,79,0.12)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 240,
          left: -140,
          width: 280,
          height: 280,
          borderRadius: '50%',
          background: 'rgba(255,180,0,0.16)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />

      <form
        onSubmit={handleSubmit}
        noValidate
        style={{
          position: 'relative',
          boxSizing: 'border-box',
          padding: '56px 20px 32px',
          maxWidth: 390,
          margin: '0 auto',
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconButton
            icon={ChevronLeft}
            iconSize={22}
            ariaLabel="Retour"
            onPress={() => navigate('/bienvenue')}
          />
          <LogoTile />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--d-font-display)',
              fontSize: 30,
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: '#0A1B3D',
            }}
          >
            Content de te revoir
          </h1>
          <p style={{ margin: 0, fontSize: 14.5, fontWeight: 600, color: '#5B6680' }}>
            Connecte-toi pour reprendre ta préparation au permis.
          </p>
        </div>

        {errors.info && (
          <p
            style={{
              margin: 0,
              background: '#EAF7EF',
              border: '1.5px solid #0BAA4F',
              borderRadius: 18,
              padding: '12px 14px',
              color: '#065C2A',
              fontSize: 13.5,
              fontWeight: 600,
            }}
          >
            {errors.info}
          </p>
        )}
        {errors.form && (
          <p
            role="alert"
            style={{
              margin: 0,
              background: '#FFF1E6',
              border: '1.5px solid #C2410C',
              borderRadius: 18,
              padding: '12px 14px',
              color: '#9A3412',
              fontSize: 13.5,
              fontWeight: 600,
            }}
          >
            {errors.form}
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <TextField
            id="login-email"
            label="E-mail"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="aicha@exemple.bj"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }))
            }}
            error={errors.email}
          />

          <TextField
            id="login-password"
            label="Mot de passe"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Ton mot de passe"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }))
            }}
            error={errors.password}
            rightIcon={showPassword ? EyeOff : Eye}
            rightIconLabel={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            onRightIconClick={() => setShowPassword((value) => !value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              fontWeight: 600,
              color: '#3C4760',
              cursor: 'pointer',
              minHeight: 44,
            }}
          >
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: '#0BAA4F', margin: 0 }}
            />
            Rester connecté 7 jours
          </label>
          <Link
            to="/mot-de-passe-oublie"
            style={{ fontSize: 13, fontWeight: 700, textDecoration: 'none', color: '#067A37' }}
          >
            Mot de passe oublié ?
          </Link>
        </div>

        <Button type="submit" variant="primary" size="md" fullWidth loading={loading}>
          Se connecter
        </Button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#8A93A8', fontSize: 12.5, fontWeight: 700 }}>
          <span style={{ flex: 1, height: 1.5, background: '#E1E6EF' }} />
          ou
          <span style={{ flex: 1, height: 1.5, background: '#E1E6EF' }} />
        </div>

        <GoogleAuthButton
          text="continue_with"
          onSuccess={handleGoogleSuccess}
          onError={(message) => setErrors({ form: message })}
        />

        <p style={{ margin: 'auto 0 0', textAlign: 'center', fontSize: 14, fontWeight: 600, color: '#5B6680' }}>
          Pas encore de compte ?{' '}
          <Link to="/inscription" style={{ fontWeight: 800, textDecoration: 'none', color: '#067A37' }}>
            Créer un compte
          </Link>
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 18, flexWrap: 'wrap', fontSize: 12, fontWeight: 600 }}>
          <Link to="/conditions-utilisation" style={{ textDecoration: 'none', color: '#8A93A8' }}>
            Conditions d’utilisation
          </Link>
          <Link to="/politique-de-confidentialite" style={{ textDecoration: 'none', color: '#8A93A8' }}>
            Confidentialité
          </Link>
          <Link to="/mentions-legales" style={{ textDecoration: 'none', color: '#8A93A8' }}>
            Mentions légales
          </Link>
        </div>
      </form>
    </div>
  )
}

export default LoginPage
