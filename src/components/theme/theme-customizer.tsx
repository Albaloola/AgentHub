"use client";

import { useState, useEffect } from "react";
import { Palette, Check, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getTheme, updateTheme } from "@/lib/api";
import type { ThemePreference } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const ACCENT_COLORS = [
  { value: "#3b82f6", label: "Blue" },
  { value: "#8b5cf6", label: "Violet" },
  { value: "#10b981", label: "Emerald" },
  { value: "#f59e0b", label: "Amber" },
  { value: "#ef4444", label: "Rose" },
  { value: "#06b6d4", label: "Cyan" },
  { value: "#ec4899", label: "Pink" },
  { value: "#f97316", label: "Orange" },
];

const PRESETS = [
  { name: "Default Dark", theme: "dark", accent: "#3b82f6", radius: "md" },
  { name: "Midnight", theme: "dark", accent: "#8b5cf6", radius: "lg" },
  { name: "Ocean", theme: "dark", accent: "#06b6d4", radius: "md" },
  { name: "Sunset", theme: "dark", accent: "#f97316", radius: "sm" },
  { name: "Terminal", theme: "dark", accent: "#10b981", radius: "none" },
  { name: "Light", theme: "light", accent: "#3b82f6", radius: "md" },
];

export function ThemeCustomizer() {
  const [prefs, setPrefs] = useState<ThemePreference | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  async function loadTheme() {
    try {
      const t = await getTheme();
      setPrefs(t);
      applyThemeToDOM(t);
    } catch {
      const defaults: ThemePreference = {
        id: "default",
        theme: "dark",
        accent_color: "#3b82f6",
        font_family: "system-ui",
        density: "comfortable",
        border_radius: "md",
        custom_css: "",
        created_at: "",
      };
      setPrefs(defaults);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!prefs) return;
    setSaving(true);
    try {
      await updateTheme(prefs);
      applyThemeToDOM(prefs);
      toast.success("Theme saved");
    } catch {
      toast.error("Failed to save theme");
    } finally {
      setSaving(false);
    }
  }

  function applyPreset(preset: typeof PRESETS[0]) {
    if (!prefs) return;
    const updated = { ...prefs, theme: preset.theme, accent_color: preset.accent, border_radius: preset.radius };
    setPrefs(updated);
    applyThemeToDOM(updated);
  }

  // Live-apply when individual settings change
  useEffect(() => {
    if (prefs && !loading) {
      applyThemeToDOM(prefs);
    }
  }, [prefs?.accent_color, prefs?.density, prefs?.border_radius, prefs?.font_family]);

  function applyThemeToDOM(p: ThemePreference) {
    const root = document.documentElement;
    // Accent color system
    root.style.setProperty("--accent-color", p.accent_color);
    // Convert hex to HSL for the variable system
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
    root.setAttribute("data-density", p.density);

    // Border radius
    const radiusMap: Record<string, string> = { none: "0px", sm: "0.375rem", md: "0.625rem", lg: "0.875rem", xl: "1.25rem" };
    root.style.setProperty("--radius", radiusMap[p.border_radius] ?? "0.625rem");

    // Font
    if (p.font_family !== "system-ui") {
      root.style.setProperty("--font-geist-sans", `${p.font_family}, system-ui, sans-serif`);
    } else {
      root.style.removeProperty("--font-geist-sans");
    }

    // Custom CSS injection
    let styleEl = document.getElementById("agenthub-custom-css");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "agenthub-custom-css";
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = p.custom_css;
  }

  if (loading || !prefs) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Theme Presets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                className={cn(
                  "flex items-center gap-2 rounded-md border border-border p-2 text-xs transition-colors hover:bg-accent/30",
                  prefs.accent_color === p.accent && prefs.theme === p.theme && "border-primary bg-accent/20",
                )}
                onClick={() => applyPreset(p)}
              >
                <div className="h-4 w-4 rounded-full" style={{ backgroundColor: p.accent }} />
                <span>{p.name}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs">Accent Color</Label>
            <div className="flex gap-2 mt-1.5">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c.value}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition-all",
                    prefs.accent_color === c.value ? "border-white scale-110" : "border-transparent",
                  )}
                  style={{ backgroundColor: c.value }}
                  onClick={() => setPrefs({ ...prefs, accent_color: c.value })}
                  title={c.label}
                />
              ))}
              <Input
                type="color"
                className="h-7 w-7 p-0 border-0 cursor-pointer"
                value={prefs.accent_color}
                onChange={(e) => setPrefs({ ...prefs, accent_color: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Density</Label>
            <Select value={prefs.density} onValueChange={(v) => v && setPrefs({ ...prefs, density: v as ThemePreference["density"] })}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Compact</SelectItem>
                <SelectItem value="comfortable">Comfortable</SelectItem>
                <SelectItem value="spacious">Spacious</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Border Radius</Label>
            <Select value={prefs.border_radius} onValueChange={(v) => v && setPrefs({ ...prefs, border_radius: v })}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (0px)</SelectItem>
                <SelectItem value="sm">Small (4px)</SelectItem>
                <SelectItem value="md">Medium (8px)</SelectItem>
                <SelectItem value="lg">Large (12px)</SelectItem>
                <SelectItem value="xl">Extra Large (16px)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Font Family</Label>
            <Select value={prefs.font_family} onValueChange={(v) => v && setPrefs({ ...prefs, font_family: v })}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="system-ui">System Default</SelectItem>
                <SelectItem value="Inter">Inter</SelectItem>
                <SelectItem value="JetBrains Mono">JetBrains Mono</SelectItem>
                <SelectItem value="Fira Code">Fira Code</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div>
            <Label className="text-xs">Custom CSS</Label>
            <Textarea
              className="mt-1 font-mono text-xs min-h-[60px]"
              placeholder="/* Custom CSS overrides */"
              value={prefs.custom_css}
              onChange={(e) => setPrefs({ ...prefs, custom_css: e.target.value })}
            />
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
              Save Theme
            </Button>
            <Button size="sm" variant="outline" onClick={() => applyPreset(PRESETS[0])}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
