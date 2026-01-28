import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center border-[length:var(--border-width)] border-border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide transition-all focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 [box-shadow:var(--shadow-sm)]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:translate-x-[-1px] hover:translate-y-[-1px] hover:[box-shadow:var(--shadow-md)]",
        secondary:
          "bg-secondary text-secondary-foreground hover:translate-x-[-1px] hover:translate-y-[-1px] hover:[box-shadow:var(--shadow-md)]",
        destructive:
          "bg-destructive text-destructive-foreground hover:translate-x-[-1px] hover:translate-y-[-1px] hover:[box-shadow:var(--shadow-md)]",
        success:
          "bg-emerald-500 text-white hover:translate-x-[-1px] hover:translate-y-[-1px] hover:[box-shadow:var(--shadow-md)]",
        warning:
          "bg-amber-500 text-black hover:translate-x-[-1px] hover:translate-y-[-1px] hover:[box-shadow:var(--shadow-md)]",
        outline: "bg-background text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
