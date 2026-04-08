"use client"

import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible"
import { cn } from "@/lib/utils"

function Collapsible({ ...props }: CollapsiblePrimitive.Root.Props) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />
}

function CollapsibleTrigger({
  className,
  ...props
}: CollapsiblePrimitive.Trigger.Props) {
  return (
    <CollapsiblePrimitive.Trigger
      data-slot="collapsible-trigger"
      className={cn(
        /* Chevron child auto-rotates: any direct SVG or [data-slot=chevron] rotates on open */
        "[&_svg]:transition-transform [&_svg]:duration-300 [&_svg]:ease-[cubic-bezier(0.68,-0.55,0.265,1.55)]",
        "[&[data-open]_svg[data-slot=chevron]]:rotate-180",
        "[&[data-open]>[svg]]:rotate-180",
        className,
      )}
      {...props}
    />
  )
}

function CollapsibleContent({
  className,
  ...props
}: CollapsiblePrimitive.Panel.Props) {
  return (
    <CollapsiblePrimitive.Panel
      data-slot="collapsible-content"
      className={cn(
        "overflow-hidden",
        /* Height animation: base-ui sets --collapsible-panel-height automatically */
        "h-0 data-open:h-[var(--collapsible-panel-height)]",
        "transition-[height,opacity] duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]",
        /* Content fade: slightly delayed on open, immediate on close */
        "opacity-0 data-open:opacity-100",
        "data-open:delay-75",
        className,
      )}
      {...props}
    />
  )
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
