import { useEffect, useRef, useState } from 'react'
import { getGoogleAuthConfig, loginWithGoogle, type AuthUser } from '../api/auth'
import { GoogleIcon } from './icons/GoogleIcon'
import type { GsiRenderOptions } from '../types/google-gsi'

interface GoogleAuthButtonProps {
  /** Label du bouton de secours (avant chargement du script Google). */
  text?: GsiRenderOptions['text']
  onSuccess: (user: AuthUser, token: string) => void
  onError: (message: string) => void
}

const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client'

let gsiScriptPromise: Promise<void> | null = null

function loadGsiScript(): Promise<void> {
  if (window.google?.accounts) return Promise.resolve()
  if (gsiScriptPromise) return gsiScriptPromise
  gsiScriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GIS_SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => {
      gsiScriptPromise = null
      reject(new Error('Impossible de charger le bouton Google'))
    }
    document.head.appendChild(script)
  })
  return gsiScriptPromise
}

/**
 * Bouton officiel « Continuer avec Google » (Google Identity Services).
 * Masqué si Google n'est pas configuré côté serveur.
 */
export function GoogleAuthButton({ text = 'continue_with', onSuccess, onError }: GoogleAuthButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    let cancelled = false
    getGoogleAuthConfig()
      .then((config) => {
        if (cancelled) return
        if (!config.enabled || !config.clientId) {
          setEnabled(false)
          setStatus('error')
          return
        }
        setEnabled(true)
        return loadGsiScript()
          .then(() => {
            if (cancelled) return
            window.google?.accounts?.id.initialize({
              client_id: config.clientId,
              ux_mode: 'popup',
              callback: (response) => {
                const credential = response.credential
                if (!credential) {
                  onError('Aucune session Google reçue. Réessaie.')
                  return
                }
                loginWithGoogle(credential)
                  .then(({ user, token }) => onSuccess(user, token))
                  .catch((error) => {
                    onError(error instanceof Error ? error.message : 'Connexion Google impossible')
                  })
              },
            })
            setStatus('ready')
          })
          .catch((error) => {
            if (!cancelled) {
              setStatus('error')
              onError(error instanceof Error ? error.message : 'Connexion Google impossible')
            }
          })
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [onError, onSuccess])

  useEffect(() => {
    if (status !== 'ready' || !enabled || !containerRef.current) return
    const accounts = window.google?.accounts
    if (!accounts) return
    accounts.id.renderButton(containerRef.current, {
      theme: 'outline',
      size: 'large',
      shape: 'pill',
      text,
      logo_alignment: 'left',
    })
  }, [status, enabled, text])

  if (!enabled) return null

  return (
    <div className="signin-google-wrap">
      {status === 'ready' ? (
        <div ref={containerRef} className="signin-google-official" />
      ) : (
        <button type="button" className="signin-google-btn" disabled={status === 'loading'}>
          <GoogleIcon size={18} />
          {status === 'loading' ? 'Connexion avec Google…' : 'Continuer avec Google'}
        </button>
      )}
    </div>
  )
}
