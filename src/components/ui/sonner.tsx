"use client"

import { useEffect, useRef, useState, type MutableRefObject } from "react"
import { Toaster as Sonner, useSonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"
import { useStore } from "@/lib/store"
import { resolveThemePreference } from "@/lib/themes"

const Toaster = ({ ...props }: ToasterProps) => {
  const themePref = useStore((s) => s.uiPrefs.theme)
  const soundEffects = useStore((s) => s.uiPrefs.soundEffects)
  const { toasts } = useSonner()
  const [theme, setTheme] = useState<"dark" | "light">("dark")
  const seenToastIds = useRef<Set<string | number>>(new Set())
  const audioContextRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const apply = (prefersDark: boolean) => {
      setTheme(resolveThemePreference(themePref, prefersDark).mode)
    }

    apply(mq.matches)
    if (themePref !== "system") return

    const handleChange = (event: MediaQueryListEvent) => apply(event.matches)
    mq.addEventListener("change", handleChange)
    return () => mq.removeEventListener("change", handleChange)
  }, [themePref])

  useEffect(() => {
    if (!soundEffects) {
      seenToastIds.current = new Set(toasts.map((toast) => toast.id))
      return
    }

    const seen = seenToastIds.current
    const freshToasts = toasts.filter((toast) => !seen.has(toast.id))
    if (freshToasts.length === 0) return

    for (const toast of freshToasts) {
      seen.add(toast.id)
      if (toast.type === "loading") continue
      playToastSound(audioContextRef, toast.type)
    }
  }, [soundEffects, toasts])

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-right"
      visibleToasts={4}
      gap={8}
      offset={16}
      richColors
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast glass-strong !border-[var(--glass-border-color)] !shadow-[var(--panel-shadow)]",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }

function playToastSound(
  audioContextRef: MutableRefObject<AudioContext | null>,
  type: "normal" | "action" | "success" | "info" | "warning" | "error" | "loading" | "default" | undefined,
) {
  if (typeof window === "undefined") return

  const AudioContextCtor =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

  if (!AudioContextCtor) return

  const context = audioContextRef.current ?? new AudioContextCtor()
  audioContextRef.current = context

  if (context.state === "suspended") {
    void context.resume().catch(() => {})
  }

  const config = getToastTone(type)
  const now = context.currentTime

  const oscillator = context.createOscillator()
  const gain = context.createGain()

  oscillator.type = config.wave
  oscillator.frequency.setValueAtTime(config.frequency, now)
  oscillator.frequency.exponentialRampToValueAtTime(config.frequency * config.sweep, now + config.duration)

  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(config.volume, now + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + config.duration)

  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start(now)
  oscillator.stop(now + config.duration + 0.02)
}

function getToastTone(type: "normal" | "action" | "success" | "info" | "warning" | "error" | "loading" | "default" | undefined) {
  switch (type) {
    case "success":
      return { frequency: 560, sweep: 1.18, duration: 0.16, volume: 0.018, wave: "triangle" as const }
    case "error":
      return { frequency: 240, sweep: 0.82, duration: 0.2, volume: 0.024, wave: "sawtooth" as const }
    case "warning":
      return { frequency: 420, sweep: 0.94, duration: 0.18, volume: 0.02, wave: "square" as const }
    case "info":
      return { frequency: 460, sweep: 1.08, duration: 0.14, volume: 0.016, wave: "sine" as const }
    default:
      return { frequency: 360, sweep: 1.05, duration: 0.12, volume: 0.012, wave: "triangle" as const }
  }
}
