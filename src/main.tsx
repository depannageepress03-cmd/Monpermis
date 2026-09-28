import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
// Jetons du design « route 2026 » (--d-*) : doivent être définis avant les
// feuilles qui les consomment.
import './styles/tokens.css'
import './theme.css'
import './index.css'
import './styles/motion.css'
import './styles/premium.css'
import './components/ui/ui.css'
import './styles/dashboard-theme.css'
import './styles/redesign.css'
import './styles/responsive.css'
import './styles/responsive-pages.css'

// Purge agressive des anciens Service Workers / caches PWA
if ('serviceWorker' in navigator) {
  void navigator.serviceWorker.getRegistrations().then((regs) => {
    for (const reg of regs) void reg.unregister()
  })
}
if (typeof caches !== 'undefined') {
  void caches.keys().then((keys) => {
    for (const key of keys) void caches.delete(key)
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
