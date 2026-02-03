import * as React from 'react'
import { Button } from '../components/ui/button'
import { cn } from '../lib/utils'

export interface CTASectionProps {
  title: string
  description?: string
  action: { label: string; onClick?: () => void }
  variant?: 'default' | 'muted'
  className?: string
}

export function CTASection({
  title,
  description,
  action,
  variant = 'default',
  className,
}: CTASectionProps) {
  return (
    <section
      className={cn(
        'py-24 px-4 text-center',
        variant === 'muted' && 'bg-muted',
        className
      )}
    >
      <div className="max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold mb-4">{title}</h2>
        {description && (
          <p className="text-muted-foreground mb-8">{description}</p>
        )}
        <Button size="lg" onClick={action.onClick}>
          {action.label}
        </Button>
      </div>
    </section>
  )
}
