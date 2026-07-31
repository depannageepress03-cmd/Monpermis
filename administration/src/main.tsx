import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { AdminAuthProvider } from './context/AdminAuthContext.tsx'
import './styles/admin-base.css'
import './styles/admin-layout.css'
import './styles/admin-ui.css'
import './styles/admin-content.css'
import './styles/admin-users.css'
import './styles/admin-questions.css'
import './styles/admin-subscriptions.css'
import './styles/admin-access-requests.css'
import './styles/admin-finances.css'
import './styles/admin-cockpit.css'
import './styles/admin-tracking.css'
import './styles/admin-motion.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AdminAuthProvider>
        <App />
      </AdminAuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
