"use client";

import { useCallback, useRef } from "react";
import {
  useCanvasBg,
  getCssVar,
  parseColor,
  type CanvasHandle,
} from "@/lib/use-canvas-bg";

/* ---------- Types ---------- */

interface Pulse {
  active: boolean;
  /** true = horizontal, false = vertical */
  horizontal: boolean;
  /** fixed coordinate (y for horizontal, x for vertical) */
  fixed: number;
  /** leading edge position along travel axis */
  pos: number;
  /** pixels per second, signed */
  speed: number;
  /** time until next spawn (reused when inactive) */
  cooldown: number;
}

interface Flare {
  active: boolean;
  x: number;
  y: number;
  /** seconds remaining in the flare lifetime */
  age: number;
  /** total lifetime */
  lifetime: number;
}

interface Particle {
  x: number;
  y: number;
  /** vertical speed in px/s (negative = upward) */
  vy: number;
  /** horizontal drift in px/s */
  vx: number;
}

/* ---------- Constants ---------- */

const GRID_SPACING = 80;
const PULSE_COUNT = 6;
const PULSE_TRAIL = 200; // px
const PULSE_SPEED = 220; // px/s
const PULSE_SPAWN_MIN = 0.5; // seconds
const PULSE_SPAWN_MAX = 1.5;
const FLARE_COUNT = 8;
const FLARE_LIFETIME = 1.0; // seconds — faster cycle for more activity
const PARTICLE_COUNT = 40;
const SCAN_PERIOD = 8; // seconds for full sweep
const COLOR_CACHE_INTERVAL = 2; // seconds

/* ---------- Component ---------- */

