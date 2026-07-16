import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { AdminAuthProvider } from './context/AdminAuthContext.tsx'
import './styles/admin-base.css'
import './styles/admin-layout.css'
import './styles/admin-content.css'
import './styles/admin-users.css'
import './styles/admin-questions.css'
import './styles/admin-subscriptions.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AdminAuthProvider>
        <App />
      </AdminAuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
