import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from './Button'

interface DrawerProps {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

export function Drawer({ open, title, subtitle, onClose, children, footer }: DrawerProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.querySelector<HTMLElement>('input,button,textarea,select')?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="ui-drawer-root" role="presentation">
      <button type="button" className="ui-drawer-backdrop" aria-label="Fermer" onClick={onClose} />
      <div
        ref={panelRef}
        className="ui-drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="ui-drawer-header">
          <div>
            <h2 id={titleId} className="ui-drawer-title">
              {title}
            </h2>
            {subtitle ? <p className="ui-drawer-subtitle">{subtitle}</p> : null}
          </div>
          <Button variant="ghost" onClick={onClose} aria-label="Fermer">
            <X size={16} />
          </Button>
        </header>
        <div className="ui-drawer-body">{children}</div>
        {footer ? <footer className="ui-drawer-footer">{footer}</footer> : null}
      </div>
    </div>
  )
}
