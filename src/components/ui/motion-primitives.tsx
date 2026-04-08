"use client";

import * as React from "react";
import {
  motion,
  AnimatePresence,
  useReducedMotion,
  useInView,
  type Variants,
  type Transition,
  type HTMLMotionProps,
} from "framer-motion";
import {
  listItem,
  spring,
  duration,
  ease,
} from "@/lib/animation";

// Re-export for convenience
export { AnimatePresence };

// ============================================================
// MotionCard — card-style entrance animation
// ============================================================

interface MotionCardProps extends HTMLMotionProps<"div"> {
  delay?: number;
}

export function MotionCard({
  children,
  delay = 0,
  className,
  ...props
}: MotionCardProps) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      initial={prefersReduced ? false : "hidden"}
      animate="visible"
      variants={{
        hidden: { opacity: 0, y: 12, scale: 0.97 },
        visible: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: {
            duration: duration.normal,
            ease: ease.smooth,
            delay,
          },
        },
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// ============================================================
// MotionList — staggered container for children
// ============================================================

interface MotionListProps extends HTMLMotionProps<"div"> {
  staggerDelay?: number;
}

export function MotionList({
  children,
  staggerDelay = 0.05,
  className,
  ...props
}: MotionListProps) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      initial={prefersReduced ? false : "hidden"}
      animate="visible"
      variants={{
        hidden: { opacity: 1 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: prefersReduced ? 0 : staggerDelay,
            delayChildren: 0.04,
          },
        },
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// ============================================================
// MotionItem — individual item for stagger-compatible lists
// ============================================================

interface MotionItemProps extends HTMLMotionProps<"div"> {}

export function MotionItem({ children, className, ...props }: MotionItemProps) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      variants={prefersReduced ? undefined : listItem}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// ============================================================
// FadeIn — simple fade-in wrapper
// ============================================================

interface FadeInProps extends HTMLMotionProps<"div"> {
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  distance?: number;
}

export function FadeIn({
  children,
  delay = 0,
  direction = "up",
  distance = 12,
  className,
  ...props
}: FadeInProps) {
  const prefersReduced = useReducedMotion();

  const directionMap = {
    up: { y: distance },
    down: { y: -distance },
    left: { x: distance },
    right: { x: -distance },
    none: {},
  };

  return (
    <motion.div
      initial={
        prefersReduced
          ? false
          : { opacity: 0, ...directionMap[direction] }
      }
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{
        duration: duration.normal,
        ease: ease.smooth,
        delay,
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// ============================================================
// ScaleIn — scale entrance with spring physics
// ============================================================

interface ScaleInProps extends HTMLMotionProps<"div"> {
  delay?: number;
}

export function ScaleIn({
  children,
  delay = 0,
  className,
  ...props
}: ScaleInProps) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ ...spring.bouncy, delay } as Transition}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// ============================================================
// ScrollReveal — scroll-triggered reveal using IntersectionObserver
// ============================================================

interface ScrollRevealProps extends HTMLMotionProps<"div"> {
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  distance?: number;
  threshold?: number;
  once?: boolean;
}

export function ScrollReveal({
  children,
  delay = 0,
  direction = "up",
  distance = 20,
  threshold = 0.15,
  once = true,
  className,
  ...props
}: ScrollRevealProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, amount: threshold });
  const prefersReduced = useReducedMotion();

  const directionMap = {
    up: { y: distance },
    down: { y: -distance },
    left: { x: distance },
    right: { x: -distance },
    none: {},
  };

  return (
    <motion.div
      ref={ref}
      initial={prefersReduced ? false : { opacity: 0, ...directionMap[direction] }}
      animate={isInView ? { opacity: 1, x: 0, y: 0 } : undefined}
      transition={{
        duration: duration.slow,
        ease: ease.smooth,
        delay,
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
