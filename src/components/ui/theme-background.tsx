"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useStore } from "@/lib/store";
import { resolveThemePreference, type ThemeId } from "@/lib/themes";

import { AmbientBackground } from "@/components/ui/ambient-background";
import { MidnightBackground } from "@/components/ui/bg-midnight";
import { EmeraldBackground } from "@/components/ui/bg-emerald";
import { ObsidianBackground } from "@/components/ui/bg-obsidian";
import { DaylightBackground } from "@/components/ui/bg-daylight";
import { PaperBackground } from "@/components/ui/bg-paper";
import { ArcticBackground } from "@/components/ui/bg-arctic";
import { RootStarfield } from "@/components/ui/root-starfield";

function AuroraBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: "var(--background)" }}>
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 12% 5%, color-mix(in srgb, var(--theme-accent) 32%, transparent) 0%, transparent 34%), radial-gradient(circle at 84% 4%, color-mix(in srgb, var(--theme-accent-alt) 24%, transparent) 0%, transparent 30%)",
        }}
      />
      <div
        className="absolute -top-[12%] left-[-18%] h-[46vh] w-[140%] blur-[60px]"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--theme-accent) 22%, transparent) 24%, color-mix(in srgb, var(--theme-accent-alt) 18%, transparent) 48%, transparent 100%)",
          animation: "arctic-aurora-1 24s ease-in-out infinite",
        }}
      />
      <div
        className="absolute top-[4%] left-[-16%] h-[40vh] w-[136%] blur-[70px]"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--accent-cyan) 20%, transparent) 22%, color-mix(in srgb, var(--theme-accent) 16%, transparent) 44%, transparent 100%)",
          animation: "arctic-aurora-2 32s ease-in-out infinite",
        }}
      />
      <div
        className="absolute inset-x-[8%] bottom-[-18%] h-[46vh] rounded-full blur-[90px]"
        style={{
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--theme-accent) 14%, transparent) 0%, color-mix(in srgb, var(--accent-cyan) 8%, transparent) 32%, transparent 72%)",
        }}
      />
    </div>
  );
}

function AtelierBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: "var(--background)" }}>
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.5) 0%, transparent 40%, rgba(255,255,255,0.36) 100%)",
        }}
      />
      <div
        className="absolute left-[-8%] top-[-10%] h-[28rem] w-[28rem] rounded-full blur-[90px]"
        style={{ background: "var(--ambient-blob-1)" }}
      />
      <div
        className="absolute right-[-10%] top-[10%] h-[24rem] w-[24rem] rounded-full blur-[80px]"
        style={{ background: "var(--ambient-blob-2)" }}
      />
      <div
        className="absolute bottom-[-12%] left-[22%] h-[22rem] w-[30rem] rounded-full blur-[90px]"
        style={{ background: "var(--ambient-blob-3)" }}
      />
      <div
        className="absolute inset-0 opacity-[0.045] mix-blend-mode:multiply"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
          backgroundSize: "180px 180px",
        }}
      />
    </div>
  );
}

const BACKGROUNDS: Record<ThemeId, React.ComponentType> = {
  midnight: MidnightBackground,
  aurora: AuroraBackground,
  "emerald-terminal": EmeraldBackground,
  obsidian: ObsidianBackground,
  daylight: DaylightBackground,
  atelier: AtelierBackground,
  paper: PaperBackground,
  arctic: ArcticBackground,
};

const STARFIELD_OVERLAY_THEMES = new Set<ThemeId>(["aurora", "emerald-terminal", "obsidian"]);

export function ThemeBackground() {
  const theme = useStore((s) => s.uiPrefs.theme);
  const animationsEnabled = useStore((s) => s.uiPrefs.animationsEnabled);
  const ambientBackground = useStore((s) => s.uiPrefs.ambientBackground);
  const showStarfield = useStore((s) => s.uiPrefs.showStarfield);
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
        style={{ background: "var(--page-gradient)" }}
      />
    );
  }

  const Background = BACKGROUNDS[resolvedId];
  const showStarfieldOverlay = showStarfield && STARFIELD_OVERLAY_THEMES.has(resolvedId);

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
        {ambientBackground ? <AmbientBackground /> : null}
        {showStarfieldOverlay ? <RootStarfield /> : null}
      </motion.div>
    </AnimatePresence>
  );
}
