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
        "relative flex w-full touch-none items-center select-none py-2",
        className
      )}
      {...props}
    >
      <Slider.Control
        className="relative h-2 w-full grow overflow-hidden rounded-full bg-white/[0.15]"
      >
        <Slider.Indicator className="absolute inset-y-0 left-0 rounded-full bg-blue-500" />
      </Slider.Control>
      <Slider.Thumb
        className="block h-5 w-5 rounded-full border-2 border-blue-400 bg-white shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 disabled:pointer-events-none disabled:opacity-50"
      />
    </Slider.Root>
  )
}

export { SliderControl as Slider }
