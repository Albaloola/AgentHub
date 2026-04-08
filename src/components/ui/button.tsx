"use client"

import * as React from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { motion, useReducedMotion } from "framer-motion"

import { cn } from "@/lib/utils"
import { spring } from "@/lib/animation"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border text-sm font-medium tracking-[0.01em] whitespace-nowrap outline-none select-none disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "button-primary-surface btn-light-sweep",
        outline:
          "button-outline-surface text-foreground aria-expanded:bg-[var(--button-outline-hover)]",
        secondary:
          "surface-subtle text-secondary-foreground aria-expanded:bg-[var(--surface-hover)]",
        ghost:
          "border-transparent text-muted-foreground button-ghost-surface aria-expanded:bg-[var(--button-ghost-hover)] aria-expanded:text-foreground",
        destructive:
          "border-destructive/20 bg-destructive/10 text-destructive",
        link: "border-transparent text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-9 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        xs: "h-6 gap-1 rounded-md px-2 text-xs in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-md px-2.5 text-[0.8125rem] in-data-[slot=button-group]:rounded-md has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-10 gap-2 px-3.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-9",
        "icon-xs":
          "size-6 rounded-md in-data-[slot=button-group]:rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-8 rounded-md in-data-[slot=button-group]:rounded-md",
        "icon-lg": "size-10 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

interface ButtonProps extends ButtonPrimitive.Props, VariantProps<typeof buttonVariants> {
  loading?: boolean
}

function Button({
  className,
  variant = "default",
  size = "default",
  loading,
  children,
  ...props
}: ButtonProps) {
  const prefersReduced = useReducedMotion()

  // For link variant, skip motion wrapper entirely
  if (variant === "link" || prefersReduced) {
    return (
      <ButtonPrimitive
        data-slot="button"
        className={cn(
          buttonVariants({ variant, size, className }),
          "transition-[background-color,border-color,color,box-shadow,transform,opacity] duration-200 ease-out",
          variant !== "link" && "hover:brightness-[1.03] active:not-aria-[haspopup]:translate-y-px focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
        )}
        disabled={loading || props.disabled}
        {...props}
      >
        {loading && <span className="btn-shimmer absolute inset-0 rounded-[inherit] pointer-events-none" />}
        {children}
      </ButtonPrimitive>
    )
  }

  return (
    <motion.div
      className="inline-flex"
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      transition={spring.snappy}
      style={{ borderRadius: "inherit" }}
    >
      <ButtonPrimitive
        data-slot="button"
        className={cn(
          buttonVariants({ variant, size, className }),
          "w-full transition-[background-color,border-color,color,box-shadow,filter] duration-200 ease-out",
          "hover:shadow-[var(--hover-lift-shadow)]",
          variant === "default" && "hover:shadow-[var(--theme-accent-shadow-strong)]",
          variant === "outline" && "hover:bg-[var(--button-outline-hover)] hover:border-[var(--panel-border-strong)]",
          variant === "secondary" && "hover:bg-[var(--surface-hover)] hover:border-[var(--panel-border-strong)]",
          variant === "ghost" && "hover:text-foreground",
          variant === "destructive" && "hover:bg-destructive/15",
          "active:brightness-[0.95]",
          "focus-visible:btn-focus-ring",
          loading && "pointer-events-none",
        )}
        disabled={loading || props.disabled}
        {...props}
      >
        {loading && <span className="btn-shimmer absolute inset-0 rounded-[inherit] pointer-events-none" />}
        {children}
      </ButtonPrimitive>
    </motion.div>
  )
}

export { Button, buttonVariants }
