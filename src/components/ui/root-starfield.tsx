"use client";

import { useMemo } from "react";

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  hue: number;
  twinkleDelay: number;
}

function generateStars(count: number, seed: number, sizeRange: [number, number], opacityRange: [number, number]): Star[] {
  const rand = seededRandom(seed);
  return Array.from({ length: count }, () => ({
    x: rand() * 100,
    y: rand() * 100,
    size: sizeRange[0] + rand() * (sizeRange[1] - sizeRange[0]),
    opacity: opacityRange[0] + rand() * (opacityRange[1] - opacityRange[0]),
    hue: rand() > 0.85 ? 200 + rand() * 80 : 0,
    twinkleDelay: -(rand() * 6),
  }));
}

const STARFIELD_STYLES = `
  @keyframes root-star-drift {
    0% { transform: translate(0, 0) rotate(0deg); }
    25% { transform: translate(-6vw, -4vh) rotate(0.5deg); }
    50% { transform: translate(0, -8vh) rotate(0deg); }
    75% { transform: translate(6vw, -4vh) rotate(-0.5deg); }
    100% { transform: translate(0, 0) rotate(0deg); }
  }

  @keyframes root-star-drift-reverse {
    0% { transform: translate(0, 0) rotate(0deg); }
    25% { transform: translate(5vw, 3vh) rotate(0.5deg); }
    50% { transform: translate(0, 6vh) rotate(0deg); }
    75% { transform: translate(-5vw, 3vh) rotate(-0.5deg); }
    100% { transform: translate(0, 0) rotate(0deg); }
  }

  @keyframes root-star-drift-slow {
    0% { transform: translate(0, 0) rotate(0deg); }
    25% { transform: translate(-3vw, -2vh) rotate(-0.3deg); }
    50% { transform: translate(0, -4vh) rotate(0deg); }
    75% { transform: translate(3vw, -2vh) rotate(0.3deg); }
    100% { transform: translate(0, 0) rotate(0deg); }
  }

  @keyframes root-twinkle {
    0%, 100% { opacity: var(--tw-base-opacity); }
    50% { opacity: calc(var(--tw-base-opacity) * 2.5); }
  }

  @keyframes root-meteor-fall {
    0% {
      transform: translate(0, 0) rotate(215deg) scaleX(1);
      opacity: 0;
    }
    8% { opacity: 1; }
    70% { opacity: 1; }
    100% {
      transform: translate(-120vw, 120vh) rotate(215deg) scaleX(0.1);
      opacity: 0;
    }
  }

  @keyframes root-meteor-glow {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.8; }
  }

  @keyframes root-nebula-pulse {
    0%, 100% { opacity: 0.04; transform: scale(1); }
    50% { opacity: 0.08; transform: scale(1.08); }
  }

  @keyframes root-lens-flare {
    0%, 100% { opacity: 0; transform: scale(0.8) rotate(0deg); }
    10% { opacity: 0.6; transform: scale(1) rotate(15deg); }
    50% { opacity: 0.3; transform: scale(1.2) rotate(45deg); }
    90% { opacity: 0.6; transform: scale(1) rotate(75deg); }
  }

  @keyframes root-lightning {
    0%, 100% { opacity: 0; }
    2% { opacity: 0.8; }
    4% { opacity: 0.1; }
    6% { opacity: 0.6; }
    8% { opacity: 0; }
    12% { opacity: 0.4; }
    14% { opacity: 0; }
  }

  @keyframes root-ambient-glow {
    0%, 100% { opacity: 0.03; }
    50% { opacity: 0.07; }
  }

  .root-starfield {
    position: fixed;
    inset: 0;
    z-index: -1;
    overflow: hidden;
    pointer-events: none;
    background:
      radial-gradient(ellipse 140% 100% at 20% 80%, oklch(0.14 0.02 260 / 0.5) 0%, transparent 55%),
      radial-gradient(ellipse 120% 80% at 80% 20%, oklch(0.13 0.015 280 / 0.4) 0%, transparent 50%),
      radial-gradient(ellipse 100% 100% at 50% 50%, oklch(0.10 0.008 260) 0%, oklch(0.07 0.005 260) 100%);
  }

  .root-starfield__nebula {
    position: absolute;
    border-radius: 50%;
    filter: blur(100px);
    pointer-events: none;
  }

  .root-starfield__nebula--1 {
    width: 80vw;
    height: 60vh;
    top: -15%;
    right: -20%;
    background: radial-gradient(circle, oklch(0.35 0.1 264 / 0.08), transparent 70%);
    animation: root-nebula-pulse 20s ease-in-out infinite;
  }

  .root-starfield__nebula--2 {
    width: 60vw;
    height: 70vh;
    bottom: -20%;
    left: -15%;
    background: radial-gradient(circle, oklch(0.30 0.08 200 / 0.06), transparent 70%);
    animation: root-nebula-pulse 25s ease-in-out infinite;
    animation-delay: -8s;
  }

  .root-starfield__nebula--3 {
    width: 50vw;
    height: 50vh;
    top: 35%;
    left: 25%;
    background: radial-gradient(circle, oklch(0.32 0.09 294 / 0.05), transparent 70%);
    animation: root-nebula-pulse 30s ease-in-out infinite;
    animation-delay: -15s;
  }

  .root-starfield__layer {
    position: absolute;
    inset: -10%;
    will-change: transform;
  }

  .root-starfield__layer--far {
    animation: root-star-drift-slow 100s linear infinite;
  }

  .root-starfield__layer--mid {
    animation: root-star-drift 75s linear infinite;
  }

  .root-starfield__layer--near {
    animation: root-star-drift-reverse 50s linear infinite;
  }

  .root-starfield__star {
    position: absolute;
    border-radius: 50%;
    background: oklch(0.98 0 0);
    animation: root-twinkle var(--tw-duration, 4s) ease-in-out infinite;
    animation-delay: var(--tw-delay, 0s);
    will-change: opacity;
  }

  .root-starfield__star--warm {
    background: oklch(0.97 0.04 70);
  }

  .root-starfield__star--cool {
    background: oklch(0.94 0.05 240);
  }

  .root-starfield__star--bright {
    background: oklch(1 0.02 260);
    box-shadow: 0 0 4px 2px oklch(0.8 0.1 260 / 0.4);
  }

  .root-starfield__meteor {
    position: absolute;
    width: 2px;
    height: 120px;
    background: linear-gradient(
      to bottom,
      oklch(0.98 0 0),
      oklch(0.75 0.1 260 / 0.6),
      oklch(0.6 0.12 260 / 0.25),
      transparent
    );
    border-radius: 100px;
    transform: rotate(215deg);
    animation: root-meteor-fall var(--meteor-duration, 1.8s) ease-in forwards;
    animation-delay: var(--meteor-delay, 0s);
    opacity: 0;
    z-index: 2;
    pointer-events: none;
  }

  .root-starfield__meteor::before {
    content: "";
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: oklch(0.98 0.05 260);
    box-shadow:
      0 0 12px 4px oklch(0.8 0.15 260 / 0.6),
      0 0 24px 8px oklch(0.7 0.12 260 / 0.3);
  }

  .root-starfield__meteor--long {
    height: 160px;
    width: 3px;
  }

  .root-starfield__meteor--long::before {
    width: 7px;
    height: 7px;
    box-shadow:
      0 0 15px 5px oklch(0.8 0.15 260 / 0.7),
      0 0 30px 10px oklch(0.7 0.12 260 / 0.3);
  }

  .root-starfield__meteor--short {
    height: 80px;
    width: 1.5px;
  }

  .root-starfield__lens-flare {
    position: absolute;
    width: 120px;
    height: 120px;
    border-radius: 50%;
    background: radial-gradient(
      circle,
      oklch(0.9 0.08 260 / 0.3) 0%,
      oklch(0.7 0.15 60 / 0.15) 30%,
      oklch(0.6 0.12 200 / 0.08) 60%,
      transparent 80%
    );
    animation: root-lens-flare var(--flare-duration, 12s) ease-in-out infinite;
    animation-delay: var(--flare-delay, 0s);
    pointer-events: none;
    z-index: 1;
  }

  .root-starfield__lightning {
    position: absolute;
    width: 2px;
    height: 200px;
    background: linear-gradient(
      to bottom,
      oklch(0.95 0.05 260 / 0.8),
      oklch(0.8 0.1 260 / 0.4),
      transparent
    );
    filter: blur(1px);
    animation: root-lightning var(--lightning-duration, 20s) ease-in-out infinite;
    animation-delay: var(--lightning-delay, 0s);
    pointer-events: none;
    z-index: 3;
  }

  .root-starfield__ambient-glow {
    position: absolute;
    border-radius: 50%;
    filter: blur(60px);
    animation: root-ambient-glow 15s ease-in-out infinite;
    pointer-events: none;
  }

  .root-starfield__noise {
    position: absolute;
    inset: 0;
    opacity: 0.015;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
    background-size: 128px 128px;
    pointer-events: none;
    mix-blend-mode: overlay;
  }
`;

