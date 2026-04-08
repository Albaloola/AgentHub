"use client"

import { useEffect, useState } from "react"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"
import { useStore } from "@/lib/store"
import { resolveThemePreference } from "@/lib/themes"

const Toaster = ({ ...props }: ToasterProps) => {
  const themePref = useStore((s) => s.uiPrefs.theme)
  const [theme, setTheme] = useState<"dark" | "light">("dark")

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

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-right"
      visibleToasts={4}
      gap={8}
      offset={16}
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
