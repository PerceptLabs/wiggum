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
      <div className="flex h-10 w-10 shrink-0 items-center justify-center border-[length:var(--border-width,1px)] border-border bg-primary text-primary-foreground [box-shadow:var(--shadow-sm)]">
        <User className="h-5 w-5" />
      </div>
      <div className="flex-1 space-y-1">
        <p className="text-sm [font-weight:var(--heading-weight,700)] [text-transform:var(--heading-transform,none)] [letter-spacing:var(--heading-tracking,normal)]">You</p>
        <div className="text-sm text-foreground whitespace-pre-wrap">{content}</div>
      </div>
    </div>
  )
}
