import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import './mobile-shell.css'

export function MobileShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const noScroll = ['/', '/inscription'].includes(pathname)

  return (
    <div className="mobile-shell">
      <div className={`mobile-frame${noScroll ? ' mobile-frame--no-scroll' : ''}`}>
        {children}
      </div>
    </div>
  )
}
