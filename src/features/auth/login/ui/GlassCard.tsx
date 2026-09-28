import type { FormHTMLAttributes, ReactNode } from 'react'

interface GlassCardProps extends FormHTMLAttributes<HTMLFormElement> {
  children: ReactNode
}

export function GlassCard({ children, className = '', ...props }: GlassCardProps) {
  return <form className={`login-card login-card--glass ${className}`} {...props}>{children}</form>
}
