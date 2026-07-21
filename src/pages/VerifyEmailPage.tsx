import { Link, useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { verifyEmail } from '../api/auth-password'
import { BrandName } from '../components/BrandName'
import '../styles/login.css'

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [error, setError] = useState('')

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
              <Link
                to="/"
                style={{ color: '#0f4c4c', fontWeight: 600, display: 'inline-block', marginTop: 12 }}
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
