import type { FormHTMLAttributes, ReactNode } from 'react'

interface LoginSheetProps extends FormHTMLAttributes<HTMLFormElement> {
  children: ReactNode
}

export function LoginSheet({ children, className = '', ...props }: LoginSheetProps) {
  return <form className={`login-card login-card--sheet ${className}`} {...props}>{children}</form>
}
