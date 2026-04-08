"use client";

/**
 * Daylight theme background — Soft Light Caustics
 * Warm, bright, airy. Organic light distortion patterns like sunlight
 * refracting through water onto a white surface.
 */

const CAUSTIC_STYLES = `
  @keyframes daylight-morph-1 {
    0%, 100% { border-radius: 40% 60% 55% 45% / 60% 40% 45% 55%; transform: translate(0, 0) scale(1); }
    25%  { border-radius: 55% 45% 60% 40% / 45% 55% 40% 60%; transform: translate(2vw, -1vh) scale(1.04); }
    50%  { border-radius: 45% 55% 40% 60% / 55% 45% 60% 40%; transform: translate(-1vw, 2vh) scale(0.98); }
    75%  { border-radius: 60% 40% 50% 50% / 40% 60% 50% 50%; transform: translate(-2vw, -1vh) scale(1.02); }
  }
  @keyframes daylight-morph-2 {
    0%, 100% { border-radius: 55% 45% 60% 40% / 45% 55% 40% 60%; transform: translate(0, 0) scale(1); }
    25%  { border-radius: 40% 60% 45% 55% / 60% 40% 55% 45%; transform: translate(-3vw, 2vh) scale(1.06); }
    50%  { border-radius: 50% 50% 55% 45% / 50% 50% 45% 55%; transform: translate(2vw, -2vh) scale(0.96); }
    75%  { border-radius: 45% 55% 40% 60% / 55% 45% 60% 40%; transform: translate(1vw, 1vh) scale(1.03); }
  }
  @keyframes daylight-morph-3 {
    0%, 100% { border-radius: 50% 50% 45% 55% / 55% 45% 50% 50%; transform: translate(0, 0) scale(1); }
    33%  { border-radius: 60% 40% 55% 45% / 40% 60% 45% 55%; transform: translate(3vw, 1vh) scale(1.05); }
    66%  { border-radius: 40% 60% 50% 50% / 60% 40% 50% 50%; transform: translate(-2vw, -2vh) scale(0.97); }
  }
  @keyframes daylight-morph-4 {
    0%, 100% { border-radius: 45% 55% 50% 50% / 50% 50% 55% 45%; transform: translate(0, 0) scale(1); }
    33%  { border-radius: 55% 45% 45% 55% / 45% 55% 50% 50%; transform: translate(-2vw, -2vh) scale(1.04); }
    66%  { border-radius: 50% 50% 60% 40% / 55% 45% 40% 60%; transform: translate(3vw, 2vh) scale(0.98); }
  }
  @keyframes daylight-morph-5 {
    0%, 100% { border-radius: 60% 40% 45% 55% / 40% 60% 55% 45%; transform: translate(0, 0) scale(1); }
    25%  { border-radius: 45% 55% 55% 45% / 55% 45% 45% 55%; transform: translate(2vw, 3vh) scale(1.03); }
    75%  { border-radius: 50% 50% 40% 60% / 60% 40% 50% 50%; transform: translate(-3vw, -1vh) scale(1.05); }
  }
  @keyframes daylight-orb-float {
    0%, 100% { transform: translate(0, 0); }
    25%  { transform: translate(20px, -15px); }
    50%  { transform: translate(-10px, -25px); }
    75%  { transform: translate(-20px, -5px); }
  }
  @keyframes daylight-prismatic {
    0%   { opacity: 0; transform: translateX(-100%) rotate(-15deg); }
    40%  { opacity: 0.20; }
    100% { opacity: 0; transform: translateX(100%) rotate(-15deg); }
  }
  @keyframes daylight-warmth {
    0%, 100% { opacity: 0.16; }
    50% { opacity: 0.28; }
  }
`;

