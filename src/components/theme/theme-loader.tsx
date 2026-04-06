"use client";

import { useEffect } from "react";

export function ThemeLoader() {
  useEffect(() => {
    // Load theme from API and apply to DOM on every page load
    fetch("/api/theme")
      .then((res) => res.json())
      .then((p) => {
        if (!p || !p.accent_color) return;
        const root = document.documentElement;

        // Accent color
        root.style.setProperty("--accent-color", p.accent_color);
        const r = parseInt(p.accent_color.slice(1, 3), 16) / 255;
        const g = parseInt(p.accent_color.slice(3, 5), 16) / 255;
        const b = parseInt(p.accent_color.slice(5, 7), 16) / 255;
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
        root.style.setProperty("--accent-hue", Math.round(h).toString());
        root.style.setProperty("--accent-sat", `${Math.round(s * 100)}%`);
        root.style.setProperty("--accent-color-dim", `hsl(${Math.round(h)}, ${Math.round(s * 100)}%, 25%)`);
        root.style.setProperty("--accent-color-glow", `hsl(${Math.round(h)}, ${Math.round(s * 100)}%, 50%)`);

        // Density
        if (p.density) root.setAttribute("data-density", p.density);

        // Border radius
        const radiusMap: Record<string, string> = { none: "0px", sm: "0.375rem", md: "0.625rem", lg: "0.875rem", xl: "1.25rem" };
        if (p.border_radius) root.style.setProperty("--radius", radiusMap[p.border_radius] ?? "0.625rem");

        // Font
        if (p.font_family && p.font_family !== "system-ui") {
          root.style.setProperty("--font-geist-sans", `${p.font_family}, system-ui, sans-serif`);
        }

        // Custom CSS
        if (p.custom_css) {
          let styleEl = document.getElementById("agenthub-custom-css");
          if (!styleEl) {
            styleEl = document.createElement("style");
            styleEl.id = "agenthub-custom-css";
            document.head.appendChild(styleEl);
          }
          styleEl.textContent = p.custom_css;
        }
      })
      .catch(() => { /* theme API not available yet */ });
  }, []);

  return null;
}
