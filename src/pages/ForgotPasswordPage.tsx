import { Link } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { BrandName } from '../components/BrandName'
import { LegalFooter } from '../components/LegalFooter'
import { supportWhatsAppUrl } from '../utils/support'
import '../styles/login.css'

export function ForgotPasswordPage() {
  const whatsappHref = supportWhatsAppUrl(
    'Bonjour Monpermis, j’ai oublié mon code de connexion. Mon numéro : ',
  )

  return (
    <div className="signin-page signin-page--app">
      <div className="signin-container signin-container--app">
        <header className="signin-header signin-header--app">
          <img src="/logo.png" alt="" className="signin-logo-img" width={110} height={74} />
          <BrandName as="p" className="signin-brand" />
          <h1 className="signin-title">Code oublié</h1>
          <p className="signin-subtitle">
            La connexion se fait avec ton numéro de téléphone et ton code. Pour réinitialiser ton
            code, contacte le support Monpermis via WhatsApp en indiquant ton numéro de téléphone.
          </p>
        </header>

        <div className="signin-form signin-form--app">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, justifyContent: 'center', width: '100%', marginBottom: 16, textDecoration: 'none' }}
          >
            <MessageCircle size={18} />
            Contacter le support WhatsApp
          </a>
          <p className="signin-register-link">
            <Link to="/">Retour à la connexion</Link>
          </p>
          <LegalFooter />
        </div>
      </div>
    </div>
  )
}
