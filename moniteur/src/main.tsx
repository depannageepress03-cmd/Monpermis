import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { MoniteurAuthProvider } from './context/MoniteurAuthContext.tsx'
import './styles/moniteur-base.css'
import './styles/moniteur-layout.css'
import './styles/moniteur-ui.css'
import './styles/moniteur-app.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <MoniteurAuthProvider>
        <App />
      </MoniteurAuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
