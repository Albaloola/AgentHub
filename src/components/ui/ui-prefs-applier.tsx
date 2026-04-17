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

const DENSITY_VARS = {
  compact: {
    scale: "0.88",
    shellGap: "0.75rem",
    shellSectionGap: "1.1rem",
    shellPad: "0.9rem",
    shellCardPad: "0.85rem",
    sidebarWidth: "292px",
    sidebarCollapsedWidth: "78px",
    topbarHeight: "3.25rem",
    railRowPadX: "0.8rem",
    railRowPadY: "0.72rem",
    composerMaxWidth: "56rem",
    emptyStateScale: "0.92",
  },
  comfortable: {
    scale: "1",
    shellGap: "0.95rem",
    shellSectionGap: "1.4rem",
    shellPad: "1rem",
    shellCardPad: "1rem",
    sidebarWidth: "320px",
    sidebarCollapsedWidth: "82px",
    topbarHeight: "3.5rem",
    railRowPadX: "0.95rem",
    railRowPadY: "0.82rem",
    composerMaxWidth: "60rem",
    emptyStateScale: "1",
  },
  spacious: {
    scale: "1.12",
    shellGap: "1.1rem",
    shellSectionGap: "1.75rem",
    shellPad: "1.15rem",
    shellCardPad: "1.15rem",
    sidebarWidth: "352px",
    sidebarCollapsedWidth: "90px",
    topbarHeight: "3.75rem",
    railRowPadX: "1.05rem",
    railRowPadY: "0.95rem",
    composerMaxWidth: "64rem",
    emptyStateScale: "1.06",
  },
} as const;

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
    const densityVars = DENSITY_VARS[uiPrefs.density] ?? DENSITY_VARS.comfortable;
    root.style.setProperty("--density-scale", densityVars.scale);
    root.style.setProperty("--shell-gap", densityVars.shellGap);
    root.style.setProperty("--shell-section-gap", densityVars.shellSectionGap);
    root.style.setProperty("--shell-pad", densityVars.shellPad);
    root.style.setProperty("--shell-card-pad", densityVars.shellCardPad);
    root.style.setProperty("--sidebar-width", densityVars.sidebarWidth);
    root.style.setProperty("--sidebar-collapsed-width", densityVars.sidebarCollapsedWidth);
    root.style.setProperty("--topbar-height", densityVars.topbarHeight);
    root.style.setProperty("--rail-row-pad-x", densityVars.railRowPadX);
    root.style.setProperty("--rail-row-pad-y", densityVars.railRowPadY);
    root.style.setProperty("--composer-max-width", densityVars.composerMaxWidth);
    root.style.setProperty("--empty-state-scale", densityVars.emptyStateScale);

    // Fluid UI scale.
    // We keep scaling inside the root font-size instead of CSS zoom so viewport
    // measurements, overflow, and sticky/fixed layout math stay stable.
    const fontScale = uiPrefs.fontSize / 16;
    const interfaceScale = (uiPrefs.zoom ?? 100) / 100;
    const combinedScale = fontScale * interfaceScale;
    root.style.fontSize = `calc(clamp(14px, 0.625rem + 0.4vw, 22px) * ${combinedScale})`;
    root.style.removeProperty("zoom");
    root.style.transform = "";
    root.style.transformOrigin = "";
    root.style.width = "";

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
    root.style.setProperty("--title-font-size", `${uiPrefs.titleFontSize || 18}px`);
    root.style.setProperty("--chat-font-size", `${uiPrefs.chatFontSize || 14}px`);
    root.style.setProperty("--chat-line-height", (uiPrefs.chatFontSize || 14) >= 18 ? "1.7" : "1.6");

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

    if (!uiPrefs.showAmbientGlow) {
      root.classList.add("ambient-glow-hidden");
    } else {
      root.classList.remove("ambient-glow-hidden");
    }

    if (!uiPrefs.showStarfield) {
      root.classList.add("starfield-hidden");
    } else {
      root.classList.remove("starfield-hidden");
    }

    if (!uiPrefs.showMeteors) {
      root.classList.add("meteors-hidden");
    } else {
      root.classList.remove("meteors-hidden");
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
