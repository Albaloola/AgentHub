"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { cn } from "@/lib/utils"

interface SliderProps {
  min?: number
  max?: number
  step?: number
  value?: number[]
  defaultValue?: number[]
  onValueChange?: (value: number[]) => void
  onValueCommitted?: (value: number[]) => void
  /** Milestone values that show notches and have snap-to behavior */
  milestones?: number[]
  /** Snap distance in pixels - how close the thumb needs to be to snap */
  snapDistance?: number
  className?: string
}

function SliderControl({
  min = 0,
  max = 100,
  step = 1,
  value: controlledValue,
  defaultValue,
  onValueChange,
  onValueCommitted,
  milestones,
  snapDistance = 8,
  className,
}: SliderProps) {
  const [internalValue, setInternalValue] = useState(
    controlledValue?.[0] ?? defaultValue?.[0] ?? min
  )
  const [dragging, setDragging] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)

  const currentValue = controlledValue?.[0] ?? internalValue
  const percent = ((currentValue - min) / (max - min)) * 100

  // Sync with controlled value
  useEffect(() => {
    if (controlledValue?.[0] !== undefined) {
      setInternalValue(controlledValue[0])
    }
  }, [controlledValue])

  const getValueFromPosition = useCallback((clientX: number): number => {
    if (!trackRef.current) return currentValue
    const rect = trackRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const rawPercent = Math.max(0, Math.min(1, x / rect.width))
    let val = min + rawPercent * (max - min)

    // Snap to step
    val = Math.round(val / step) * step

    // Snap to milestones if close enough
    if (milestones && trackRef.current) {
      const pxPerUnit = rect.width / (max - min)
      for (const ms of milestones) {
        const msPx = (ms - min) * pxPerUnit
        const valPx = (val - min) * pxPerUnit
        if (Math.abs(valPx - msPx) < snapDistance) {
          val = ms
          break
        }
      }
    }

    return Math.max(min, Math.min(max, val))
  }, [min, max, step, milestones, snapDistance, currentValue])

  const updateValue = useCallback((clientX: number, commit = false) => {
    const val = getValueFromPosition(clientX)
    setInternalValue(val)
    onValueChange?.([val])
    if (commit) onValueCommitted?.([val])
  }, [getValueFromPosition, onValueChange, onValueCommitted])

  // Drag handlers
  useEffect(() => {
    if (!dragging) return
    const handleMove = (e: MouseEvent) => updateValue(e.clientX)
    const handleUp = (e: MouseEvent) => {
      updateValue(e.clientX, true)
      setDragging(false)
    }
    document.addEventListener("mousemove", handleMove)
    document.addEventListener("mouseup", handleUp)
    document.body.style.cursor = "grabbing"
    document.body.style.userSelect = "none"
    return () => {
      document.removeEventListener("mousemove", handleMove)
      document.removeEventListener("mouseup", handleUp)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
  }, [dragging, updateValue])

  return (
    <div
      data-slot="slider"
      className={cn("relative flex w-full touch-none items-center select-none py-3", className)}
    >
      {/* Track */}
      <div
        ref={trackRef}
        className="relative h-2 w-full rounded-full bg-white/[0.12] cursor-pointer"
        onMouseDown={(e) => {
          updateValue(e.clientX)
          setDragging(true)
        }}
      >
        {/* Filled indicator - fades from transparent on the left to white */}
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${percent}%`,
            background: `linear-gradient(to right, transparent, rgba(255,255,255,0.3) 30%, rgba(255,255,255,0.7))`,
          }}
        />

        {/* Milestone notches */}
        {milestones?.map((ms) => {
          const msPercent = ((ms - min) / (max - min)) * 100
          const isAtMilestone = currentValue === ms
          return (
            <div
              key={ms}
              className="absolute top-1/2 -translate-y-1/2"
              style={{ left: `${msPercent}%` }}
            >
              <div className={cn(
                "w-[2px] h-3 -translate-x-1/2 rounded-full transition-all duration-200",
                isAtMilestone ? "bg-white h-4" : "bg-white/40",
              )} />
            </div>
          )
        })}
      </div>

      {/* Thumb */}
      <div
        className={cn(
          "absolute h-5 w-5 rounded-full bg-white border-2 border-white/80 cursor-grab transition-transform duration-100",
          dragging ? "scale-110 shadow-[0_0_14px_rgba(255,255,255,0.4)]" : "shadow-[0_0_8px_rgba(255,255,255,0.25)] hover:scale-110",
        )}
        style={{
          left: `calc(${percent}% - 10px)`,
          top: "50%",
          transform: `translateY(-50%)${dragging ? " scale(1.1)" : ""}`,
        }}
        onMouseDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setDragging(true)
        }}
      />
    </div>
  )
}

export { SliderControl as Slider }
