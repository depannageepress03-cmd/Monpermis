import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'

interface GoogleSignInButtonProps {
  onSuccess: (idToken: string) => void | Promise<void>
  onError?: () => void
  disabled?: boolean
}

export function GoogleSignInButton({ onSuccess, onError, disabled }: GoogleSignInButtonProps) {
  const handleSuccess = (response: CredentialResponse) => {
    if (response.credential) {
      void onSuccess(response.credential)
    }
  }

  return (
    <div className={`google-signin-wrapper${disabled ? ' google-signin-wrapper--disabled' : ''}`}>
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={onError}
        text="continue_with"
        shape="pill"
        size="large"
      />
    </div>
  )
}
