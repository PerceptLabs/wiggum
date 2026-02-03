import * as React from 'react'
import { Button } from '../components/ui/button'
import { cn } from '../lib/utils'

export interface HeroSectionProps {
  title: string
  subtitle?: string
  primaryAction?: { label: string; onClick?: () => void }
  secondaryAction?: { label: string; onClick?: () => void }
  className?: string
}

export function HeroSection({
  title,
  subtitle,
  primaryAction,
  secondaryAction,
  className,
}: HeroSectionProps) {
  return (
    <section className={cn('py-24 px-4 text-center', className)}>
      <h1 className="text-5xl font-bold tracking-tight mb-4">{title}</h1>
      {subtitle && (
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          {subtitle}
        </p>
      )}
      {(primaryAction || secondaryAction) && (
        <div className="flex gap-4 justify-center">
          {primaryAction && (
            <Button size="lg" onClick={primaryAction.onClick}>
              {primaryAction.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" size="lg" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </section>
  )
}
