import { useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStoredUser } from '../hooks/useAuth'
import { IntroAnimation } from '../components/IntroAnimation'
import { hasCompletedOnboarding } from '../utils/onboarding'

export function IntroPage() {
  const navigate = useNavigate()
  const doneRef = useRef(false)
  const user = getStoredUser()

  const goNext = useCallback(() => {
    if (doneRef.current) return
    doneRef.current = true
    if (user) {
      navigate('/accueil', { replace: true })
      return
    }
    navigate(hasCompletedOnboarding() ? '/' : '/bienvenue', { replace: true })
  }, [navigate, user])

  useEffect(() => {
    const timeout = setTimeout(goNext, 5500)
    return () => clearTimeout(timeout)
  }, [goNext])

  return <IntroAnimation onDone={goNext} />
}
