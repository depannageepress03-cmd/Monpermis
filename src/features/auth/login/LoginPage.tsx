import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent, type FocusEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock3, LockKeyhole, Mail, Phone } from 'lucide-react'
import { getAuthErrorDetails, loginUser, saveSession, type AuthUser } from '../../../api/auth'
import { GoogleAuthButton } from '../../../components/GoogleAuthButton'
import { GoogleIcon } from '../../../components/icons/GoogleIcon'
import { normalizePhone, validateEmail, validateLoginIdentifier, validatePassword } from '../../../utils/validation'
import { LoginScene } from './scene/LoginScene'
import { AuthField } from './ui/AuthField'
import { GlassCard } from './ui/GlassCard'
import { LoginSheet } from './ui/LoginSheet'
import { SegmentedChoice } from './ui/SegmentedChoice'
import { TrafficLight } from './ui/TrafficLight'
import { useLoginPhase, type LoginLayout, type LoginMethod, type LoginPhase } from './useLoginPhase'
import './login.css'

interface LoginErrors {
  identifier?: string
  password?: string
  form?: string
  info?: string
}

function initialLayout(): LoginLayout {
  if (typeof window === 'undefined' || !window.matchMedia('(min-width: 1024px)').matches) return 'compact'
  return window.matchMedia('(min-width: 1280px)').matches ? 'desktop-xl' : 'desktop-lg'
}