export function DaylightBackground() {
  return (
    <div style={{ position: "absolute", inset: 0, background: "var(--background)" }}>
      <style dangerouslySetInnerHTML={{ __html: CAUSTIC_STYLES }} />

      {/* Caustic blob 1 — large, accent color */}
      <div
        style={{
          position: "absolute",
          width: "50vw",
          height: "50vw",
          top: "-15%",
          left: "-10%",
          background: "radial-gradient(ellipse at center, var(--theme-accent) 0%, transparent 70%)",
          filter: "blur(60px)",
          opacity: 0.36,
          animation: "daylight-morph-1 20s ease-in-out infinite",
          willChange: "transform, border-radius",
        }}
      />

      {/* Caustic blob 2 — accent-alt */}
      <div
        style={{
          position: "absolute",
          width: "45vw",
          height: "45vw",
          top: "15%",
          right: "-12%",
          background: "radial-gradient(ellipse at center, var(--theme-accent-alt) 0%, transparent 70%)",
          filter: "blur(50px)",
          opacity: 0.32,
          animation: "daylight-morph-2 25s ease-in-out infinite",
          willChange: "transform, border-radius",
        }}
      />

      {/* Caustic blob 3 — accent, bottom area */}
      <div
        style={{
          position: "absolute",
          width: "40vw",
          height: "40vw",
          bottom: "-10%",
          left: "20%",
          background: "radial-gradient(ellipse at center, var(--theme-accent) 0%, transparent 70%)",
          filter: "blur(55px)",
          opacity: 0.30,
          animation: "daylight-morph-3 22s ease-in-out infinite",
          willChange: "transform, border-radius",
        }}
      />

      {/* Caustic blob 4 — overlapping center area */}
      <div
        style={{
          position: "absolute",
          width: "35vw",
          height: "35vw",
          top: "40%",
          left: "35%",
          background: "radial-gradient(ellipse at center, var(--theme-accent-alt) 0%, transparent 70%)",
          filter: "blur(50px)",
          opacity: 0.28,
          animation: "daylight-morph-4 28s ease-in-out infinite",
          willChange: "transform, border-radius",
        }}
      />

      {/* Caustic blob 5 — upper center for overlap mixing */}
      <div
        style={{
          position: "absolute",
          width: "38vw",
          height: "38vw",
          top: "5%",
          left: "30%",
          background: "radial-gradient(ellipse at center, var(--theme-accent) 0%, transparent 70%)",
          filter: "blur(60px)",
          opacity: 0.26,
          animation: "daylight-morph-5 24s ease-in-out infinite",
          willChange: "transform, border-radius",
        }}
      />

      {/* Floating light orbs — clearly visible soft dots */}
      {[
        { x: "15%", y: "25%", size: 50, dur: 18, delay: 0 },
        { x: "75%", y: "15%", size: 40, dur: 22, delay: -5 },
        { x: "55%", y: "60%", size: 55, dur: 20, delay: -8 },
        { x: "30%", y: "70%", size: 45, dur: 24, delay: -12 },
        { x: "85%", y: "45%", size: 48, dur: 19, delay: -3 },
        { x: "45%", y: "35%", size: 35, dur: 26, delay: -15 },
      ].map((orb, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: orb.x,
            top: orb.y,
            width: orb.size,
            height: orb.size,
            borderRadius: "50%",
            background: "radial-gradient(circle, var(--theme-accent) 0%, transparent 70%)",
            opacity: 0.44,
            animation: `daylight-orb-float ${orb.dur}s ease-in-out infinite`,
            animationDelay: `${orb.delay}s`,
            willChange: "transform",
          }}
        />
      ))}

      {/* Prismatic flash — rainbow diagonal shimmer band */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(105deg, transparent 30%, #6366f1 40%, #8b5cf6 44%, #d946ef 48%, #f43f5e 52%, #f97316 56%, transparent 66%)",
          opacity: 0.16,
          animation: "daylight-prismatic 15s ease-in-out infinite",
          animationDelay: "-3s",
          pointerEvents: "none",
        }}
      />

      {/* Warmth gradient — warm-to-cool overlay that breathes */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(135deg, color-mix(in srgb, var(--theme-accent-alt) 12%, transparent) 0%, transparent 50%, color-mix(in srgb, var(--theme-accent) 10%, transparent) 100%)",
          animation: "daylight-warmth 12s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
