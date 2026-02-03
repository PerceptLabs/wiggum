import * as React from 'react'
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { cn } from '../lib/utils'
import type { LucideIcon } from 'lucide-react'

export interface Feature {
  icon?: LucideIcon
  title: string
  description: string
}

export interface FeaturesGridProps {
  title?: string
  features: Feature[]
  columns?: 2 | 3 | 4
  className?: string
}

export function FeaturesGrid({
  title,
  features,
  columns = 3,
  className,
}: FeaturesGridProps) {
  const gridCols = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
  }

  return (
    <section className={cn('py-24 px-4', className)}>
      <div className="max-w-6xl mx-auto">
        {title && (
          <h2 className="text-3xl font-bold text-center mb-12">{title}</h2>
        )}
        <div className={cn('grid gap-6', gridCols[columns])}>
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                {feature.icon && (
                  <feature.icon className="h-10 w-10 mb-2 text-primary" />
                )}
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
