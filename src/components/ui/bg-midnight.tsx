"use client";

import { useRef } from "react";
import {
  useCanvasBg,
  getCssVar,
  seededRandom,
  type CanvasHandle,
} from "@/lib/use-canvas-bg";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface Star {
  /** Position as fraction 0-1 of viewport */
  x: number;
  y: number;
  /** Radius in CSS px */
  radius: number;
  /** Base opacity 0-1 */
  baseOpacity: number;
  /** Twinkle period in seconds */
  period: number;
  /** Phase offset in seconds */
  phase: number;
  /** 0 = normal, 1 = warm, 2 = cool, 3 = bright */
  colorType: 0 | 1 | 2 | 3;
}

interface Meteor {
  /** Start x/y in CSS px */
  x0: number;
  y0: number;
  /** Normalised direction (always upper-right to lower-left) */
  dx: number;
  dy: number;
  /** Trail length in CSS px */
  trailLen: number;
  /** Total duration in seconds */
  duration: number;
  /** Time at which the meteor was spawned (seconds since start) */
  spawnTime: number;
  /** Progress 0-1 (updated each frame) */
  progress: number;
  /** Whether this meteor is still alive */
  alive: boolean;
  /** Brightness multiplier (0.4-1.0) for visual variety */
  brightness: number;
  /** Comet is larger, slower, brighter */
  isComet: boolean;
}

interface Flare {
  /** Centre in CSS px */
  cx: number;
  cy: number;
  /** Time of flash (seconds since start) */
  spawnTime: number;
  /** Phase: "in" (0-50ms), "out" (50-450ms), then dead */
  alive: boolean;
}

/* ------------------------------------------------------------------ */
/*  Cached CSS colour strings                                         */
/* ------------------------------------------------------------------ */

interface CachedColors {
  star: string;
  starWarm: string;
  starCool: string;
  starBright: string;
  meteorHead: string;
  meteorTrail1: string;
  meteorTrail2: string;
  meteorTrail3: string;
  flare1: string;
  lastRead: number;
}

function readColors(): CachedColors {
  return {
    star: getCssVar("--starfield-star"),
    starWarm: getCssVar("--starfield-star-warm"),
    starCool: getCssVar("--starfield-star-cool"),
    starBright: getCssVar("--starfield-star-bright"),
    meteorHead: getCssVar("--starfield-meteor-head"),
    meteorTrail1: getCssVar("--starfield-meteor-trail-1"),
    meteorTrail2: getCssVar("--starfield-meteor-trail-2"),
    meteorTrail3: getCssVar("--starfield-meteor-trail-3"),
    flare1: getCssVar("--starfield-flare-1"),
    lastRead: 0,
  };
}

/* ------------------------------------------------------------------ */
/*  Star generation (deterministic)                                   */
/* ------------------------------------------------------------------ */

