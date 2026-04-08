"use client";

const fogKeyframes = [
  `@keyframes obsidian-fog-0 {
    0%, 100% { transform: translate(0, 0); }
    33% { transform: translate(4vw, -3vw); }
    66% { transform: translate(-3vw, 2vw); }
  }`,
  `@keyframes obsidian-fog-1 {
    0%, 100% { transform: translate(0, 0); }
    33% { transform: translate(-5vw, 2vw); }
    66% { transform: translate(2vw, -4vw); }
  }`,
  `@keyframes obsidian-fog-2 {
    0%, 100% { transform: translate(0, 0); }
    33% { transform: translate(3vw, 4vw); }
    66% { transform: translate(-4vw, -2vw); }
  }`,
  `@keyframes obsidian-fog-3 {
    0%, 100% { transform: translate(0, 0); }
    33% { transform: translate(-2vw, -5vw); }
    66% { transform: translate(5vw, 3vw); }
  }`,
];

const grainKeyframes = `@keyframes obsidian-grain {
  0% { background-position: 0 0; }
  100% { background-position: 128px 128px; }
}`;

const breatheKeyframes = `@keyframes obsidian-breathe {
  0%, 100% { transform: scale(1.0); }
  50% { transform: scale(1.07); }
}`;

const allKeyframes = [...fogKeyframes, grainKeyframes, breatheKeyframes].join("\n");

interface FogLayer {
  size: string;
  top: string;
  left: string;
  opacity: number;
  duration: string;
  animationName: string;
}

const fogLayers: FogLayer[] = [
  {
    size: "50vw",
    top: "-10%",
    left: "-5%",
    opacity: 0.18,
    duration: "72s",
    animationName: "obsidian-fog-0",
  },
  {
    size: "42vw",
    top: "50%",
    left: "60%",
    opacity: 0.14,
    duration: "84s",
    animationName: "obsidian-fog-1",
  },
  {
    size: "55vw",
    top: "30%",
    left: "-15%",
    opacity: 0.20,
    duration: "66s",
    animationName: "obsidian-fog-2",
  },
  {
    size: "36vw",
    top: "-20%",
    left: "70%",
    opacity: 0.16,
    duration: "90s",
    animationName: "obsidian-fog-3",
  },
];

const GRAIN_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`;

// Faint static light points — distant city lights through fog
const lightPoints = [
  { x: "22%", y: "35%" },
  { x: "71%", y: "58%" },
  { x: "48%", y: "18%" },
];

export function ObsidianBackground() {
  return (
    <div style={{ position: "absolute", inset: 0, background: "var(--background)" }}>
      <style dangerouslySetInnerHTML={{ __html: allKeyframes }} />

      {/* Fog layers */}
      {fogLayers.map((layer, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: layer.top,
            left: layer.left,
            width: layer.size,
            height: layer.size,
            borderRadius: "50%",
            background: "var(--foreground)",
            opacity: layer.opacity,
            filter: "blur(80px)",
            willChange: "transform",
            animation: `${layer.animationName} ${layer.duration} ease-in-out infinite`,
          }}
        />
      ))}

      {/* Faint static light points */}
      {lightPoints.map((pt, i) => (
        <div
          key={`lp-${i}`}
          style={{
            position: "absolute",
            left: pt.x,
            top: pt.y,
            width: 2,
            height: 2,
            borderRadius: "50%",
            background: "var(--foreground)",
            opacity: 0.15,
            pointerEvents: "none",
          }}
        />
      ))}

      {/* Grain texture */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: GRAIN_SVG,
          backgroundSize: "256px 256px",
          opacity: 0.07,
          mixBlendMode: "overlay",
          willChange: "transform",
          animation: "obsidian-grain 4s steps(1) infinite",
        }}
      />

      {/* Breathing vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 70% 70% at 50% 50%, transparent 0%, rgba(0,0,0,0.15) 60%, rgba(0,0,0,0.25) 100%)",
          willChange: "transform",
          animation: "obsidian-breathe 6s ease-in-out infinite",
        }}
      />
    </div>
  );
}
