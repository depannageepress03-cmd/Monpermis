import { Link, useSearchParams } from 'react-router-dom'
import { type FormEvent, useEffect, useState } from 'react'
import { resendVerificationEmail, verifyEmail } from '../api/auth-password'
import { AuthStage } from '../components/AuthStage'
import { validateEmail } from '../utils/validation'
import '../styles/login.css'

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [error, setError] = useState('')
  const [resendEmail, setResendEmail] = useState('')
  const [resending, setResending] = useState(false)
  const [resendMsg, setResendMsg] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setError('Lien invalide ou expiré.')
      return
    }

    let cancelled = false
    verifyEmail(token)
      .then(() => {
        if (!cancelled) setStatus('ok')
      })
      .catch((err) => {
        if (!cancelled) {
          setStatus('error')
          setError(err instanceof Error ? err.message : 'Vérification impossible')
        }
      })

    return () => {
      cancelled = true
    }
  }, [token])

  const handleResend = async (e: FormEvent) => {
    e.preventDefault()
    const emailError = validateEmail(resendEmail)
    if (emailError) {
      setResendMsg(emailError)
      return
    }
    setResending(true)
    setResendMsg('')
    try {
      await resendVerificationEmail(resendEmail.trim())
      setResendMsg('Si un compte non vérifié existe, un nouveau lien a été envoyé.')
    } catch (err) {
      setResendMsg(err instanceof Error ? err.message : 'Envoi impossible')
    } finally {
      setResending(false)
    }
  }

  return (
    <AuthStage tagline="Dernière étape avant de prendre la route." imageSrc="/home/i5.jpg">
      <p className="auth-stage-kicker">Email</p>
      <h2 className="auth-stage-heading">Vérification</h2>

      <div className="signin-form signin-form--stage" style={{ textAlign: 'center' }}>
        {status === 'loading' ? (
          <p style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>Vérification en cours…</p>
        ) : null}
        {status === 'ok' ? (
          <>
            <p style={{ color: 'var(--brand-green)', fontWeight: 700, marginBottom: 12 }}>
              Email vérifié avec succès !
            </p>
            <Link to="/" style={{ color: 'var(--brand-navy)', fontWeight: 700 }}>
              Se connecter
            </Link>
          </>
        ) : null}
        {status === 'error' ? (
          <>
            <p style={{ color: 'var(--color-error)', fontWeight: 700 }}>{error}</p>
            <form
              onSubmit={handleResend}
              style={{ marginTop: 20, maxWidth: 360, marginInline: 'auto', textAlign: 'left' }}
            >
              <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginBottom: 8 }}>
                Lien expiré ? Renseigne ton email pour recevoir un nouveau lien.
              </p>
              <input
                className="auth-input"
                type="text"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                placeholder="Adresse email"
                style={{ width: '100%', marginBottom: 8 }}
              />
              {resendMsg ? (
                <p style={{ color: 'var(--brand-navy)', fontSize: 13, fontWeight: 600 }}>{resendMsg}</p>
              ) : null}
              <button
                type="submit"
                className="signin-btn-continue signin-btn-continue--app"
                disabled={resending}
                style={{ marginTop: 8 }}
              >
                {resending ? 'Envoi…' : 'Renvoyer le lien'}
              </button>
            </form>
            <Link
              to="/"
              style={{
                color: 'var(--brand-navy)',
                fontWeight: 700,
                display: 'inline-block',
                marginTop: 16,
              }}
            >
              Retour à la connexion
            </Link>
          </>
        ) : null}
      </div>
    </AuthStage>
  )
}
