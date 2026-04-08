"use client";

import { useRef, useCallback } from "react";
import { useCanvasBg, getCssVar, seededRandom, type CanvasHandle } from "@/lib/use-canvas-bg";

/**
 * Paper theme background — Sunlit Study
 * Golden dust motes drifting lazily in a sunbeam, warm paper texture.
 */

interface Mote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseOpacity: number;
  opacity: number;
  glintPhase: number;
  glintSpeed: number;
}

const MOTE_COUNT = 35;

export function PaperBackground() {
  const motesRef = useRef<Mote[]>([]);
  const colorsRef = useRef({ accent: "", accentSoft: "" });
  const lastColorRead = useRef(0);

  const init = useCallback((w: number, h: number) => {
    const rand = seededRandom(88);
    motesRef.current = Array.from({ length: MOTE_COUNT }, () => ({
      x: rand() * w,
      y: rand() * h,
      vx: (rand() - 0.5) * 0.6,
      vy: -(0.3 + rand() * 0.7), // drift upward
      size: 1.5 + rand() * 2.5,
      baseOpacity: 0.30 + rand() * 0.10, // 0.30-0.40
      opacity: 0.30 + rand() * 0.10,
      glintPhase: rand() * Math.PI * 2,
      glintSpeed: 0.3 + rand() * 0.5,
    }));
  }, []);

  const draw = useCallback(({ ctx, w, h, time, dt }: CanvasHandle) => {
    // Read colors periodically
    if (time - lastColorRead.current > 2) {
      lastColorRead.current = time;
      colorsRef.current.accent = getCssVar("--theme-accent") || "#b98336";
      colorsRef.current.accentSoft = getCssVar("--theme-accent-soft") || "rgba(185,131,54,0.16)";
    }

    const accent = colorsRef.current.accent;
    const motes = motesRef.current;

    // Draw motes
    for (let i = 0; i < motes.length; i++) {
      const m = motes[i];

      // Brownian motion: small random nudges
      m.vx += (Math.random() - 0.5) * 0.1;
      m.vy += (Math.random() - 0.5) * 0.05;
      // Dampen
      m.vx *= 0.99;
      m.vy *= 0.99;
      // Gentle upward drift
      m.vy -= 0.01;

      m.x += m.vx * dt * 60;
      m.y += m.vy * dt * 60;

      // Wrap around
      if (m.y < -10) { m.y = h + 10; m.x = Math.random() * w; }
      if (m.y > h + 10) { m.y = -10; m.x = Math.random() * w; }
      if (m.x < -10) m.x = w + 10;
      if (m.x > w + 10) m.x = -10;

      // Glint: motes briefly brighten to 0.6-0.7 when "catching sunlight"
      const glint = Math.sin(time * m.glintSpeed + m.glintPhase);
      if (glint > 0.5) {
        // Map 0.5-1.0 to 0-1, then scale to peak at 0.65
        const glintStrength = (glint - 0.5) * 2;
        m.opacity = m.baseOpacity + glintStrength * (0.65 - m.baseOpacity);
      } else {
        m.opacity = m.baseOpacity;
      }

      ctx.globalAlpha = m.opacity;
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2);
      ctx.fill();

      // Soft glow for brighter motes (catching light)
      if (m.opacity > 0.35) {
        ctx.globalAlpha = (m.opacity - 0.30) * 0.9;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.size * 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.globalAlpha = 1;
  }, []);

  const canvasRef = useCanvasBg(draw, init);

  return (
    <div style={{ position: "absolute", inset: 0, background: "var(--background)" }}>
      {/* Light shaft — broad diagonal band of warmth */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(150deg, color-mix(in srgb, var(--theme-accent) 15%, transparent) 0%, color-mix(in srgb, var(--theme-accent) 12%, transparent) 30%, transparent 55%)",
          animation: "paper-shaft-drift 30s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />

      {/* Warm corner — radial glow in lower-right quadrant */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse 60% 60% at 80% 80%, color-mix(in srgb, var(--theme-accent) 8%, transparent) 0%, transparent 70%)",
          animation: "paper-corner-drift 40s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />

      {/* Paper texture — warm noise */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.04,
          mixBlendMode: "multiply" as const,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: "200px 200px",
          pointerEvents: "none",
        }}
      />

      {/* Ink bleed edges — warm vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 55%, color-mix(in srgb, var(--foreground) 4%, transparent) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Canvas for dust motes */}
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes paper-shaft-drift {
          0%, 100% { transform: rotate(0deg) translateX(0); }
          50% { transform: rotate(2deg) translateX(3vw); }
        }
        @keyframes paper-corner-drift {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-2vw, -2vh); }
        }
      `}} />
    </div>
  );
}
