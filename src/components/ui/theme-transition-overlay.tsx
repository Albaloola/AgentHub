"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useStore } from "@/lib/store";
import { resolveThemePreference } from "@/lib/themes";

/**
 * ThemeTransitionOverlay — renders a radial colour wash
 * that expands outward when the user switches themes.
 */
export function ThemeTransitionOverlay() {
  const themePreference = useStore((s) => s.uiPrefs.theme);
  const animationsEnabled = useStore((s) => s.uiPrefs.animationsEnabled);
  const prefersReduced = useReducedMotion();
  const [resolvedMode, setResolvedMode] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "dark";
    return resolveThemePreference(
      themePreference,
      window.matchMedia("(prefers-color-scheme: dark)").matches,
    ).mode;
  });
  const prevMode = useRef(resolvedMode);
  const [burst, setBurst] = useState<{ id: number } | null>(null);
  const idRef = useRef(0);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = (prefersDark: boolean) => {
      setResolvedMode(resolveThemePreference(themePreference, prefersDark).mode);
    };

    apply(media.matches);
    if (themePreference !== "system") return;

    const handleChange = (event: MediaQueryListEvent) => apply(event.matches);
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [themePreference]);

  useEffect(() => {
    if (prevMode.current === resolvedMode) return;
    const modeChanged = prevMode.current !== resolvedMode;
    prevMode.current = resolvedMode;

    if (!modeChanged || !animationsEnabled || prefersReduced) return;

    idRef.current += 1;
    setBurst({ id: idRef.current });

    const timer = setTimeout(() => setBurst(null), 560);
    return () => clearTimeout(timer);
  }, [resolvedMode, animationsEnabled, prefersReduced]);

  return (
    <AnimatePresence>
      {burst && (
        <motion.div
          key={burst.id}
          className="pointer-events-none fixed inset-0 z-[9999]"
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.24, delay: 0.18 }}
          aria-hidden="true"
        >
          <motion.div
            className="absolute"
            style={{
              left: "50%",
              top: "50%",
              translateX: "-50%",
              translateY: "-50%",
              borderRadius: "50%",
              background: "radial-gradient(circle, color-mix(in srgb, var(--theme-accent) 32%, transparent) 0%, transparent 72%)",
              opacity: 0.18,
            }}
            initial={{ width: 0, height: 0 }}
            animate={{
              width: "185vmax",
              height: "185vmax",
            }}
            transition={{
              duration: 0.38,
              ease: [0.4, 0, 0.2, 1],
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
