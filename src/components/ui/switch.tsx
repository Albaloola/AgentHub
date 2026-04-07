"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { cn } from "@/lib/utils"

function Switch({
  className,
  size = "default",
  checked,
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default"
}) {
  const isDefault = size === "default";

  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      checked={checked}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 items-center rounded-full border cursor-pointer overflow-hidden outline-none",
        isDefault ? "h-7 w-12" : "h-5 w-9",
        "bg-foreground/[0.08] border-foreground/[0.12]",
        "data-checked:bg-foreground/[0.12] data-checked:border-foreground/[0.2]",
        "data-checked:shadow-[0_0_12px_rgba(255,255,255,0.1)]",
        "focus-visible:ring-2 focus-visible:ring-foreground/30",
        "data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {/* Trail - strong behind thumb, fades only at the far end */}
      <div
        className="absolute rounded-full group-data-[unchecked]/switch:opacity-0 group-data-[checked]/switch:opacity-100"
        style={{
          top: isDefault ? "0.3125rem" : "0.1875rem",
          bottom: isDefault ? "0.3125rem" : "0.1875rem",
          left: isDefault ? "0.1875rem" : "0.125rem",
          right: isDefault ? "0.1875rem" : "0.125rem",
          background: "linear-gradient(to left, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.6) 65%, rgba(255,255,255,0.15) 90%, transparent 100%)",
          transition: "opacity 0.3s ease",
        }}
      />

      {/* Thumb - calc-based travel so it's always pixel-perfect */}
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none relative z-10 block rounded-full bg-white",
          isDefault ? "h-5 w-5" : "h-3.5 w-3.5",
          "group-data-[unchecked]/switch:bg-foreground/50",
          "group-data-[checked]/switch:bg-white group-data-[checked]/switch:shadow-[0_0_10px_rgba(255,255,255,0.4),0_0_20px_rgba(255,255,255,0.15)]",
        )}
        style={{
          transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.3s ease, box-shadow 0.3s ease",
          transform: checked
            ? `translateX(${isDefault ? "calc(3rem - 1.25rem - 0.125rem)" : "calc(2.25rem - 0.875rem - 0.125rem)"})`
            : "translateX(0.125rem)",
        }}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
