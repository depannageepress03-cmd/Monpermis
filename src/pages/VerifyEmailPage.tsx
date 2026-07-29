import { Link, useSearchParams } from 'react-router-dom'
import { type FormEvent, useEffect, useState } from 'react'
import { resendVerificationEmail, verifyEmail } from '../api/auth-password'
import { BrandName } from '../components/BrandName'
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
    <div className="signin-page signin-page--login">
      <div className="signin-container signin-container--login">
        <div className="signin-main" style={{ textAlign: 'center', padding: '40px 0' }}>
          <BrandName as="p" className="signin-brand" />
          {status === 'loading' ? (
            <p style={{ color: '#6b7280', fontWeight: 600 }}>Vérification en cours…</p>
          ) : null}
          {status === 'ok' ? (
            <>
              <p style={{ color: '#16a34a', fontWeight: 600, marginBottom: 12 }}>
                Email vérifié avec succès !
              </p>
              <Link to="/" style={{ color: '#0f4c4c', fontWeight: 600 }}>
                Se connecter
              </Link>
            </>
          ) : null}
          {status === 'error' ? (
            <>
              <p style={{ color: '#dc2626', fontWeight: 600 }}>{error}</p>
              <form
                onSubmit={handleResend}
                style={{ marginTop: 20, maxWidth: 360, marginInline: 'auto', textAlign: 'left' }}
              >
                <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 8 }}>
                  Lien expiré ? Renseigne ton email pour recevoir un nouveau lien.
                </p>
                <input
                  className="auth-input"
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="Adresse email"
                  style={{ width: '100%', marginBottom: 8 }}
                />
                {resendMsg ? (
                  <p style={{ color: '#0f4c4c', fontSize: 13, fontWeight: 600 }}>{resendMsg}</p>
                ) : null}
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={resending}
                  style={{ width: '100%', marginTop: 8 }}
                >
                  {resending ? 'Envoi…' : 'Renvoyer le lien'}
                </button>
              </form>
              <Link
                to="/"
                style={{ color: '#0f4c4c', fontWeight: 600, display: 'inline-block', marginTop: 16 }}
              >
                Retour à la connexion
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
