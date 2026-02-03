import * as React from 'react'
import { cn } from '../lib/utils'

export interface PageShellProps {
  children: React.ReactNode
  header?: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

export function PageShell({ children, header, footer, className }: PageShellProps) {
  return (
    <div className={cn('min-h-screen flex flex-col bg-background', className)}>
      {header && <header className="border-b">{header}</header>}
      <main className="flex-1">{children}</main>
      {footer && <footer className="border-t">{footer}</footer>}
    </div>
  )
}
