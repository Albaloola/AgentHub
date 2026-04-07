"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  size = "default",
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default"
}) {
  const isDefault = size === "default";

  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 items-center rounded-full border transition-all duration-300 outline-none overflow-hidden cursor-pointer",
        isDefault ? "h-7 w-12" : "h-5 w-9",
        "data-unchecked:bg-white/[0.08] data-unchecked:border-white/[0.12]",
        "data-checked:bg-white/[0.12] data-checked:border-white/[0.2]",
        "data-checked:shadow-[0_0_12px_rgba(255,255,255,0.1)]",
        "focus-visible:ring-2 focus-visible:ring-white/30",
        "data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {/* Gradient trail - fades from transparent to white when checked */}
      <div className={cn(
        "absolute inset-0 rounded-full transition-opacity duration-400",
        "group-data-[checked]/switch:opacity-100 group-data-[unchecked]/switch:opacity-0",
      )}>
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            right: isDefault ? 18 : 12,
            background: "linear-gradient(to right, transparent, rgba(255,255,255,0.15) 40%, rgba(255,255,255,0.45))",
          }}
        />
      </div>

      {/* Thumb - solid white with white glow */}
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none relative z-10 block rounded-full transition-all duration-300",
          isDefault ? "h-5 w-5" : "h-3.5 w-3.5",
          isDefault
            ? "group-data-[unchecked]/switch:translate-x-0.5 group-data-[checked]/switch:translate-x-[22px]"
            : "group-data-[unchecked]/switch:translate-x-0.5 group-data-[checked]/switch:translate-x-[16px]",
          "group-data-[unchecked]/switch:bg-white/50 group-data-[unchecked]/switch:shadow-[0_0_4px_rgba(255,255,255,0.15)]",
          "group-data-[checked]/switch:bg-white group-data-[checked]/switch:shadow-[0_0_10px_rgba(255,255,255,0.4),0_0_20px_rgba(255,255,255,0.15)]",
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