function generateStars(count: number): Star[] {
  const rand = seededRandom(42);
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    const r = rand();
    const radius = 0.8 + rand() * 2.2; // 0.8-3px
    let colorType: Star["colorType"] = 0;
    if (radius >= 2.5) {
      colorType = 3; // bright — largest stars
    } else if (r < 0.15) {
      colorType = 1; // warm
    } else if (r < 0.30) {
      colorType = 2; // cool
    }
    stars.push({
      x: rand(),
      y: rand(),
      radius,
      baseOpacity: 0.25 + rand() * 0.55, // 0.25-0.8
      period: 3 + rand() * 3, // 3-6s
      phase: rand() * 6.28, // 0 - 2PI
      colorType,
    });
  }

  // Add 5 extra "beacon" stars that pulse dramatically (0.3 to 1.0)
  for (let i = 0; i < 5; i++) {
    stars.push({
      x: 0.1 + rand() * 0.8,
      y: 0.05 + rand() * 0.6,
      radius: 2.8 + rand() * 0.5,
      baseOpacity: 0.65, // will oscillate 0.3–1.0 via special handling
      period: 2 + rand() * 2, // 2-4s — faster pulse
      phase: rand() * 6.28,
      colorType: 3,
    });
  }

  return stars;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function MidnightBackground() {
  /* Pre-allocated mutable state kept in refs (never triggers re-render) */
  const starsRef = useRef<Star[]>(generateStars(180));
  const meteorsRef = useRef<Meteor[]>([]);
  const flaresRef = useRef<Flare[]>([]);
  const colorsRef = useRef<CachedColors | null>(null);
  const nextMeteorRef = useRef<number>(0); // time to spawn next meteor
  const nextFlareRef = useRef<number>(0); // time to spawn next flare
  const nextCometRef = useRef<number>(0); // time to spawn next comet
  const burstQueueRef = useRef<number[]>([]); // pending burst meteor timestamps
  const nextBurstRef = useRef<number>(0); // time for next shower burst

  /* Seeded rng for runtime randomness (meteor positions, etc.) */
  const rngRef = useRef(seededRandom(7919));

  /* ---- init: called on mount + resize ---- */
  const init = (_w: number, _h: number) => {
    /* Reset spawn timers on resize so nothing looks stuck */
    nextMeteorRef.current = 0;
    nextFlareRef.current = 0;
    nextCometRef.current = 0;
    burstQueueRef.current = [];
    nextBurstRef.current = 0;
    meteorsRef.current.length = 0;
    flaresRef.current.length = 0;
  };

  /* ---- draw: called every frame ---- */
  const draw = ({ ctx, w, h, time, dt }: CanvasHandle) => {
    const rand = rngRef.current;

    /* --- refresh cached colours every ~2s --- */
    let colors = colorsRef.current;
    if (!colors || time - colors.lastRead > 2) {
      colors = readColors();
      colors.lastRead = time;
      colorsRef.current = colors;
    }

    ctx.save();

    const rotationSpeed = 0.012;
    const rotation = (time * rotationSpeed) % (Math.PI * 2);
    ctx.translate(w / 2, h / 2);
    ctx.rotate(rotation);
    ctx.translate(-w / 2, -h / 2);

    const stars = starsRef.current;
    const beaconStart = 180;
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      const isBeacon = i >= beaconStart;

      const twinkle =
        Math.sin((time / s.period) * 6.2831853 + s.phase) * 0.5 + 0.5;

      let opacity: number;
      if (isBeacon) {
        opacity = 0.3 + twinkle * 0.7;
      } else {
        opacity = s.baseOpacity * (0.5 + twinkle);
      }

      const px = s.x * w;
      const py = s.y * h;

      let color: string;
      switch (s.colorType) {
        case 1:
          color = colors.starWarm;
          break;
        case 2:
          color = colors.starCool;
          break;
        case 3:
          color = colors.starBright;
          break;
        default:
          color = colors.star;
      }

      ctx.globalAlpha = opacity;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, py, s.radius, 0, 6.2831853);
      ctx.fill();

      if (s.colorType === 3) {
        const glowRadius = isBeacon ? s.radius * 2 : s.radius * 1.5;
        ctx.globalAlpha = opacity * 0.3;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(px, py, glowRadius, 0, 6.2831853);
        ctx.fill();
      }
    }

    ctx.restore();

    /* ================================================================
       2. Meteors — spawn & update
       ================================================================ */

    // Process burst queue
    const queue = burstQueueRef.current;
    for (let i = queue.length - 1; i >= 0; i--) {
      if (time >= queue[i]) {
        spawnMeteor(meteorsRef.current, w, h, time, rand, false);
        queue.splice(i, 1);
      }
    }

    // Schedule shower bursts (2-3 meteors in quick succession) every 30-45s
    if (nextBurstRef.current === 0) {
      nextBurstRef.current = time + 25 + rand() * 10;
    }
    if (time >= nextBurstRef.current) {
      const burstCount = 2 + Math.floor(rand() * 2); // 2-3 meteors
      for (let i = 0; i < burstCount; i++) {
        queue.push(time + i * 0.2); // 200ms apart
      }
      nextBurstRef.current = time + 30 + rand() * 15; // 30-45s until next burst
    }

    // Spawn regular meteors every 4-8 seconds
    if (nextMeteorRef.current === 0) {
      nextMeteorRef.current = time + 2 + rand() * 3; // first one after 2-5s
    }
    if (time >= nextMeteorRef.current) {
      spawnMeteor(meteorsRef.current, w, h, time, rand, false);
      nextMeteorRef.current = time + 4 + rand() * 4; // 4-8s until next
    }

    // Spawn occasional comet every 60-90 seconds
    if (nextCometRef.current === 0) {
      nextCometRef.current = time + 30 + rand() * 30; // first comet 30-60s in
    }
    if (time >= nextCometRef.current) {
      spawnMeteor(meteorsRef.current, w, h, time, rand, true);
      nextCometRef.current = time + 60 + rand() * 30; // 60-90s until next
    }

    // Draw & advance meteors
    const meteors = meteorsRef.current;
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      if (!m.alive) {
        meteors.splice(i, 1);
        continue;
      }
      m.progress = (time - m.spawnTime) / m.duration;
      if (m.progress >= 1) {
        m.alive = false;
        meteors.splice(i, 1);
        continue;
      }

      drawMeteor(ctx, m, colors);
    }

    /* ================================================================
       3. Distant lightning flares
       ================================================================ */

    if (nextFlareRef.current === 0) {
      nextFlareRef.current = time + 10 + rand() * 20;
    }
    if (time >= nextFlareRef.current) {
      flaresRef.current.push({
        cx: rand() * w,
        cy: rand() * h * 0.7, // keep in upper 70%
        spawnTime: time,
        alive: true,
      });
      nextFlareRef.current = time + 20 + rand() * 20; // 20-40s
    }

    const flares = flaresRef.current;
    for (let i = flares.length - 1; i >= 0; i--) {
      const f = flares[i];
      const age = time - f.spawnTime; // seconds
      if (age > 0.45) {
        f.alive = false;
        flares.splice(i, 1);
        continue;
      }

      // Ramp in over 50ms, fade out over 400ms
      let alpha: number;
      if (age < 0.05) {
        alpha = (age / 0.05) * 0.15;
      } else {
        alpha = 0.15 * (1 - (age - 0.05) / 0.4);
      }
      if (alpha <= 0) continue;

      const grad = ctx.createRadialGradient(f.cx, f.cy, 0, f.cx, f.cy, 250);
      grad.addColorStop(0, colors.flare1);
      grad.addColorStop(1, "transparent");

      ctx.globalAlpha = alpha;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(f.cx, f.cy, 250, 0, 6.2831853);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  };

  const canvasRef = useCanvasBg(draw, init);

  /* ---- Render ---- */
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "var(--background)",
        overflow: "hidden",
      }}
    >
      {/* CSS nebula clouds — blur is far cheaper in the compositor */}
      <div
        style={{
          position: "absolute",
          width: "80vw",
          height: "60vh",
          top: "-15%",
          right: "-20%",
          borderRadius: "50%",
          background: "var(--starfield-nebula-1)",
          filter: "blur(100px)",
          willChange: "transform",
          animation: "midnight-nebula-drift-1 50s ease-in-out infinite alternate",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: "60vw",
          height: "70vh",
          bottom: "-20%",
          left: "-15%",
          borderRadius: "50%",
          background: "var(--starfield-nebula-2)",
          filter: "blur(100px)",
          willChange: "transform",
          animation: "midnight-nebula-drift-2 55s ease-in-out infinite alternate",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: "50vw",
          height: "50vh",
          top: "30%",
          left: "20%",
          borderRadius: "50%",
          background: "var(--starfield-nebula-3)",
          filter: "blur(100px)",
          willChange: "transform",
          animation: "midnight-nebula-drift-3 60s ease-in-out infinite alternate",
          pointerEvents: "none",
        }}
      />

      {/* Canvas layer for stars, meteors, flares */}
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />

      {/* Keyframes for nebula drift animations */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
@keyframes midnight-nebula-drift-1 {
  0% { transform: translate(0, 0) scale(1); }
  100% { transform: translate(-4vw, 3vh) scale(1.05); }
}
@keyframes midnight-nebula-drift-2 {
  0% { transform: translate(0, 0) scale(1); }
  100% { transform: translate(5vw, -4vh) scale(1.03); }
}
@keyframes midnight-nebula-drift-3 {
  0% { transform: translate(0, 0) scale(1); }
  100% { transform: translate(-3vw, -5vh) scale(1.06); }
}
`,
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers (outside component — no closures over React state)        */
/* ------------------------------------------------------------------ */

/** Spawn a meteor and push it into the pool */
function spawnMeteor(
  pool: Meteor[],
  w: number,
  h: number,
  time: number,
  rand: () => number,
  isComet: boolean,
) {
  // Start from top edge or right edge
  let x0: number;
  let y0: number;
  if (rand() < 0.5) {
    // top edge
    x0 = w * 0.3 + rand() * w * 0.7;
    y0 = 0;
  } else {
    // right edge
    x0 = w;
    y0 = rand() * h * 0.5;
  }

  // Direction: upper-right to lower-left, with some variance
  const angle = (210 + rand() * 30) * (Math.PI / 180); // 210-240 degrees
  const dx = Math.cos(angle);
  const dy = -Math.sin(angle); // canvas y is inverted

  // Vary brightness and speed — some fast bright, some slow dim
  const brightness = isComet ? 1.0 : (0.4 + rand() * 0.6); // comet always bright

  pool.push({
    x0,
    y0,
    dx,
    dy,
    trailLen: isComet ? 400 + rand() * 200 : 120 + rand() * 180, // comet: 400-600px, meteor: 120-300px
    duration: isComet ? 2.0 + rand() * 1.0 : 0.5 + rand() * 1.0, // comet: 2-3s, meteor: 0.5-1.5s
    spawnTime: time,
    progress: 0,
    alive: true,
    brightness,
    isComet,
  });
}

/** Draw a single meteor with gradient trail */
function drawMeteor(
  ctx: CanvasRenderingContext2D,
  m: Meteor,
  colors: CachedColors,
) {
  const t = m.progress;
  // Ease-in-out for smooth motion
  const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) * (-2 * t + 2) / 2;

  // Travel distance: comets travel further
  const travelDist = m.trailLen * (m.isComet ? 4 : 3);
  const headX = m.x0 + m.dx * travelDist * eased;
  const headY = m.y0 + m.dy * travelDist * eased;

  // Trail extends behind the head
  const tailX = headX - m.dx * m.trailLen;
  const tailY = headY - m.dy * m.trailLen;

  // Fade in at start, fade out at end
  let alpha: number;
  if (t < 0.1) {
    alpha = t / 0.1;
  } else if (t > 0.7) {
    alpha = (1 - t) / 0.3;
  } else {
    alpha = 1;
  }

  // Apply per-meteor brightness
  alpha *= m.brightness;

  if (m.isComet) {
    // Comet has wider, brighter tail with more opacity
    const grad = ctx.createLinearGradient(headX, headY, tailX, tailY);
    grad.addColorStop(0, colors.meteorHead);
    grad.addColorStop(0.2, colors.meteorTrail1);
    grad.addColorStop(0.6, colors.meteorTrail2);
    grad.addColorStop(1, colors.meteorTrail3);

    ctx.globalAlpha = alpha * 0.95;
    ctx.strokeStyle = grad;
    ctx.lineWidth = 3.0; // wider tail for comet
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(headX, headY);
    ctx.lineTo(tailX, tailY);
    ctx.stroke();

    // Bright head with glow
    ctx.globalAlpha = alpha;
    ctx.fillStyle = colors.meteorHead;
    ctx.beginPath();
    ctx.arc(headX, headY, 3, 0, 6.2831853);
    ctx.fill();

    // Stronger glow for comet
    ctx.globalAlpha = alpha * 0.6;
    ctx.beginPath();
    ctx.arc(headX, headY, 10, 0, 6.2831853);
    ctx.fill();

    ctx.globalAlpha = alpha * 0.3;
    ctx.beginPath();
    ctx.arc(headX, headY, 20, 0, 6.2831853);
    ctx.fill();
  } else {
    // Regular meteor
    // Trail gradient
    const grad = ctx.createLinearGradient(headX, headY, tailX, tailY);
    grad.addColorStop(0, colors.meteorTrail1);
    grad.addColorStop(0.4, colors.meteorTrail2);
    grad.addColorStop(1, colors.meteorTrail3);

    ctx.globalAlpha = alpha * 0.85;
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.2 + m.brightness * 0.8; // 1.2–2.0 depending on brightness
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(headX, headY);
    ctx.lineTo(tailX, tailY);
    ctx.stroke();

    // Bright head
    ctx.globalAlpha = alpha;
    ctx.fillStyle = colors.meteorHead;
    ctx.beginPath();
    ctx.arc(headX, headY, 1.5 + m.brightness, 0, 6.2831853);
    ctx.fill();

    // Head glow
    ctx.globalAlpha = alpha * 0.45;
    ctx.beginPath();
    ctx.arc(headX, headY, 4 + m.brightness * 3, 0, 6.2831853);
    ctx.fill();
  }
}

export default MidnightBackground;
