"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface Particle {
  id: number
  x: number
  y: number
  angle: number
  distance: number
  size: number
  duration: number
}

interface ParticleBurstProps {
  trigger: boolean
  origin?: { x: number; y: number }
  particleCount?: number
  color?: string
}

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 360 + Math.random() * 30 - 15
    const distance = 15 + Math.random() * 10
    return {
      id: i,
      x: 0,
      y: 0,
      angle,
      distance,
      size: 3 + Math.random() * 2,
      duration: 300 + Math.random() * 100,
    }
  })
}

export function ParticleBurst({
  trigger,
  origin = { x: 0, y: 0 },
  particleCount = 6,
  color = "var(--theme-accent)",
}: ParticleBurstProps) {
  const [particles, setParticles] = useState<Particle[]>([])
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    if (trigger && !isActive) {
      setIsActive(true)
      setParticles(generateParticles(particleCount))

      const timer = setTimeout(() => {
        setIsActive(false)
        setParticles([])
      }, 450)

      return () => clearTimeout(timer)
    }
  }, [trigger, isActive, particleCount])

  return (
    <AnimatePresence>
      {isActive && (
        <div
          className="pointer-events-none fixed inset-0 z-[100]"
          style={{
            left: origin.x,
            top: origin.y,
          }}
        >
          {particles.map((particle) => {
            const radians = (particle.angle * Math.PI) / 180
            const targetX = Math.cos(radians) * particle.distance
            const targetY = Math.sin(radians) * particle.distance

            return (
              <motion.div
                key={particle.id}
                className="absolute rounded-full"
                style={{
                  width: particle.size,
                  height: particle.size,
                  backgroundColor: color,
                  left: -particle.size / 2,
                  top: -particle.size / 2,
                }}
                initial={{
                  x: 0,
                  y: 0,
                  opacity: 0.3,
                  scale: 0,
                }}
                animate={{
                  x: targetX,
                  y: targetY,
                  opacity: 0,
                  scale: 1,
                }}
                exit={{
                  opacity: 0,
                }}
                transition={{
                  duration: particle.duration / 1000,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
              />
            )
          })}
        </div>
      )}
    </AnimatePresence>
  )
}
