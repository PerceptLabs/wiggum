import * as React from "react"

import { cn } from "../../lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full border-2 border-border bg-background px-3 py-2 text-base shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all file:border-0 file:bg-transparent file:text-sm file:font-bold file:text-foreground placeholder:text-muted-foreground focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[-2px] focus:translate-y-[-2px] disabled:cursor-not-allowed disabled:opacity-50 dark:shadow-[2px_2px_0px_0px_hsl(50,100%,53%)] dark:focus:shadow-[4px_4px_0px_0px_hsl(50,100%,53%)]",
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
