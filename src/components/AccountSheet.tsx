import type { ReactNode } from 'react'
import {
  ChevronRight,
  Crown,
  History,
  Lock,
  LogOut,
  MessageCircle,
  Pencil,
  Phone,
  Settings,
  Shield,
  ShieldCheck,
  User,
  X,
} from 'lucide-react'
import type { AuthUser } from '../api/auth'
import '../styles/auth.css'

type Props = {
  visible: boolean
  user: AuthUser
  greeting: string
  onClose: () => void
  onLogout: () => void
  onOpenAbonnement: () => void
  onOpenPayments: () => void
  onOpenSupport: () => void
  onOpenProfile: () => void
}

function memberSinceLabel(createdAt: string): string | null {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return null
  const raw = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  if (!raw) return null
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

function accountTypeLabel(authProvider?: AuthUser['authProvider']): string | null {
  if (authProvider === 'google') return 'Google'
  if (authProvider === 'local' || authProvider == null) return 'Téléphone / mot de passe'
  return null
}

export function AccountSheet({
  visible,
  user,
  greeting,
  onClose,
  onLogout,
  onOpenAbonnement,
  onOpenPayments,
  onOpenSupport,
  onOpenProfile,
}: Props) {
  if (!visible) return null

  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim()
  const phone = (user.phone || '').trim()
  const email = (user.email || '').trim()
  const since = memberSinceLabel(user.createdAt)
  const accountType = accountTypeLabel(user.authProvider)
  const showVerified = Boolean(user.isEmailVerified)

  return (
    <div className="account-sheet-root" role="presentation" onClick={onClose}>
      <div
        className="account-sheet"
        role="dialog"
        aria-label="Mon compte"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="account-sheet-close" onClick={onClose} aria-label="Fermer">
          <X size={22} />
        </button>

        <div className="account-sheet-scroll">
          <div className="account-sheet-hero">
            <div className="account-sheet-avatar">
              <User size={40} />
            </div>
            <div className="account-sheet-hero-copy">
              <p className="account-sheet-greeting">{greeting} 👋</p>
              {fullName ? <h2 className="account-sheet-name">{fullName}</h2> : null}
              {since || showVerified ? (
                <div className="account-sheet-badges">
                  {since ? (
                    <span className="account-sheet-badge">
                      <ShieldCheck size={13} />
                      Membre depuis {since}
                    </span>
                  ) : null}
                  {showVerified ? (
                    <span className="account-sheet-badge">
                      <ShieldCheck size={13} />
                      E-mail vérifié
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          {phone || accountType || email ? (
            <div className="account-sheet-info">
              {phone ? (
                <InfoRow
                  icon={<Phone size={18} />}
                  label="Téléphone"
                  value={phone}
                  onEdit={onOpenProfile}
                />
              ) : null}
              {phone && (accountType || email) ? <hr /> : null}
              {accountType ? (
                <InfoRow
                  icon={<Lock size={18} />}
                  label="Compte"
                  value={accountType}
                  onEdit={onOpenProfile}
                />
              ) : null}
              {accountType && email ? <hr /> : null}
              {email ? (
                <InfoRow
                  icon={<User size={18} />}
                  label="E-mail"
                  value={email}
                  onEdit={onOpenProfile}
                />
              ) : null}
            </div>
          ) : null}

          <div className="account-sheet-actions">
            <ActionRow
              icon={<Crown size={18} />}
              title="Abonnement / Mes accès"
              subtitle="Gère ton abonnement et tes accès"
              onPress={onOpenAbonnement}
            />
            <ActionRow
              icon={<History size={18} />}
              title="Historique des paiements"
              subtitle="Consulte tous tes paiements"
              onPress={onOpenPayments}
            />
            <ActionRow
              icon={<MessageCircle size={18} />}
              title="Support WhatsApp"
              subtitle="Obtiens de l’aide rapidement"
              onPress={onOpenSupport}
            />
            <ActionRow
              icon={<Settings size={18} />}
              title="Modifier mon profil"
              subtitle="Met à jour tes informations personnelles"
              onPress={onOpenProfile}
              last
            />
          </div>

          <button type="button" className="account-sheet-logout" onClick={onLogout}>
            <LogOut size={18} />
            Se déconnecter
          </button>

          <div className="account-sheet-security">
            <Shield size={18} />
            <div>
              <strong>Sécurité du compte</strong>
              <p>Vos informations personnelles sont protégées.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({
  icon,
  label,
  value,
  onEdit,
}: {
  icon: ReactNode
  label: string
  value: string
  onEdit: () => void
}) {
  return (
    <div className="account-sheet-info-row">
      <span className="account-sheet-icon">{icon}</span>
      <span className="account-sheet-info-copy">
        <small>{label}</small>
        <strong>{value}</strong>
      </span>
      <button type="button" className="account-sheet-edit" onClick={onEdit} aria-label={`Modifier ${label}`}>
        <Pencil size={15} />
      </button>
    </div>
  )
}

function ActionRow({
  icon,
  title,
  subtitle,
  onPress,
  last,
}: {
  icon: ReactNode
  title: string
  subtitle: string
  onPress: () => void
  last?: boolean
}) {
  return (
    <button type="button" className={`account-sheet-action${last ? ' is-last' : ''}`} onClick={onPress}>
      <span className="account-sheet-icon">{icon}</span>
      <span className="account-sheet-action-copy">
        <strong>{title}</strong>
        <small>{subtitle}</small>
      </span>
      <ChevronRight size={18} />
    </button>
  )
}
