import { Link } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { AuthStage } from '../components/AuthStage'
import { LegalFooter } from '../components/LegalFooter'
import { supportWhatsAppUrl } from '../utils/support'
import '../styles/login.css'

export function ForgotPasswordPage() {
  const whatsappHref = supportWhatsAppUrl(
    'Bonjour Monpermis, j’ai oublié mon code de connexion. Mon numéro : ',
  )

  return (
    <AuthStage tagline="On t’aide à retrouver l’accès en quelques messages." imageSrc="/home/i4.jpg">
      <p className="auth-stage-kicker">Assistance</p>
      <h2 className="auth-stage-heading">Code oublié</h2>
      <p className="auth-stage-lead">
        Contacte le support WhatsApp avec ton numéro pour réinitialiser ton code.
      </p>

      <div className="signin-form signin-form--stage">
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="signin-btn-continue signin-btn-continue--app"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            textDecoration: 'none',
            marginTop: 0,
          }}
        >
          <MessageCircle size={18} />
          Contacter le support WhatsApp
        </a>
        <p className="signin-register-link">
          <Link to="/">Retour à la connexion</Link>
        </p>
        <LegalFooter />
      </div>
    </AuthStage>
  )
}
