import { Link } from 'react-router-dom'
import '../styles/legal-footer.css'

/** Liens légaux — même présentation que l’app mobile. */
export function LegalFooter() {
  return (
    <nav className="legal-footer" aria-label="Informations légales">
      <Link to="/conditions-utilisation" className="legal-footer-link">
        Conditions d&apos;utilisation
      </Link>
      <span className="legal-footer-sep" aria-hidden="true">
        ·
      </span>
      <Link to="/politique-de-confidentialite" className="legal-footer-link">
        Confidentialité
      </Link>
      <span className="legal-footer-sep" aria-hidden="true">
        ·
      </span>
      <Link to="/mentions-legales" className="legal-footer-link">
        Mentions légales
      </Link>
    </nav>
  )
}
