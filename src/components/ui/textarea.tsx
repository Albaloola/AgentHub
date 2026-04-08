import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "surface-input flex field-sizing-content min-h-16 w-full rounded-lg px-3 py-2.5 text-base text-foreground outline-none md:text-sm",
        "transition-[background-color,border-color,box-shadow] duration-200 ease-out",
        "placeholder:text-muted-foreground/80",
        "hover:border-[var(--panel-border-strong)]",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:shadow-[0_0_0_3px_var(--theme-accent-soft),var(--input-shadow)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
