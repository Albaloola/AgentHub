"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"
import { spring } from "@/lib/animation"

type SwitchProps = SwitchPrimitive.Root.Props

interface Particle {
  id: number
  x: number
  y: number
  size: number
}

let particleId = 0

const TRACK_WIDTH = 44
const TRACK_HEIGHT = 24
const THUMB_SIZE = 20
const THUMB_INSET = 2

function Switch({
  className,
  checked,
  onCheckedChange,
  ...props
}: SwitchProps) {
  const prefersReducedMotion = useReducedMotion()
  const [particles, setParticles] = useState<Particle[]>([])
  const prevChecked = useRef(checked)

  // Calculate thumb travel distance
  // travel = trackWidth - thumbSize - (padding * 2)
  // travel = 44 - 20 - 4 = 20px
  const travel = TRACK_WIDTH - THUMB_SIZE - THUMB_INSET * 2

  // Spawn particles on toggle ON
  useEffect(() => {
    if (checked && !prevChecked.current) {
      // Spawn particles if motion is not reduced
      if (!prefersReducedMotion) {
        const particleCount = 4 + Math.floor(Math.random() * 3) // 4-6 particles
        const newParticles: Particle[] = Array.from({ length: particleCount }, () => ({
          id: ++particleId,
          x: 0,
          y: 0,
          size: 3 + Math.random() * 2, // 3-5px
        }))
        setParticles(newParticles)

        // Clear particles after animation
        const timer = setTimeout(() => setParticles([]), 400)
        return () => clearTimeout(timer)
      }
    }

    prevChecked.current = checked
  }, [checked, prefersReducedMotion])

  const handleChange = useCallback((val: boolean, event: SwitchPrimitive.Root.ChangeEventDetails) => {
    onCheckedChange?.(val, event)
  }, [onCheckedChange])

  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      checked={checked}
      onCheckedChange={handleChange}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 cursor-pointer overflow-visible outline-none",
        "rounded-full border transition-[border-color,box-shadow] duration-300",
        "h-[24px] w-[44px]",
        "bg-[var(--muted)] border-[var(--panel-border)]",
        "data-checked:bg-[var(--muted)] data-checked:border-[var(--theme-accent-border)]",
        "focus-visible:ring-2 focus-visible:ring-ring/30",
        "data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {/* Colored portion tracking the thumb */}
      <motion.div
        className="absolute bottom-0 left-0 top-0 pointer-events-none rounded-full bg-[var(--theme-accent-softer)] ring-1 ring-inset ring-[var(--theme-accent-soft)]"
        style={{ margin: THUMB_INSET }}
        animate={{ width: checked ? travel + THUMB_SIZE : THUMB_SIZE, opacity: checked ? 1 : 0.2 }}
        transition={prefersReducedMotion ? { duration: 0 } : spring.bouncy}
      />

      {/* Thumb — spring-animated position with absolute positioning */}
      <motion.span
        data-slot="switch-thumb"
        className="pointer-events-none absolute z-10 block rounded-full"
        style={{
          width: THUMB_SIZE,
          height: THUMB_SIZE,
          top: THUMB_INSET,
          left: THUMB_INSET,
          backgroundColor: checked ? "var(--thumb-color)" : "color-mix(in srgb, var(--foreground) 45%, transparent)",
          boxShadow: checked ? "var(--thumb-checked-shadow)" : "var(--thumb-unchecked-shadow)",
        }}
        animate={{
          x: checked ? travel : 0,
        }}
        transition={prefersReducedMotion ? { duration: 0 } : spring.bouncy}
      />

      {/* Particle burst on toggle-ON */}
      <AnimatePresence>
        {particles.map((p, index) => {
          // Calculate radial position
          const angle = (index / particles.length) * Math.PI * 2 + (Math.random() * 0.5 - 0.25)
          const distance = 15 + Math.random() * 10 // 15-25px

          return (
            <motion.span
              key={p.id}
              className="absolute z-20 rounded-full pointer-events-none"
              style={{
                width: p.size,
                height: p.size,
                backgroundColor: "var(--theme-accent)",
                // Position at thumb's final location (right side when checked)
                left: THUMB_INSET + travel + THUMB_SIZE / 2 - p.size / 2,
                top: TRACK_HEIGHT / 2 - p.size / 2,
              }}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{
                x: Math.cos(angle) * distance,
                y: Math.sin(angle) * distance,
                opacity: 0,
                scale: 0,
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: prefersReducedMotion ? 0 : 0.3,
                ease: [0.4, 0, 0.2, 1],
              }}
            />
          )
        })}
      </AnimatePresence>
    </SwitchPrimitive.Root>
  )
}

export { Switch }
