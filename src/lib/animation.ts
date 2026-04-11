import type { Variants } from "framer-motion";

// Framer-motion expects a 4-tuple for cubic-bezier easing
type CubicBezier = [number, number, number, number];

// ============================================================
// Easing curves — custom cubic-beziers
// ============================================================

export const ease = {
  spring: [0.175, 0.885, 0.32, 1.275] as CubicBezier,   // overshoot bounce
  smooth: [0.4, 0.0, 0.2, 1] as CubicBezier,             // material-style decelerate
  snappy: [0.68, -0.55, 0.265, 1.55] as CubicBezier,     // aggressive snap with bounce
  gentle: [0.25, 0.46, 0.45, 0.94] as CubicBezier,       // soft ease-out
  dramatic: [0.16, 1, 0.3, 1] as CubicBezier,            // slow start, fast finish
} as const;

// ============================================================
// Duration scale (seconds)
// ============================================================

export const duration = {
  instant: 0.1,
  fast: 0.15,
  normal: 0.25,
  slow: 0.4,
  dramatic: 0.6,
  glacial: 0.8,
} as const;

// ============================================================
// Spring physics presets for framer-motion
// ============================================================

export const spring = {
  snappy: { type: "spring" as const, stiffness: 400, damping: 25 },
  bouncy: { type: "spring" as const, stiffness: 300, damping: 15 },
  gentle: { type: "spring" as const, stiffness: 200, damping: 20 },
  wobbly: { type: "spring" as const, stiffness: 180, damping: 14 },
} as const;

// ============================================================
// Stagger presets (seconds between children)
// ============================================================

export const stagger = {
  fast: 0.03,
  normal: 0.05,
  slow: 0.08,
} as const;

// ============================================================
// Reusable variant objects
// ============================================================

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.normal, ease: ease.smooth },
  },
};

export const fadeInScale: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: duration.normal, ease: ease.smooth },
  },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: duration.normal, ease: ease.smooth },
  },
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: duration.normal, ease: ease.smooth },
  },
};

export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { ...spring.bouncy },
  },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: stagger.normal,
      delayChildren: 0.04,
    },
  },
};

export const listItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.normal, ease: ease.smooth },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: duration.fast },
  },
};
