import { Car } from 'lucide-react'
import type { ReactNode } from 'react'
import { BrandName } from './BrandName'
import '../styles/auth.css'

interface AuthLayoutProps {
  title: string
  subtitle: string
  children: ReactNode
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  return (
    <div className="auth-page">
      <div className="auth-container">
        <header className="auth-header">
          <div className="auth-logo">
            <Car size={36} strokeWidth={2} />
          </div>
          <BrandName as="h1" onDark />
          <p>Préparez votre permis de conduire en toute confiance</p>
        </header>

        <div className="auth-card">
          <h2>{title}</h2>
          <p className="subtitle">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  )
}
