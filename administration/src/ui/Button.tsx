import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'default' | 'primary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  children: ReactNode
}

const variantClass: Record<Variant, string> = {
  default: 'ui-btn',
  primary: 'ui-btn ui-btn-primary',
  ghost: 'ui-btn ui-btn-ghost',
  danger: 'ui-btn ui-btn-danger',
}

export function Button({ variant = 'default', className, children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button type={type} className={[variantClass[variant], className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </button>
  )
}
