"use client"

import * as React from "react"
import { Slider } from "@base-ui/react/slider"

import { cn } from "@/lib/utils"

function SliderControl({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: Slider.Root.Props & {
  className?: string
}) {
  return (
    <Slider.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full touch-none items-center select-none",
        className
      )}
      {...props}
    >
      <Slider.Control
        className={cn(
          "relative h-1.5 w-full grow overflow-hidden rounded-full bg-white/[0.08]"
        )}
      >
        <Slider.Indicator className="absolute inset-y-0 left-0 rounded-full bg-oklch(0.55_0.24_264_/0.6)" />
      </Slider.Control>
      <Slider.Thumb
        className={cn(
          "block h-4 w-4 rounded-full border-2 border-oklch(0.55_0.24_264) bg-background shadow-[0_0_8px_oklch(0.55_0.24_264_/0.3)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oklch(0.55_0.24_264_/0.5) disabled:pointer-events-none disabled:opacity-50"
        )}
      />
    </Slider.Root>
  )
}

export { SliderControl as Slider }
