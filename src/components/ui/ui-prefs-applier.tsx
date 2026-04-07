"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";

const FONT_FAMILIES: Record<string, string> = {
  geist: "var(--font-geist-sans)",
  inter: "Inter, system-ui, -apple-system, sans-serif",
  "jetbrains-mono": "JetBrains Mono, ui-monospace, monospace",
  "ibm-plex": "IBM Plex Sans, system-ui, sans-serif",
  "sf-pro": "SF Pro Display, -apple-system, system-ui, sans-serif",
  "plus-jakarta": "Plus Jakarta Sans, system-ui, sans-serif",
};

export function UiPrefsApplier() {
  const { uiPrefs } = useStore();

  useEffect(() => {
    document.documentElement.setAttribute("data-density", uiPrefs.density);
    document.documentElement.style.fontSize = `${uiPrefs.fontSize}px`;

    const fontFamily = FONT_FAMILIES[uiPrefs.fontFamily] || FONT_FAMILIES.geist;
    document.documentElement.style.fontFamily = fontFamily;

    if (!uiPrefs.animationsEnabled) {
      document.documentElement.classList.add("animations-disabled");
    } else {
      document.documentElement.classList.remove("animations-disabled");
    }

    if (!uiPrefs.ambientBackground) {
      document.documentElement.classList.add("ambient-hidden");
    } else {
      document.documentElement.classList.remove("ambient-hidden");
    }

    // Glass glow settings
    document.documentElement.style.setProperty("--glass-glow-color", uiPrefs.glowColor);
    document.documentElement.style.setProperty("--agent-glow-color", uiPrefs.agentGlowColor);
    document.documentElement.style.setProperty("--glass-glow-spread", uiPrefs.glowSpread.toString());
  }, [uiPrefs]);

  return null;
}
