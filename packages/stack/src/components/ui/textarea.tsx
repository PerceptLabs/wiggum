import * as React from "react"

import { cn } from "../../lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-[var(--radius)] border-[length:var(--border-width)] border-border bg-background px-3 py-2 text-base [box-shadow:var(--shadow-sm)] transition-all placeholder:text-muted-foreground focus:outline-none focus:[box-shadow:var(--shadow)] focus:translate-x-[var(--focus-translate-x)] focus:translate-y-[var(--focus-translate-y)] disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
