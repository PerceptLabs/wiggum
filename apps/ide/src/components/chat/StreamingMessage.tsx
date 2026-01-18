import * as React from 'react'
import { Bot } from 'lucide-react'
import { cn } from '@wiggum/stack'

interface StreamingMessageProps {
  content: string
  className?: string
}

export function StreamingMessage({ content, className }: StreamingMessageProps) {
  return (
    <div className={cn('flex gap-3 px-4 py-3', className)}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
        <Bot className="h-4 w-4" />
      </div>
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium">Wiggum</p>
        <div className="text-sm text-foreground whitespace-pre-wrap">
          {content}
          <span className="inline-block w-2 h-4 ml-0.5 bg-primary animate-pulse" />
        </div>
      </div>
    </div>
  )
}
