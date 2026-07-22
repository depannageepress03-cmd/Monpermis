import { useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStoredUser } from '../hooks/useAuth'
import { IntroAnimation } from '../components/IntroAnimation'

export function IntroPage() {
  const navigate = useNavigate()
  const doneRef = useRef(false)
  const user = getStoredUser()

  const goNext = useCallback(() => {
    if (doneRef.current) return
    doneRef.current = true
    navigate(user ? '/accueil' : '/', { replace: true })
  }, [navigate, user])

  useEffect(() => {
    const timeout = setTimeout(goNext, 6000)
    return () => clearTimeout(timeout)
  }, [goNext])

  return <IntroAnimation onDone={goNext} />
}
