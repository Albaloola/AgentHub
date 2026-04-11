"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"
import { spring } from "@/lib/animation"

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
  const prefersReduced = useReducedMotion()

  const currentValue = controlledValue?.[0] ?? internalValue
  const percent = ((currentValue - min) / (max - min)) * 100

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (controlledValue?.[0] !== undefined) {
      setInternalValue(controlledValue[0])
    }
  }, [controlledValue])
  /* eslint-enable react-hooks/set-state-in-effect */

  const getValueFromPosition = useCallback((clientX: number): number => {
    if (!trackRef.current) return currentValue
    const rect = trackRef.current.getBoundingClientRect()
    const rawPercent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    let val = min + rawPercent * (max - min)
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
        className="relative h-2.5 w-full cursor-pointer rounded-full border border-[var(--panel-border)] bg-[var(--surface-muted)]"
        onMouseDown={(e) => {
          updateValue(e.clientX)
          setDragging(true)
        }}
      >
        {/* Filled indicator with glow */}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-none"
          style={{
            width: `${percent}%`,
            background: "var(--slider-fill)",
            boxShadow: dragging
              ? "0 0 8px 1px color-mix(in srgb, var(--theme-accent) 20%, transparent)"
              : "none",
            transition: dragging ? "box-shadow 0.2s ease" : "box-shadow 0.3s ease",
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
                isAtMilestone ? "h-4 bg-[var(--theme-accent-text)]" : "h-3 bg-foreground/22",
              )} />
            </div>
          )
        })}
      </div>

      {/* Thumb — animated scale on drag */}
      <motion.div
        className="absolute rounded-full bg-[var(--thumb-color)] cursor-grab"
        animate={{
          scale: dragging ? 1.15 : 1,
        }}
        transition={prefersReduced ? { duration: 0 } : spring.snappy}
        style={{
          width: 20,
          height: 20,
          left: `calc(${percent}% - 10px)`,
          top: "50%",
          y: "-50%",
          boxShadow: dragging
            ? "var(--slider-thumb-shadow-active)"
            : "var(--slider-thumb-shadow)",
          transition: dragging ? "left 0s, box-shadow 0.2s ease" : "left 0.15s ease, box-shadow 0.2s ease",
        }}
        onMouseDown={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setDragging(true)
        }}
      />

      {/* Value tooltip — spring entrance on drag, dismiss on release */}
      <AnimatePresence>
        {dragging && (
          <motion.div
            className="surface-panel-strong absolute -top-9 rounded-md px-2 py-0.5 text-xs font-bold text-foreground tabular-nums pointer-events-none"
            style={{
              left: `calc(${percent}% - 16px)`,
            }}
            initial={prefersReduced ? false : { opacity: 0, y: 4, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.9 }}
            transition={spring.snappy}
          >
            {currentValue}{unit}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export { SliderControl as Slider }