export function EmeraldBackground() {
  /* ---- Pre-allocated state ---- */
  const pulses = useRef<Pulse[]>([]);
  const flares = useRef<Flare[]>([]);
  const particles = useRef<Particle[]>([]);
  const cachedColor = useRef<[number, number, number, number]>([0, 217, 146, 1]);
  const lastColorRead = useRef(0);

  /* ---- Pseudo-random (non-seeded, just Math.random wrappers) ---- */
  const randRange = (min: number, max: number) => min + Math.random() * (max - min);

  /* ---- Init: allocate arrays on resize ---- */
  const init = useCallback((w: number, h: number) => {
    // Pulses
    const ps: Pulse[] = [];
    for (let i = 0; i < PULSE_COUNT; i++) {
      ps.push({
        active: false,
        horizontal: true,
        fixed: 0,
        pos: 0,
        speed: 0,
        cooldown: randRange(0.2, PULSE_SPAWN_MAX), // stagger initial spawns
      });
    }
    pulses.current = ps;

    // Flares
    const fs: Flare[] = [];
    for (let i = 0; i < FLARE_COUNT; i++) {
      const cols = Math.floor(w / GRID_SPACING);
      const rows = Math.floor(h / GRID_SPACING);
      fs.push({
        active: true,
        x: Math.floor(Math.random() * (cols + 1)) * GRID_SPACING,
        y: Math.floor(Math.random() * (rows + 1)) * GRID_SPACING,
        age: Math.random() * FLARE_LIFETIME, // stagger initial ages
        lifetime: FLARE_LIFETIME,
      });
    }
    flares.current = fs;

    // Particles
    const pts: Particle[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pts.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vy: -(randRange(40, 60) / 60), // ~0.67-1 px/s upward
        vx: randRange(-0.3, 0.3),
      });
    }
    particles.current = pts;
  }, []);

  /* ---- Draw ---- */
  const draw = useCallback(({ ctx, w, h, time, dt }: CanvasHandle) => {
    const r = cachedColor.current;

    // Refresh cached accent color periodically
    if (time - lastColorRead.current > COLOR_CACHE_INTERVAL) {
      lastColorRead.current = time;
      const raw = getCssVar("--theme-accent");
      if (raw) {
        const parsed = parseColor(raw);
        r[0] = parsed[0];
        r[1] = parsed[1];
        r[2] = parsed[2];
        r[3] = parsed[3];
      }
    }

    const colorStr = `${r[0]},${r[1]},${r[2]}`;

    /* ---- 1. Circuit grid ---- */
    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(${colorStr},0.08)`;
    ctx.beginPath();
    // Vertical lines
    for (let x = 0; x <= w; x += GRID_SPACING) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    // Horizontal lines
    for (let y = 0; y <= h; y += GRID_SPACING) {
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();

    /* ---- 2. Pulse traces ---- */
    const ps = pulses.current;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      if (!p.active) {
        p.cooldown -= dt;
        if (p.cooldown <= 0) {
          // Spawn a new pulse
          p.active = true;
          p.horizontal = Math.random() < 0.5;
          if (p.horizontal) {
            const rows = Math.floor(h / GRID_SPACING);
            p.fixed = Math.floor(Math.random() * (rows + 1)) * GRID_SPACING;
            const goRight = Math.random() < 0.5;
            p.pos = goRight ? 0 : w;
            p.speed = goRight ? PULSE_SPEED : -PULSE_SPEED;
          } else {
            const cols = Math.floor(w / GRID_SPACING);
            p.fixed = Math.floor(Math.random() * (cols + 1)) * GRID_SPACING;
            const goDown = Math.random() < 0.5;
            p.pos = goDown ? 0 : h;
            p.speed = goDown ? PULSE_SPEED : -PULSE_SPEED;
          }
        }
        continue;
      }

      // Move
      p.pos += p.speed * dt;

      // Check bounds (despawn when trail fully exits)
      const limit = p.horizontal ? w : h;
      const trailEnd = p.pos - Math.sign(p.speed) * PULSE_TRAIL;
      if (
        (p.speed > 0 && trailEnd > limit) ||
        (p.speed < 0 && trailEnd < 0)
      ) {
        p.active = false;
        p.cooldown = randRange(PULSE_SPAWN_MIN, PULSE_SPAWN_MAX);
        continue;
      }

      // Draw trail with gradient
      const headX = p.horizontal ? p.pos : p.fixed;
      const headY = p.horizontal ? p.fixed : p.pos;
      const tailX = p.horizontal ? p.pos - Math.sign(p.speed) * PULSE_TRAIL : p.fixed;
      const tailY = p.horizontal ? p.fixed : p.pos - Math.sign(p.speed) * PULSE_TRAIL;

      const grad = ctx.createLinearGradient(tailX, tailY, headX, headY);
      grad.addColorStop(0, `rgba(${colorStr},0)`);
      grad.addColorStop(0.6, `rgba(${colorStr},0.35)`);
      grad.addColorStop(1, `rgba(${colorStr},0.7)`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(headX, headY);
      ctx.stroke();

      // Bright head dot
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = `rgb(${colorStr})`;
      ctx.fillRect(headX - 2, headY - 2, 5, 5);
      // Head glow
      ctx.globalAlpha = 0.3;
      ctx.fillRect(headX - 4, headY - 4, 9, 9);
      ctx.globalAlpha = 1;
    }

    /* ---- 3. Node flares ---- */
    const fs = flares.current;
    const cols = Math.floor(w / GRID_SPACING);
    const rows = Math.floor(h / GRID_SPACING);
    for (let i = 0; i < fs.length; i++) {
      const f = fs[i];
      f.age += dt;

      if (f.age >= f.lifetime) {
        // Respawn at a new intersection
        f.x = Math.floor(Math.random() * (cols + 1)) * GRID_SPACING;
        f.y = Math.floor(Math.random() * (rows + 1)) * GRID_SPACING;
        f.age = 0;
      }

      // Brightness curve: sharp rise then slow fade
      const t = f.age / f.lifetime;
      let alpha: number;
      if (t < 0.1) {
        alpha = (t / 0.1) * 0.7; // 0 -> 0.7
      } else {
        alpha = 0.7 * (1 - (t - 0.1) / 0.9); // 0.7 -> 0
      }
      alpha = Math.max(alpha, 0.1);

      ctx.globalAlpha = alpha;
      ctx.fillStyle = `rgb(${colorStr})`;
      ctx.fillRect(f.x - 2, f.y - 2, 5, 5);

      // Glow ring around flares at peak
      if (alpha > 0.3) {
        ctx.globalAlpha = (alpha - 0.3) * 0.5;
        ctx.fillRect(f.x - 5, f.y - 5, 11, 11);
      }
    }
    ctx.globalAlpha = 1;

    /* ---- 4. Scan line ---- */
    const scanY = ((time % SCAN_PERIOD) / SCAN_PERIOD) * h;
    ctx.globalAlpha = 0.07;
    ctx.strokeStyle = `rgb(${colorStr})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, scanY);
    ctx.lineTo(w, scanY);
    ctx.stroke();
    ctx.globalAlpha = 1;

    /* ---- 5. Data particles ---- */
    const pts = particles.current;
    const fadeInZone = h * 0.1;
    const fadeOutZone = h * 0.1;
    for (let i = 0; i < pts.length; i++) {
      const pt = pts[i];
      pt.y += pt.vy * dt * 60; // vy is per-frame at 60fps, dt normalizes
      pt.x += pt.vx * dt * 60;

      // Wrap when leaving top
      if (pt.y < 0) {
        pt.y = h;
        pt.x = Math.random() * w;
      }
      // Wrap horizontal
      if (pt.x < 0) pt.x = w;
      if (pt.x > w) pt.x = 0;

      // Fade based on vertical position
      let alpha = 0.30;
      if (pt.y > h - fadeInZone) {
        alpha = 0.30 * (1 - (pt.y - (h - fadeInZone)) / fadeInZone);
      } else if (pt.y < fadeOutZone) {
        alpha = 0.30 * (pt.y / fadeOutZone);
      }

      ctx.globalAlpha = alpha;
      ctx.fillStyle = `rgb(${colorStr})`;
      ctx.fillRect(pt.x - 1.5, pt.y - 1.5, 3, 3);
    }
    ctx.globalAlpha = 1;
  }, []);

  const canvasRef = useCanvasBg(draw, init);

  return (
    <div style={{ position: "absolute", inset: 0, background: "var(--background)" }}>
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0 }} />
    </div>
  );
}
