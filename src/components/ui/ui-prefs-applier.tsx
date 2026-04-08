"use client";

import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { THEME_CLASS_NAMES, resolveThemePreference } from "@/lib/themes";

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
  const uiPrefs = useStore((s) => s.uiPrefs);

  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = (prefersDark: boolean) => {
      const resolved = resolveThemePreference(uiPrefs.theme, prefersDark);

      root.classList.remove(...THEME_CLASS_NAMES);
      root.classList.toggle("dark", resolved.mode === "dark");
      root.classList.add(resolved.className);
      root.dataset.theme = resolved.id;
      root.dataset.themeMode = resolved.mode;
      root.style.colorScheme = resolved.mode;
    };

    // Density
    root.setAttribute("data-density", uiPrefs.density);

    // Font size — acts as a multiplier on the fluid base (16px = 1.0x, default)
    // The CSS :root has font-size: clamp(14px, 0.625rem + 0.4vw, 22px)
    // We scale that by the user's preference: 16px=100%, 18px=112.5%, 14px=87.5%
    const fontScale = uiPrefs.fontSize / 16;
    root.style.fontSize = `calc(clamp(14px, 0.625rem + 0.4vw, 22px) * ${fontScale})`;

    // Zoom - use CSS zoom property (Chrome/Safari/Edge/Firefox 126+)
    const zoom = uiPrefs.zoom ?? 100;
    if (zoom !== 100) {
      // CSS zoom accepts a number (1.25) or percentage string ("125%")
      // Use the number form for widest support
      root.style.setProperty("zoom", String(zoom / 100));
      // Firefox < 126 fallback: use transform scale
      const isFirefox = typeof navigator !== "undefined" && /Firefox/.test(navigator.userAgent);
      if (isFirefox) {
        root.style.transform = `scale(${zoom / 100})`;
        root.style.transformOrigin = "0 0";
        root.style.width = `${10000 / zoom}%`;
      }
    } else {
      root.style.removeProperty("zoom");
      root.style.transform = "";
      root.style.transformOrigin = "";
      root.style.width = "";
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
    root.style.setProperty("--glass-glow-intensity", `${(uiPrefs.glowIntensity ?? 0.5) * 100}%`);

    // Theme
    applyTheme(window.matchMedia("(prefers-color-scheme: dark)").matches);
  }, [uiPrefs]);

  // Listen for system theme changes when theme is set to "system"
  useEffect(() => {
    if (uiPrefs.theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      const resolved = resolveThemePreference(uiPrefs.theme, e.matches);
      const root = document.documentElement;
      root.classList.remove(...THEME_CLASS_NAMES);
      root.classList.toggle("dark", resolved.mode === "dark");
      root.classList.add(resolved.className);
      root.dataset.theme = resolved.id;
      root.dataset.themeMode = resolved.mode;
      root.style.colorScheme = resolved.mode;
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [uiPrefs.theme]);

  return null;
}

export { FONT_FAMILIES };
