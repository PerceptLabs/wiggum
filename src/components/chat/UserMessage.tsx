import * as React from 'react'
import { User } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface UserMessageProps {
  content: string
  className?: string
}

export function UserMessage({ content, className }: UserMessageProps) {
  return (
    <div className={cn('flex gap-3 px-4 py-3', className)}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <User className="h-4 w-4" />
      </div>
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium">You</p>
        <div className="text-sm text-foreground whitespace-pre-wrap">{content}</div>
      </div>
    </div>
  )
}
