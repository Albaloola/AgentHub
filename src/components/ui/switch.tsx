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
        "bg-white/[0.08] border-white/[0.12]",
        "data-checked:bg-white/[0.12] data-checked:border-white/[0.2]",
        "data-checked:shadow-[0_0_12px_rgba(255,255,255,0.1)]",
        "focus-visible:ring-2 focus-visible:ring-white/30",
        "data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {/* Trail - only visible when on */}
      <div
        className="absolute rounded-full group-data-[unchecked]/switch:opacity-0 group-data-[checked]/switch:opacity-100"
        style={{
          top: isDefault ? 5 : 3,
          bottom: isDefault ? 5 : 3,
          left: isDefault ? 3 : 2,
          right: isDefault ? 3 : 2,
          background: "linear-gradient(to left, rgba(255,255,255,0.7), rgba(255,255,255,0.2) 50%, transparent)",
          transition: "opacity 0.3s ease",
        }}
      />

      {/* Thumb - using CSS for smooth animation in BOTH directions */}
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none relative z-10 block rounded-full bg-white",
          isDefault ? "h-5 w-5" : "h-3.5 w-3.5",
          "group-data-[unchecked]/switch:bg-white/50",
          "group-data-[checked]/switch:bg-white group-data-[checked]/switch:shadow-[0_0_10px_rgba(255,255,255,0.4),0_0_20px_rgba(255,255,255,0.15)]",
        )}
        style={{
          transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.3s ease, box-shadow 0.3s ease",
          transform: checked
            ? `translateX(${isDefault ? 22 : 16}px)`
            : "translateX(2px)",
        }}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
