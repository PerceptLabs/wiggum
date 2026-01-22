import * as React from 'react'
import { User } from 'lucide-react'
import { cn } from '@wiggum/stack'

interface UserMessageProps {
  content: string
  className?: string
}

export function UserMessage({ content, className }: UserMessageProps) {
  return (
    <div className={cn('flex gap-3 px-4 py-4', className)}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-border bg-primary text-primary-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_hsl(50,100%,53%)]">
        <User className="h-5 w-5" />
      </div>
      <div className="flex-1 space-y-1">
        <p className="text-sm font-bold uppercase tracking-wide">You</p>
        <div className="text-sm text-foreground whitespace-pre-wrap">{content}</div>
      </div>
    </div>
  )
}
