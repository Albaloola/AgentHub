"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useStore } from "@/lib/store";
import { resolveThemePreference, type ThemeId } from "@/lib/themes";

import { MidnightBackground } from "@/components/ui/bg-midnight";
import { EmeraldBackground } from "@/components/ui/bg-emerald";
import { ObsidianBackground } from "@/components/ui/bg-obsidian";
import { DaylightBackground } from "@/components/ui/bg-daylight";
import { PaperBackground } from "@/components/ui/bg-paper";
import { ArcticBackground } from "@/components/ui/bg-arctic";

const BACKGROUNDS: Record<ThemeId, React.ComponentType> = {
  midnight: MidnightBackground,
  "emerald-terminal": EmeraldBackground,
  obsidian: ObsidianBackground,
  daylight: DaylightBackground,
  paper: PaperBackground,
  arctic: ArcticBackground,
};

export function ThemeBackground() {
  const theme = useStore((s) => s.uiPrefs.theme);
  const animationsEnabled = useStore((s) => s.uiPrefs.animationsEnabled);
  const prefersReduced = useReducedMotion();

  const [resolvedId, setResolvedId] = useState<ThemeId>(() => {
    if (typeof window === 'undefined') return "midnight";
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return resolveThemePreference(theme, prefersDark).id;
  });

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setResolvedId(resolveThemePreference(theme, prefersDark).id);
  }, [theme]);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      setResolvedId(resolveThemePreference(theme, e.matches).id);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Static fallback when animations off or reduced-motion preferred
  if (!animationsEnabled || prefersReduced) {
    return (
      <div
        className="pointer-events-none fixed inset-0 z-[-1]"
        aria-hidden="true"
        style={{ background: "var(--background)" }}
      />
    );
  }

  const Background = BACKGROUNDS[resolvedId];

  return (
    <AnimatePresence>
      <motion.div
        key={resolvedId}
        className="pointer-events-none fixed inset-0 z-[-1] overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        aria-hidden="true"
      >
        <Background />
      </motion.div>
    </AnimatePresence>
  );
}
