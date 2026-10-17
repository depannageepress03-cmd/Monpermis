import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { MoniteurAuthProvider } from './context/MoniteurAuthContext.tsx'
import './styles/moniteur-base.css'
import './styles/moniteur-model.css'
import './styles/moniteur-login-model.css'
import './styles/moniteur-code-model.css'
import './styles/moniteur-extra.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <MoniteurAuthProvider>
        <App />
      </MoniteurAuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
