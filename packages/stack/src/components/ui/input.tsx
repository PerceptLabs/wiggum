import * as React from "react"

import { cn } from "../../lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-[var(--radius)] border-[length:var(--border-width)] border-border bg-background px-3 py-2 text-base [box-shadow:var(--shadow-sm)] transition-all file:border-0 file:bg-transparent file:text-sm file:[font-weight:var(--input-file-weight,500)] file:text-foreground placeholder:text-muted-foreground focus:outline-none focus:[box-shadow:var(--shadow)] focus:translate-x-[var(--focus-translate-x)] focus:translate-y-[var(--focus-translate-y)] disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