export function RootStarfield() {
  const farStars = useMemo(() => generateStars(180, 42, [0.8, 1.5], [0.25, 0.5]), []);
  const midStars = useMemo(() => generateStars(90, 137, [1.2, 2.2], [0.4, 0.7]), []);
  const nearStars = useMemo(() => generateStars(40, 256, [2, 3.5], [0.6, 0.95]), []);

  const meteors = useMemo(
    () =>
      Array.from({ length: 15 }, (_, i) => ({
        id: i,
        x: -10 + ((i * 47 + 13) % 120),
        y: -15 - ((i * 31 + 7) % 20),
        delay: i * 3 + (i % 4) * 0.8,
        duration: 2.0 + (i % 5) * 0.3,
        variant: i % 4 === 0 ? "long" : i % 3 === 0 ? "short" : "",
      })),
    []
  );

  const lensFlares = useMemo(
    () =>
      Array.from({ length: 4 }, (_, i) => ({
        id: i,
        x: 15 + i * 22,
        y: 20 + (i % 3) * 25,
        delay: i * 8 + i * 2,
        duration: 10 + i * 3,
      })),
    []
  );

  const lightnings = useMemo(
    () =>
      Array.from({ length: 3 }, (_, i) => ({
        id: i,
        x: 20 + i * 30,
        y: -5 + i * 10,
        delay: i * 15 + 5,
        duration: 18 + i * 4,
      })),
    []
  );

  const renderStars = (stars: Star[], layerClass: string) => (
    <div className={layerClass}>
      {stars.map((star, i) => {
        const colorClass =
          star.hue > 240
            ? "root-starfield__star--cool"
            : star.hue > 40
              ? "root-starfield__star--warm"
              : star.opacity > 0.6
                ? "root-starfield__star--bright"
                : "";

        return (
          <div
            key={i}
            className={`root-starfield__star ${colorClass}`}
            style={
              {
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: `${star.size}px`,
                height: `${star.size}px`,
                "--tw-base-opacity": star.opacity,
                "--tw-duration": `${3 + (i % 4)}s`,
                "--tw-delay": `${star.twinkleDelay}s`,
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STARFIELD_STYLES }} />
      <div className="root-starfield" aria-hidden="true">
        <div className="root-starfield__nebula root-starfield__nebula--1" />
        <div className="root-starfield__nebula root-starfield__nebula--2" />
        <div className="root-starfield__nebula root-starfield__nebula--3" />

        {renderStars(farStars, "root-starfield__layer root-starfield__layer--far")}
        {renderStars(midStars, "root-starfield__layer root-starfield__layer--mid")}
        {renderStars(nearStars, "root-starfield__layer root-starfield__layer--near")}

        {meteors.map((m) => (
          <div
            key={m.id}
            className={`root-starfield__meteor ${m.variant ? `root-starfield__meteor--${m.variant}` : ""}`}
            style={
              {
                left: `${m.x}%`,
                top: `${m.y}%`,
                "--meteor-delay": `${m.delay}s`,
                "--meteor-duration": `${m.duration}s`,
              } as React.CSSProperties
            }
          />
        ))}

        <div className="root-starfield__noise" />
      </div>
    </>
  );
}

export default RootStarfield;