function formatPhone(value: string) {
  const digits = normalizePhone(value)
  return digits.match(/.{1,2}/g)?.join(' ') ?? ''
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = location.state as { message?: string } | null
  const flashMessage = locationState?.message
  const pageRef = useRef<HTMLElement>(null)
  const cardRef = useRef<HTMLFormElement>(null)
  const identifierRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const submitLock = useRef(false)
  const [layout, setLayout] = useState<LoginLayout>(initialLayout)
  const [method, setMethod] = useState<LoginMethod>('email')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [remember, setRemember] = useState(true)
  const [errors, setErrors] = useState<LoginErrors>({})
  const [touched, setTouched] = useState({ identifier: false, password: false })
  const [forcedPhase, setForcedPhase] = useState<LoginPhase | null>(null)
  const [started, setStarted] = useState(false)
  const [sessionExpired, setSessionExpired] = useState(false)
  const { identifierValid, passwordValid, step, phase, positionPhase, light, copy, compactCopy } =
    useLoginPhase(identifier, password, method, forcedPhase)

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)')
    const extraLarge = window.matchMedia('(min-width: 1280px)')
    const updateLayout = () => {
      setLayout(desktop.matches ? (extraLarge.matches ? 'desktop-xl' : 'desktop-lg') : 'compact')
    }
    desktop.addEventListener('change', updateLayout)
    extraLarge.addEventListener('change', updateLayout)
    updateLayout()
    return () => {
      desktop.removeEventListener('change', updateLayout)
      extraLarge.removeEventListener('change', updateLayout)
    }
  }, [])

  useEffect(() => {
    const frame = requestAnimationFrame(() => setStarted(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    if (!flashMessage) return
    setSessionExpired(/session expirée/i.test(flashMessage))
    setErrors((current) => ({ ...current, info: flashMessage }))
    navigate(location.pathname, { replace: true, state: null })
  }, [flashMessage, location.pathname, navigate])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const emailValue = document.getElementById('login-identifier') as HTMLInputElement | null
      const passwordValue = passwordRef.current
      if (emailValue?.value && !identifier) setIdentifier(emailValue.value)
      if (passwordValue?.value && !password) setPassword(passwordValue.value)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [identifier, password])

  const redirectAfterAuth = useCallback((user: AuthUser) => {
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
  }, [navigate])

  const clearFormError = () => {
    setErrors((current) => ({ ...current, form: undefined, identifier: undefined, password: undefined }))
    setSessionExpired(false)
    setForcedPhase(null)
  }

  const handleMethodChange = (next: LoginMethod) => {
    if (next === method) return
    setMethod(next)
    setIdentifier('')
    setPassword('')
    setTouched({ identifier: false, password: false })
    setErrors({})
    setSessionExpired(false)
    setForcedPhase(null)
  }

  const identifierError = (value: string) =>
    method === 'email' ? validateEmail(value) : validateLoginIdentifier(normalizePhone(value))
  const passwordError = (value: string) => validatePassword(value)

  const handleIdentifierChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = method === 'phone' ? formatPhone(event.target.value) : event.target.value
    setIdentifier(value)
    clearFormError()
  }

  const handlePasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value)
    clearFormError()
  }

  const handleIdentifierBlur = (event: FocusEvent<HTMLInputElement>) => {
    setTouched((current) => ({ ...current, identifier: true }))
    const error = identifierError(event.currentTarget.value)
    setErrors((current) => ({ ...current, identifier: error }))
  }

  const handlePasswordBlur = (event: FocusEvent<HTMLInputElement>) => {
    setTouched((current) => ({ ...current, password: true }))
    const error = passwordError(event.currentTarget.value)
    setErrors((current) => ({ ...current, password: error }))
  }

  const handleAutoFill = (event: React.AnimationEvent<HTMLInputElement>) => {
    if (event.animationName !== 'onAutoFill') return
    if (event.currentTarget.id === 'login-identifier') {
      setIdentifier(event.currentTarget.value)
    } else if (event.currentTarget.id === 'login-password') {
      setPassword(event.currentTarget.value)
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitLock.current || phase === 'success') return
    submitLock.current = true
    const currentIdentifierError = identifierError(identifier)
    const currentPasswordError = passwordError(password)

    if (step < 2 || currentIdentifierError || currentPasswordError) {
      setForcedPhase('error')
      setTouched({ identifier: true, password: true })
      setErrors({
        identifier: currentIdentifierError,
        password: currentPasswordError,
        form: !identifier.trim()
          ? method === 'email'
            ? 'Remplis ton e-mail et ton mot de passe pour te connecter.'
            : 'Remplis ton numéro et ton mot de passe pour te connecter.'
          : !password
            ? 'Remplis ton mot de passe pour te connecter.'
            : undefined,
      })
      window.setTimeout(() => {
        if (currentIdentifierError) identifierRef.current?.focus()
        else passwordRef.current?.focus()
        submitLock.current = false
      }, 0)
      return
    }

    setErrors({})
    setForcedPhase('submitting')
    try {
      const loginIdentifier = method === 'phone' ? normalizePhone(identifier) : identifier.trim()
      const { user, token } = await loginUser({ email: loginIdentifier, password })
      saveSession(token, user, remember)
      setForcedPhase('success')
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (!reducedMotion && document.visibilityState !== 'hidden') {
        await new Promise((resolve) => window.setTimeout(resolve, 800))
      }
      redirectAfterAuth(user)
    } catch (error) {
      const details = getAuthErrorDetails(error)
      setForcedPhase('error')
      setErrors({ form: details.message })
      window.setTimeout(() => passwordRef.current?.focus(), 0)
    } finally {
      submitLock.current = false
    }
  }

  const handleGoogleSuccess = useCallback((user: AuthUser, token: string) => {
    saveSession(token, user, true)
    redirectAfterAuth(user)
  }, [redirectAfterAuth])
  const handleGoogleError = useCallback((message: string) => {
    setForcedPhase('error')
    setErrors({ form: message })
  }, [])

  const formContent = (
    <>
      <div className="login-card__heading">
        <h2>Content de te revoir</h2>
        <p>Connecte-toi pour reprendre ta préparation.</p>
      </div>

      {sessionExpired && errors.info ? (
        <div className="login-expired" role="status">
          <Clock3 size={18} aria-hidden="true" />
          <span>Ta session a expiré. Reconnecte-toi pour continuer.</span>
        </div>
      ) : errors.info ? (
        <div className="login-alert login-alert--info" role="status">{errors.info}</div>
      ) : null}
      {errors.form ? <div className="login-alert" role="alert">{errors.form}</div> : null}

      <SegmentedChoice value={method} onChange={handleMethodChange} />
      <div className="login-fields">
        <AuthField
          id="login-identifier"
          label={method === 'email' ? 'Adresse e-mail' : 'Numéro de téléphone'}
          value={identifier}
          type={method === 'email' ? 'email' : 'tel'}
          inputMode={method === 'email' ? 'email' : 'tel'}
          autoComplete={method === 'email' ? 'username' : 'tel-national'}
          placeholder={method === 'email' ? 'aicha@exemple.bj' : '01 XX XX XX XX'}
          icon={method === 'email' ? Mail : Phone}
          inputRef={identifierRef}
          prefix={method === 'phone' ? <span className="login-phone-prefix">+229</span> : undefined}
          error={touched.identifier ? errors.identifier : undefined}
          valid={touched.identifier && identifierValid && !errors.identifier}
          onChange={handleIdentifierChange}
          onBlur={handleIdentifierBlur}
          onAnimationStart={handleAutoFill}
        />
        <AuthField
          id="login-password"
          label="Mot de passe"
          value={password}
          type={passwordVisible ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="Ton mot de passe"
          icon={LockKeyhole}
          inputRef={passwordRef}
          error={touched.password ? errors.password : undefined}
          valid={touched.password && passwordValid && !errors.password}
          passwordToggle
          passwordVisible={passwordVisible}
          onPasswordToggle={() => setPasswordVisible((current) => !current)}
          onChange={handlePasswordChange}
          onBlur={handlePasswordBlur}
          onAnimationStart={handleAutoFill}
        />
      </div>

      <div className="login-options">
        <label className="login-remember">
          <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
          <span className="login-remember__box" aria-hidden="true" />
          <span>Rester connecté 7 jours</span>
        </label>
        <Link to="/mot-de-passe-oublie">Mot de passe oublié ?</Link>
      </div>

      <div className={`login-submit-row ${phase === 'error' ? 'is-error' : ''}`}>
        <TrafficLight light={light} error={phase === 'error'} />
        <button className="login-submit" type="submit" aria-busy={phase === 'submitting'} disabled={phase === 'submitting' || phase === 'success'}>
          {phase === 'success' ? "C'est parti !" : phase === 'submitting' ? 'Démarrage…' : 'Se connecter'}
          <ArrowLeft className="login-submit__arrow" size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="login-divider" aria-hidden="true"><span />ou<span /></div>
      <div className="login-google">
        <GoogleAuthButton text="continue_with" onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
        <div className="login-google-fallback" aria-hidden="true"><GoogleIcon size={18} />Continuer avec Google</div>
      </div>
      <p className="login-signup">
        Pas encore de compte ? <Link to="/inscription">Créer un compte</Link>
      </p>
      {layout === 'compact' ? (
        <div className="login-legal login-legal--compact">
          <Link to="/conditions-utilisation">Conditions d’utilisation</Link>
          <Link to="/politique-de-confidentialite">Confidentialité</Link>
          <Link to="/mentions-legales">Mentions légales</Link>
        </div>
      ) : null}
    </>
  )

  const cardProps = {
    ref: cardRef,
    noValidate: true,
    onSubmit: handleSubmit,
    'aria-label': 'Connexion à Monpermis.bj',
    'data-phase': phase,
  }

  return (
    <main className={`login-page login-page--${layout}`} ref={pageRef}>
      <LoginScene
        layout={layout}
        phase={phase}
        positionPhase={positionPhase}
        copy={copy}
        compactCopy={compactCopy}
        light={light}
        started={started}
        containerRef={pageRef}
        obstacleRef={cardRef}
      />

      <header className="login-brand">
        <Link to="/bienvenue" aria-label="Monpermis.bj, retour à l’accueil">
          <img src="/logo.png" alt="" width="52" height="52" />
          <span>Monpermis<span>.bj</span></span>
        </Link>
      </header>

      {layout !== 'compact' ? (
        <>
          <section className="login-intro" aria-label="Préparation au permis de conduire au Bénin">
            <span className="login-intro__eyebrow"><span />Préparation au permis de conduire · Bénin</span>
            <h1>En route vers<br />ton permis.</h1>
            <p>Remplis le formulaire : ta voiture avance à chaque étape. Au vert, c’est parti.</p>
          </section>
          <div className="login-legal login-legal--desktop">
            <Link to="/conditions-utilisation">Conditions d’utilisation</Link>
            <Link to="/politique-de-confidentialite">Confidentialité</Link>
            <Link to="/mentions-legales">Mentions légales</Link>
          </div>
        </>
      ) : (
        <div className="login-mobile-scene-label" aria-hidden="true">En route vers ton permis.</div>
      )}

      {layout === 'compact' ? <LoginSheet {...cardProps}>{formContent}</LoginSheet> : <GlassCard {...cardProps}>{formContent}</GlassCard>}
    </main>
  )
}

export default LoginPage
