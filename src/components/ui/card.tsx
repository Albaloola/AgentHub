"use client"

import * as React from "react"
import { useReducedMotion } from "framer-motion"

import { cn } from "@/lib/utils"

function Card({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" }) {
  const prefersReduced = useReducedMotion()
  const ref = React.useRef<HTMLDivElement>(null)

  const handleMouseMove = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReduced) return
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5  // -0.5 to 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    el.style.transform = `perspective(800px) rotateX(${-y * 5}deg) rotateY(${x * 5}deg)`
  }, [prefersReduced])

  const handleMouseLeave = React.useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.transform = ""
  }, [])

  return (
    <div
      ref={ref}
      data-slot="card"
      data-size={size}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "group/card surface-panel flex flex-col gap-4 overflow-hidden rounded-[var(--workspace-radius-md)] py-4 text-sm text-card-foreground",
        "transition-[box-shadow,border-color,transform] duration-300 ease-out",
        "hover:shadow-[var(--panel-shadow-hover)] hover:border-[var(--panel-border-strong)]",
        "has-data-[slot=card-footer]:pb-0 has-[>img:first-child]:pt-0",
        "data-[size=sm]:gap-3 data-[size=sm]:py-3 data-[size=sm]:has-data-[slot=card-footer]:pb-0",
        "*:[img:first-child]:rounded-t-[var(--workspace-radius-md)] *:[img:last-child]:rounded-b-[var(--workspace-radius-md)]",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "group/card-header @container/card-header grid auto-rows-min items-start gap-1 rounded-t-[var(--workspace-radius-md)] px-4 group-data-[size=sm]/card:px-3 has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-4 group-data-[size=sm]/card:[.border-b]:pb-3",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        "text-base leading-tight font-medium tracking-[-0.02em] group-data-[size=sm]/card:text-sm",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-4 group-data-[size=sm]/card:px-3", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-[var(--workspace-radius-md)] border-t border-[var(--panel-border)] bg-[var(--surface-muted)] p-4 group-data-[size=sm]/card:p-3",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
