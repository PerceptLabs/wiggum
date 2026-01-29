import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm",
    "[font-weight:var(--btn-weight,500)] [text-transform:var(--btn-transform,none)] [letter-spacing:var(--btn-tracking,normal)]",
    "transition-all duration-100",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    "border-[length:var(--border-width)] border-border",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground [box-shadow:var(--shadow)] hover:[box-shadow:var(--shadow-hover)] hover:translate-x-[var(--hover-translate-x)] hover:translate-y-[var(--hover-translate-y)] active:[box-shadow:var(--shadow-active)] active:translate-x-[var(--active-translate-x)] active:translate-y-[var(--active-translate-y)]",
        destructive:
          "bg-destructive text-destructive-foreground [box-shadow:var(--shadow)] hover:[box-shadow:var(--shadow-hover)] hover:translate-x-[var(--hover-translate-x)] hover:translate-y-[var(--hover-translate-y)] active:[box-shadow:var(--shadow-active)] active:translate-x-[var(--active-translate-x)] active:translate-y-[var(--active-translate-y)]",
        outline:
          "bg-background [box-shadow:var(--shadow)] hover:bg-accent hover:[box-shadow:var(--shadow-hover)] hover:translate-x-[var(--hover-translate-x)] hover:translate-y-[var(--hover-translate-y)] active:[box-shadow:var(--shadow-active)] active:translate-x-[var(--active-translate-x)] active:translate-y-[var(--active-translate-y)]",
        secondary:
          "bg-secondary text-secondary-foreground [box-shadow:var(--shadow)] hover:[box-shadow:var(--shadow-hover)] hover:translate-x-[var(--hover-translate-x)] hover:translate-y-[var(--hover-translate-y)] active:[box-shadow:var(--shadow-active)] active:translate-x-[var(--active-translate-x)] active:translate-y-[var(--active-translate-y)]",
        ghost: "hover:bg-accent hover:text-accent-foreground border-transparent",
        link: "text-primary underline-offset-4 hover:underline border-transparent",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 px-4 text-xs",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
