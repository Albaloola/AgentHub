import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "surface-input h-9 w-full min-w-0 rounded-lg px-3 py-1.5 text-base text-foreground outline-none md:text-sm",
        "transition-[background-color,border-color,box-shadow] duration-200 ease-out",
        "placeholder:text-muted-foreground/80",
        "hover:border-[var(--panel-border-strong)]",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:shadow-[0_0_0_3px_var(--theme-accent-soft),var(--input-shadow)]",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20",
        "file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Input }
