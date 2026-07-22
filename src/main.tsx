import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App.tsx'
import './index.css'

// Force la prise en compte des nouveaux builds (évite de rester bloqué sur un vieux JS en cache)
registerSW({
  immediate: true,
  onNeedRefresh() {
    window.location.reload()
  },
  onRegisteredSW(_url, registration) {
    if (!registration) return
    // Vérifie régulièrement une nouvelle version du service worker
    window.setInterval(() => {
      void registration.update()
    }, 60_000)
  },
})

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </GoogleOAuthProvider>
  </StrictMode>,
)
