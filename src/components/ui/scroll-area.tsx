"use client"

import * as React from "react"
import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area"

import { cn } from "@/lib/utils"

function ScrollArea({
  className,
  children,
  ...props
}: ScrollAreaPrimitive.Root.Props) {
  const viewportRef = React.useRef<HTMLDivElement>(null)
  const [scrollState, setScrollState] = React.useState({ top: false, bottom: false })
  const scrollTimer = React.useRef<ReturnType<typeof setTimeout>>(null)
  const [scrolling, setScrolling] = React.useState(false)

  const handleScroll = React.useCallback(() => {
    const el = viewportRef.current
    if (!el) return

    // Show thumb while scrolling
    setScrolling(true)
    if (scrollTimer.current) clearTimeout(scrollTimer.current)
    scrollTimer.current = setTimeout(() => setScrolling(false), 1000)

    // Calculate scroll shadow state
    const atTop = el.scrollTop > 2
    const atBottom = el.scrollTop + el.clientHeight < el.scrollHeight - 2
    setScrollState((prev) => {
      if (prev.top === atTop && prev.bottom === atBottom) return prev
      return { top: atTop, bottom: atBottom }
    })
  }, [])

  // Initial check on mount
  React.useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const obs = new ResizeObserver(handleScroll)
    obs.observe(el)
    handleScroll()
    return () => obs.disconnect()
  }, [handleScroll])

  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      data-scrolling={scrolling || undefined}
      className={cn("relative", className)}
      {...props}
    >
      {/* Top scroll shadow */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-6 rounded-t-[inherit] transition-opacity duration-300"
        style={{
          background: "linear-gradient(to bottom, var(--background), transparent)",
          opacity: scrollState.top ? 0.8 : 0,
        }}
      />

      <ScrollAreaPrimitive.Viewport
        ref={viewportRef}
        data-slot="scroll-area-viewport"
        className="size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1"
        onScroll={handleScroll}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>

      {/* Bottom scroll shadow */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-6 rounded-b-[inherit] transition-opacity duration-300"
        style={{
          background: "linear-gradient(to top, var(--background), transparent)",
          opacity: scrollState.bottom ? 0.8 : 0,
        }}
      />

      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: ScrollAreaPrimitive.Scrollbar.Props) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "flex touch-none p-px select-none",
        "transition-opacity duration-300",
        "opacity-0 group-data-[scrolling]/scroll-area:opacity-100 hover:opacity-100",
        "data-horizontal:h-2.5 data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent",
        "data-vertical:h-full data-vertical:w-2.5 data-vertical:border-l data-vertical:border-l-transparent",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-[var(--scrollbar-thumb)] transition-[background-color] duration-200 hover:bg-[var(--scrollbar-thumb-hover)]"
      />
    </ScrollAreaPrimitive.Scrollbar>
  )
}

export { ScrollArea, ScrollBar }
