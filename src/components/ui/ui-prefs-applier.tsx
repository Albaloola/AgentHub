"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";

// Font CDN links for fonts not bundled with Next.js
const FONT_CDNS: Record<string, string> = {
  inter: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
  "ibm-plex": "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap",
  "plus-jakarta": "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap",
  "jetbrains-mono": "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap",
  caveat: "https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&display=swap",
  "comic-neue": "https://fonts.googleapis.com/css2?family=Comic+Neue:wght@300;400;700&display=swap",
  nunito: "https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700&display=swap",
  lexend: "https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&display=swap",
};

const FONT_FAMILIES: Record<string, string> = {
  geist: "var(--font-geist-sans), system-ui, sans-serif",
  inter: "'Inter', system-ui, sans-serif",
  "jetbrains-mono": "'JetBrains Mono', ui-monospace, monospace",
  "ibm-plex": "'IBM Plex Sans', system-ui, sans-serif",
  "plus-jakarta": "'Plus Jakarta Sans', system-ui, sans-serif",
  caveat: "'Caveat', cursive",
  "comic-neue": "'Comic Neue', cursive",
  nunito: "'Nunito', system-ui, sans-serif",
  lexend: "'Lexend', system-ui, sans-serif",
};

// Track which fonts we've already loaded
const loadedFonts = new Set<string>();

function loadFont(fontKey: string) {
  if (loadedFonts.has(fontKey)) return;
  const url = FONT_CDNS[fontKey];
  if (!url) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = url;
  link.id = `agenthub-font-${fontKey}`;
  document.head.appendChild(link);
  loadedFonts.add(fontKey);
}

export function UiPrefsApplier() {
  const { uiPrefs } = useStore();

  useEffect(() => {
    const root = document.documentElement;

    // Density
    root.setAttribute("data-density", uiPrefs.density);

    // Font size
    root.style.fontSize = `${uiPrefs.fontSize}px`;

    // Zoom - use CSS zoom (works in Chrome/Safari/Edge)
    const zoom = uiPrefs.zoom ?? 100;
    if (zoom !== 100) {
      root.style.zoom = `${zoom}%`;
      // Firefox fallback: use transform scale
      root.style.setProperty("-moz-transform", `scale(${zoom / 100})`);
      root.style.setProperty("-moz-transform-origin", "0 0");
    } else {
      root.style.zoom = "";
      root.style.removeProperty("-moz-transform");
      root.style.removeProperty("-moz-transform-origin");
    }

    // Font families - load from CDN if needed
    const fontKey = uiPrefs.fontFamily || "geist";
    const titleKey = uiPrefs.titleFont || fontKey;
    const chatKey = uiPrefs.chatFont || fontKey;
    if (fontKey !== "geist") loadFont(fontKey);
    if (titleKey !== "geist" && titleKey !== fontKey) loadFont(titleKey);
    if (chatKey !== "geist" && chatKey !== fontKey && chatKey !== titleKey) loadFont(chatKey);
    root.style.fontFamily = FONT_FAMILIES[fontKey] || FONT_FAMILIES.geist;
    root.style.setProperty("--font-title", FONT_FAMILIES[titleKey] || FONT_FAMILIES[fontKey] || FONT_FAMILIES.geist);
    root.style.setProperty("--font-chat", FONT_FAMILIES[chatKey] || FONT_FAMILIES[fontKey] || FONT_FAMILIES.geist);

    // Animations
    if (!uiPrefs.animationsEnabled) {
      root.classList.add("animations-disabled");
    } else {
      root.classList.remove("animations-disabled");
    }

    // Ambient background
    if (!uiPrefs.ambientBackground) {
      root.classList.add("ambient-hidden");
    } else {
      root.classList.remove("ambient-hidden");
    }

    // Glass glow settings
    root.style.setProperty("--glass-glow-color", uiPrefs.glowColor);
    root.style.setProperty("--agent-glow-color", uiPrefs.agentGlowColor);
    root.style.setProperty("--glass-glow-spread", (uiPrefs.glowSpread ?? 20).toString());
  }, [uiPrefs]);

  return null;
}

export { FONT_FAMILIES };
