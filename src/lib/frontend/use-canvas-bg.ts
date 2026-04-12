"use client";

import { useEffect, useRef } from "react";

/** Read a CSS custom property from :root */
export function getCssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** Parse a CSS color string into an rgba tuple. Works with hex, rgb(), rgba(). */
export function parseColor(css: string): [number, number, number, number] {
  if (!css) return [0, 0, 0, 0];
  // Try hex
  const hex = css.match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    const h = hex[1];
    if (h.length === 3) return [parseInt(h[0]+h[0],16), parseInt(h[1]+h[1],16), parseInt(h[2]+h[2],16), 1];
    if (h.length === 6) return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16), 1];
    if (h.length === 8) return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16), parseInt(h.slice(6,8),16)/255];
  }
  // Try rgb/rgba
  const m = css.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/);
  if (m) return [+m[1], +m[2], +m[3], m[4] != null ? +m[4] : 1];
  return [128, 128, 128, 1];
}

export interface CanvasHandle {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  dpr: number;
  time: number;
  dt: number;
}

type DrawFn = (handle: CanvasHandle) => void;
type InitFn = (w: number, h: number) => void;

/**
 * Shared hook for canvas-based animated backgrounds.
 * Handles setup, resize, RAF loop, visibility pause, and cleanup.
 */
export function useCanvasBg(draw: DrawFn, init?: InitFn) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);
  const initRef = useRef(init);

  useEffect(() => {
    drawRef.current = draw;
    initRef.current = init;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0, h = 0;
    let prevTime = 0;
    let frameId = 0;
    let running = true;

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = w + "px";
      canvas!.style.height = h + "px";
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      initRef.current?.(w, h);
    }

    function loop(time: number) {
      if (!running) return;
      if (document.hidden) {
        frameId = requestAnimationFrame(loop);
        return;
      }
      const dt = prevTime ? Math.min((time - prevTime) / 1000, 0.1) : 0.016;
      prevTime = time;
      ctx!.clearRect(0, 0, w, h);
      drawRef.current({ ctx: ctx!, w, h, dpr, time: time / 1000, dt });
      frameId = requestAnimationFrame(loop);
    }

    resize();
    window.addEventListener("resize", resize);
    frameId = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return canvasRef;
}

/** Seeded PRNG for deterministic positions */
export function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
