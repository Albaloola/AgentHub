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
        "peer group/switch relative inline-flex shrink-0 items-center rounded-full border transition-all duration-300 outline-none overflow-hidden",
        isDefault ? "h-7 w-12" : "h-5 w-9",
        // Unchecked: dark with subtle border
        "data-unchecked:bg-white/[0.08] data-unchecked:border-white/[0.15]",
        // Checked: colored with glow
        "data-checked:bg-blue-500/20 data-checked:border-blue-400/40 data-checked:shadow-[0_0_12px_rgba(59,130,246,0.3)]",
        // Focus + disabled
        "focus-visible:ring-2 focus-visible:ring-blue-400/50",
        "data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {/* Glow trail that fades from the thumb when checked */}
      <div className={cn(
        "absolute inset-0 rounded-full transition-opacity duration-500",
        "group-data-[checked]/switch:opacity-100 group-data-[unchecked]/switch:opacity-0",
      )}>
        <div
          className="absolute inset-y-0 rounded-full"
          style={{
            left: 0,
            right: isDefault ? 20 : 14,
            background: "linear-gradient(to right, transparent, rgba(59,130,246,0.15), rgba(59,130,246,0.3))",
          }}
        />
      </div>

      {/* Thumb */}
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none relative z-10 block rounded-full bg-white shadow-lg transition-all duration-300",
          isDefault ? "h-5 w-5" : "h-3.5 w-3.5",
          // Unchecked: dim, left
          isDefault
            ? "group-data-[unchecked]/switch:translate-x-0.5 group-data-[checked]/switch:translate-x-[22px]"
            : "group-data-[unchecked]/switch:translate-x-0.5 group-data-[checked]/switch:translate-x-[16px]",
          // Glow on the thumb when checked
          "group-data-[checked]/switch:shadow-[0_0_8px_rgba(59,130,246,0.5),0_0_16px_rgba(59,130,246,0.2)]",
          "group-data-[unchecked]/switch:bg-white/70 group-data-[checked]/switch:bg-white",
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
