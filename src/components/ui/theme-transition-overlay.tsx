"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useStore } from "@/lib/store";

/**
 * ThemeTransitionOverlay — renders a radial colour wash
 * that expands outward when the user switches themes.
 */
export function ThemeTransitionOverlay() {
  const theme = useStore((s) => s.uiPrefs.theme);
  const animationsEnabled = useStore((s) => s.uiPrefs.animationsEnabled);
  const prefersReduced = useReducedMotion();
  const prevTheme = useRef(theme);
  const [burst, setBurst] = useState<{ id: number } | null>(null);
  const idRef = useRef(0);

  useEffect(() => {
    if (prevTheme.current === theme) return;
    prevTheme.current = theme;

    if (!animationsEnabled || prefersReduced) return;

    idRef.current += 1;
    setBurst({ id: idRef.current });

    const timer = setTimeout(() => setBurst(null), 700);
    return () => clearTimeout(timer);
  }, [theme, animationsEnabled, prefersReduced]);

  return (
    <AnimatePresence>
      {burst && (
        <motion.div
          key={burst.id}
          className="pointer-events-none fixed inset-0 z-[9999]"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
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
              background: "radial-gradient(circle, var(--theme-accent) 0%, transparent 70%)",
              opacity: 0.15,
            }}
            initial={{ width: 0, height: 0 }}
            animate={{
              width: "250vmax",
              height: "250vmax",
            }}
            transition={{
              duration: 0.5,
              ease: [0.4, 0, 0.2, 1],
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
