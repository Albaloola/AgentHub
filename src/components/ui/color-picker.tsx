"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  onClose: () => void;
}

function hslToRgba(h: number, s: number, l: number, a: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return `rgba(${Math.round((r + m) * 255)},${Math.round((g + m) * 255)},${Math.round((b + m) * 255)},${a})`;
}

function parseRgba(str: string): { r: number; g: number; b: number; a: number } {
  const match = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (match) return { r: +match[1], g: +match[2], b: +match[3], a: match[4] ? +match[4] : 1 };
  return { r: 59, g: 130, b: 246, a: 0.3 };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  return { h, s, l };
}

export function ColorPicker({ color, onChange, onClose }: ColorPickerProps) {
  const parsed = parseRgba(color);
  const initial = rgbToHsl(parsed.r, parsed.g, parsed.b);

  const [hue, setHue] = useState(initial.h);
  const [sat, setSat] = useState(initial.s);
  const [light, setLight] = useState(initial.l);
  const [alpha, setAlpha] = useState(parsed.a);

  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const currentColor = hslToRgba(hue, sat, light, alpha);

  useEffect(() => {
    onChange(currentColor);
  }, [hue, sat, light, alpha]);

  const handleCanvasInteraction = useCallback((clientX: number, clientY: number) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    setSat(x);
    setLight(1 - y);
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e: MouseEvent) => handleCanvasInteraction(e.clientX, e.clientY);
    const handleUp = () => setDragging(false);
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
  }, [dragging, handleCanvasInteraction]);

  return (
    <div className="rounded-2xl border border-white/[0.08] glass-strong p-4 space-y-4 animate-fade-in w-72">
      {/* Saturation/Lightness canvas */}
      <div
        ref={canvasRef}
        className="relative w-full h-40 rounded-xl overflow-hidden cursor-crosshair"
        style={{
          background: `linear-gradient(to bottom, white, transparent, black),
                       linear-gradient(to right, gray, hsl(${hue}, 100%, 50%))`,
        }}
        onMouseDown={(e) => {
          setDragging(true);
          handleCanvasInteraction(e.clientX, e.clientY);
        }}
      >
        {/* Selector circle */}
        <div
          className="absolute w-5 h-5 rounded-full border-2 border-white pointer-events-none"
          style={{
            left: `${sat * 100}%`,
            top: `${(1 - light) * 100}%`,
            transform: "translate(-50%, -50%)",
            boxShadow: `0 0 8px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(0,0,0,0.2)`,
            background: "transparent",
          }}
        />
      </div>

      {/* Hue slider */}
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground/60">Hue</label>
        <div className="relative h-3 rounded-full overflow-hidden">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: "linear-gradient(to right, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))",
            }}
          />
          <input
            type="range"
            min={0}
            max={360}
            value={hue}
            onChange={(e) => setHue(+e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div
            className="absolute top-1/2 w-4 h-4 rounded-full border-2 border-white pointer-events-none"
            style={{
              left: `${(hue / 360) * 100}%`,
              transform: "translate(-50%, -50%)",
              boxShadow: "0 0 6px rgba(0,0,0,0.4)",
              background: `hsl(${hue}, 100%, 50%)`,
            }}
          />
        </div>
      </div>

      {/* Alpha/opacity slider */}
      <div className="space-y-1.5">
        <label className="text-xs text-muted-foreground/60">Opacity</label>
        <div className="relative h-3 rounded-full overflow-hidden">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `linear-gradient(to right, transparent, hsl(${hue}, ${sat * 100}%, ${light * 100}%))`,
            }}
          />
          <input
            type="range"
            min={0}
            max={100}
            value={alpha * 100}
            onChange={(e) => setAlpha(+e.target.value / 100)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div
            className="absolute top-1/2 w-4 h-4 rounded-full border-2 border-white pointer-events-none"
            style={{
              left: `${alpha * 100}%`,
              transform: "translate(-50%, -50%)",
              boxShadow: "0 0 6px rgba(0,0,0,0.4)",
              background: currentColor,
            }}
          />
        </div>
      </div>

      {/* Preview + value */}
      <div className="flex items-center gap-3">
        <div
          className="h-10 w-10 rounded-xl border border-white/[0.1] shrink-0"
          style={{ background: currentColor }}
        />
        <div className="flex-1">
          <div className="text-xs font-mono text-muted-foreground/60 break-all leading-tight">{currentColor}</div>
        </div>
        <button
          onClick={onClose}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}
