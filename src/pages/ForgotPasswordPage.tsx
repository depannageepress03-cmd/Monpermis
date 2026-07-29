import { Link } from 'react-router-dom'
import { BrandName } from '../components/BrandName'
import { LegalFooter } from '../components/LegalFooter'
import '../styles/login.css'

export function ForgotPasswordPage() {
  return (
    <div className="signin-page signin-page--app">
      <div className="signin-container signin-container--app">
        <header className="signin-header signin-header--app">
          <img src="/logo.png" alt="" className="signin-logo-img" width={110} height={74} />
          <BrandName as="p" className="signin-brand" />
          <h1 className="signin-title">Code oublié</h1>
          <p className="signin-subtitle">
            La connexion se fait avec ton numéro de téléphone et ton code. Pour réinitialiser ton
            code, contacte le support Monpermis (WhatsApp ou message via l&apos;application /
            le site) en indiquant ton numéro de téléphone.
          </p>
        </header>

        <div className="signin-form signin-form--app">
          <p className="signin-register-link">
            <Link to="/">Retour à la connexion</Link>
          </p>
          <LegalFooter />
        </div>
      </div>
    </div>
  )
}
