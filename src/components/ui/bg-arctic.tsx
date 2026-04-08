"use client";

import { useRef, useCallback } from "react";
import { useCanvasBg, getCssVar, seededRandom, type CanvasHandle } from "@/lib/use-canvas-bg";

/**
 * Arctic theme background — Frozen Aurora
 * Clean, crisp, crystalline. Visible aurora bands, falling ice crystals, frost gradient.
 */

interface Crystal {
  x: number;
  y: number;
  size: number;
  rotation: number;
  rotSpeed: number;
  vy: number;
  vx: number;
  opacity: number;
}

interface BreathBlob {
  x: number;
  y: number;
  spawnTime: number;
  duration: number;
  maxRadius: number;
}

const CRYSTAL_COUNT = 44;

export function ArcticBackground() {
  const crystalsRef = useRef<Crystal[]>([]);
  const breathRef = useRef<BreathBlob | null>(null);
  const nextBreathRef = useRef(8 + Math.random() * 4);
  const colorsRef = useRef({ accent: "", accentAlt: "" });
  const lastColorRead = useRef(0);

  const init = useCallback((w: number, h: number) => {
    const rand = seededRandom(77);
    crystalsRef.current = Array.from({ length: CRYSTAL_COUNT }, () => ({
      x: rand() * w,
      y: rand() * h, // spread across full height initially
      size: 4 + rand() * 4, // 4-8px
      rotation: rand() * Math.PI * 2,
      rotSpeed: (rand() - 0.5) * 0.3,
      vy: 0.33 + rand() * 0.50, // ~20-50px/s at 60fps
      vx: (rand() - 0.5) * 0.25,
      opacity: 0.20 + rand() * 0.10, // 0.20-0.30
    }));
  }, []);

  const draw = useCallback(({ ctx, w, h, time, dt }: CanvasHandle) => {
    if (time - lastColorRead.current > 2) {
      lastColorRead.current = time;
      colorsRef.current.accent = getCssVar("--theme-accent") || "#1f9df4";
      colorsRef.current.accentAlt = getCssVar("--theme-accent-alt") || "#38bdf8";
    }

    const { accent, accentAlt } = colorsRef.current;

    // ---- Ice crystals ----
    const crystals = crystalsRef.current;
    for (let i = 0; i < crystals.length; i++) {
      const c = crystals[i];
      c.y += c.vy * dt * 60;
      c.x += c.vx * dt * 60;
      c.rotation += c.rotSpeed * dt;
      // Slight horizontal oscillation
      c.vx += (Math.random() - 0.5) * 0.01;
      c.vx *= 0.995;

      // Fade out in lower third
      const fadeZone = h * 0.65;
      let alpha = c.opacity;
      if (c.y > fadeZone) {
        alpha *= Math.max(0, 1 - (c.y - fadeZone) / (h * 0.35));
      }
      // Fade in at top
      if (c.y < h * 0.05) {
        alpha *= c.y / (h * 0.05);
      }

      // Respawn at top
      if (c.y > h || alpha <= 0.001) {
        c.y = -10;
        c.x = Math.random() * w;
        continue;
      }

      // Draw hexagonal crystal (6-pointed star simplified as 6 lines from center)
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rotation);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let j = 0; j < 6; j++) {
        const angle = (j / 6) * Math.PI * 2;
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * c.size, Math.sin(angle) * c.size);
      }
      ctx.stroke();

      // Add a subtle glow center for larger crystals
      if (c.size > 5) {
        ctx.globalAlpha = alpha * 0.3;
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(0, 0, c.size * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // ---- Breath fog — larger and more frequent ----
    if (time > nextBreathRef.current && !breathRef.current) {
      breathRef.current = {
        x: Math.random() * w,
        y: h * 0.3 + Math.random() * h * 0.4,
        spawnTime: time,
        duration: 3 + Math.random(),
        maxRadius: 100 + Math.random() * 50, // 100-150px
      };
      nextBreathRef.current = time + 8 + Math.random() * 4; // every 8-12s
    }

    if (breathRef.current) {
      const b = breathRef.current;
      const elapsed = time - b.spawnTime;
      const progress = elapsed / b.duration;

      if (progress >= 1) {
        breathRef.current = null;
      } else {
        const radius = b.maxRadius * Math.sqrt(progress);
        // Fade: rise quickly to peak, then fade
        const fade = progress < 0.2 ? progress / 0.2 : 1 - (progress - 0.2) / 0.8;
        const alpha = fade * 0.10; // more visible

        ctx.globalAlpha = alpha;
        const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, radius);
        grad.addColorStop(0, accentAlt);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(b.x, b.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.globalAlpha = 1;
  }, []);

  const canvasRef = useCanvasBg(draw, init);

  return (
    <div style={{ position: "absolute", inset: 0, background: "var(--background)" }}>
      {/* Frost gradient at top */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "22%",
          background: "linear-gradient(to bottom, color-mix(in srgb, var(--theme-accent) 20%, transparent), transparent)",
          pointerEvents: "none",
        }}
      />

      {/* Aurora bands — wide visible ribbons covering upper 40% */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute",
            top: "2%",
            left: "-10%",
            width: "120%",
            height: "40%",
            background: "linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--theme-accent) 32%, transparent) 20%, color-mix(in srgb, var(--theme-accent-alt) 28%, transparent) 50%, color-mix(in srgb, var(--theme-accent) 20%, transparent) 75%, transparent 100%)",
            filter: "blur(35px)",
            animation: "arctic-aurora-1 25s ease-in-out infinite",
            willChange: "transform",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "8%",
            left: "-5%",
            width: "110%",
            height: "35%",
            background: "linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--theme-accent-alt) 28%, transparent) 25%, color-mix(in srgb, var(--theme-accent) 24%, transparent) 55%, transparent 100%)",
            filter: "blur(40px)",
            animation: "arctic-aurora-2 30s ease-in-out infinite",
            animationDelay: "-10s",
            willChange: "transform",
          }}
        />
      </div>

      {/* Canvas for crystals + breath fog */}
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes arctic-aurora-1 {
          0%, 100% { transform: translateX(0) scaleY(1) skewX(0deg); }
          25% { transform: translateX(3vw) scaleY(1.15) skewX(2deg); }
          50% { transform: translateX(-2vw) scaleY(0.9) skewX(-1deg); }
          75% { transform: translateX(2vw) scaleY(1.08) skewX(1deg); }
        }
        @keyframes arctic-aurora-2 {
          0%, 100% { transform: translateX(0) scaleY(1) skewX(0deg); }
          33% { transform: translateX(-4vw) scaleY(1.2) skewX(-2deg); }
          66% { transform: translateX(3vw) scaleY(0.85) skewX(1.5deg); }
        }
      `}} />
    </div>
  );
}
