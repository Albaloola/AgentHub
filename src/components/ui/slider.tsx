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
  milestones?: number[]
  snapOnRelease?: boolean
  unit?: string
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
  snapOnRelease = true,
  unit = "",
  className,
}: SliderProps) {
  const [internalValue, setInternalValue] = useState(
    controlledValue?.[0] ?? defaultValue?.[0] ?? min
  )
  const [dragging, setDragging] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)

  const currentValue = controlledValue?.[0] ?? internalValue
  const percent = ((currentValue - min) / (max - min)) * 100

  useEffect(() => {
    if (controlledValue?.[0] !== undefined) {
      setInternalValue(controlledValue[0])
    }
  }, [controlledValue])

  const getValueFromPosition = useCallback((clientX: number): number => {
    if (!trackRef.current) return currentValue
    const rect = trackRef.current.getBoundingClientRect()
    const rawPercent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    let val = min + rawPercent * (max - min)
    // Round to step for smooth continuous movement
    val = Math.round(val / step) * step
    return Math.max(min, Math.min(max, val))
  }, [min, max, step, currentValue])

  const snapToMilestone = useCallback((val: number): number => {
    if (!milestones || milestones.length === 0) return val
    let closest = val
    let closestDist = Infinity
    for (const ms of milestones) {
      const dist = Math.abs(val - ms)
      if (dist < closestDist) {
        closestDist = dist
        closest = ms
      }
    }
    // Only snap if within 1.5 steps of a milestone
    if (closestDist <= step * 1.5) return closest
    return val
  }, [milestones, step])

  const updateValue = useCallback((clientX: number) => {
    const val = getValueFromPosition(clientX)
    setInternalValue(val)
    onValueChange?.([val])
  }, [getValueFromPosition, onValueChange])

  const commitValue = useCallback((clientX: number) => {
    let val = getValueFromPosition(clientX)
    if (snapOnRelease) val = snapToMilestone(val)
    setInternalValue(val)
    onValueChange?.([val])
    onValueCommitted?.([val])
  }, [getValueFromPosition, snapToMilestone, snapOnRelease, onValueChange, onValueCommitted])

  useEffect(() => {
    if (!dragging) return
    const handleMove = (e: MouseEvent) => updateValue(e.clientX)
    const handleUp = (e: MouseEvent) => {
      commitValue(e.clientX)
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
  }, [dragging, updateValue, commitValue])

  return (
    <div
      data-slot="slider"
      className={cn("relative flex w-full touch-none items-center select-none py-3", className)}
    >
      {/* Track */}
      <div
        ref={trackRef}
        className="relative h-2 w-full rounded-full bg-foreground/[0.12] cursor-pointer"
        onMouseDown={(e) => {
          updateValue(e.clientX)
          setDragging(true)
        }}
      >
        {/* Filled indicator - fades from transparent to white */}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-none"
          style={{
            width: `${percent}%`,
            background: "linear-gradient(to right, transparent, rgba(255,255,255,0.25) 30%, rgba(255,255,255,0.65))",
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
                "w-[2px] -translate-x-1/2 rounded-full transition-all duration-150",
                isAtMilestone ? "h-4 bg-white" : "h-3 bg-foreground/30",
              )} />
            </div>
          )
        })}
      </div>

      {/* Thumb */}
      <div
        className={cn(
          "absolute rounded-full bg-white cursor-grab",
          dragging
            ? "h-6 w-6 shadow-[0_0_16px_rgba(255,255,255,0.5)]"
            : "h-5 w-5 shadow-[0_0_8px_rgba(255,255,255,0.3)] hover:shadow-[0_0_12px_rgba(255,255,255,0.4)]",
        )}
        style={{
          left: `calc(${percent}% - ${dragging ? 12 : 10}px)`,
          top: "50%",
          transform: "translateY(-50%)",
          transition: dragging ? "none" : "all 0.15s ease",
        }}
        onMouseDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setDragging(true)
        }}
      />

      {/* Value tooltip while dragging */}
      {dragging && (
        <div
          className="absolute -top-8 px-2 py-0.5 rounded-md bg-white text-black text-xs font-bold tabular-nums pointer-events-none"
          style={{
            left: `calc(${percent}% - 16px)`,
            transition: "none",
          }}
        >
          {currentValue}{unit}
        </div>
      )}
    </div>
  )
}

export { SliderControl as Slider }
