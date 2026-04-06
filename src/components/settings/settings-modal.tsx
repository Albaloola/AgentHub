"use client";

import { useEffect, useState } from "react";
import {
  Settings, Palette, Type, Layout, Keyboard, X, Save,
  Loader2, Check, RotateCcw, Monitor,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
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

type Tab = "appearance" | "layout" | "advanced";

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [prefs, setPrefs] = useState<ThemePreference | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("appearance");

  useEffect(() => {
    if (open) loadTheme();
  }, [open]);

  useEffect(() => {
    if (prefs && !loading) applyThemeToDOM(prefs);
  }, [prefs?.accent_color, prefs?.density, prefs?.border_radius, prefs?.font_family]);

  async function loadTheme() {
    setLoading(true);
    try {
      const t = await getTheme();
      setPrefs(t);
    } catch {
      setPrefs({ id: "default", theme: "dark", accent_color: "#3b82f6", font_family: "system-ui", density: "comfortable", border_radius: "md", custom_css: "", created_at: "" });
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
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function update(partial: Partial<ThemePreference>) {
    if (!prefs) return;
    setPrefs({ ...prefs, ...partial });
  }

  function applyPreset(p: typeof PRESETS[0]) {
    update({ theme: p.theme, accent_color: p.accent, border_radius: p.radius });
  }

  function applyThemeToDOM(p: ThemePreference) {
    const root = document.documentElement;
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
    root.setAttribute("data-density", p.density);
    const radiusMap: Record<string, string> = { none: "0px", sm: "0.375rem", md: "0.625rem", lg: "0.875rem", xl: "1.25rem" };
    root.style.setProperty("--radius", radiusMap[p.border_radius] ?? "0.625rem");
    if (p.font_family !== "system-ui") {
      root.style.setProperty("--font-geist-sans", `${p.font_family}, system-ui, sans-serif`);
    } else {
      root.style.removeProperty("--font-geist-sans");
    }
    let styleEl = document.getElementById("agenthub-custom-css");
    if (!styleEl) { styleEl = document.createElement("style"); styleEl.id = "agenthub-custom-css"; document.head.appendChild(styleEl); }
    styleEl.textContent = p.custom_css;
  }

  if (!open) return null;

  const tabs: { id: Tab; label: string; icon: typeof Palette }[] = [
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "layout", label: "Layout", icon: Layout },
    { id: "advanced", label: "Advanced", icon: Monitor },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[80vh] rounded-2xl border border-border/30 bg-card shadow-2xl overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/30">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold">Settings</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" className="h-7 text-xs rounded-lg" onClick={handleSave} disabled={saving || loading}>
              {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
              Save
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border/30">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors border-b-2",
                activeTab === tab.id
                  ? "border-blue-500 text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[60vh] p-5 space-y-5">
          {loading || !prefs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : activeTab === "appearance" ? (
            <>
              {/* Presets */}
              <div>
                <Label className="text-xs font-medium mb-2 block">Theme Presets</Label>
                <div className="grid grid-cols-3 gap-2">
                  {PRESETS.map((p) => (
                    <button
                      key={p.name}
                      className={cn(
                        "flex items-center gap-2 rounded-xl border border-border/30 p-2.5 text-xs transition-all hover:bg-accent/20",
                        prefs.accent_color === p.accent && "border-blue-500/50 bg-accent/10",
                      )}
                      onClick={() => applyPreset(p)}
                    >
                      <div className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: p.accent }} />
                      <span>{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Accent color */}
              <div>
                <Label className="text-xs font-medium mb-2 block">Accent Color</Label>
                <div className="flex gap-2 items-center">
                  {ACCENT_COLORS.map((c) => (
                    <button
                      key={c.value}
                      className={cn(
                        "h-7 w-7 rounded-full border-2 transition-all hover:scale-110",
                        prefs.accent_color === c.value ? "border-white scale-110" : "border-transparent",
                      )}
                      style={{ backgroundColor: c.value }}
                      onClick={() => update({ accent_color: c.value })}
                      title={c.label}
                    />
                  ))}
                  <Input
                    type="color"
                    className="h-7 w-7 p-0 border-0 cursor-pointer rounded-full"
                    value={prefs.accent_color}
                    onChange={(e) => update({ accent_color: e.target.value })}
                  />
                </div>
              </div>

              {/* Font */}
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Font Family</Label>
                <Select value={prefs.font_family} onValueChange={(v) => v && update({ font_family: v })}>
                  <SelectTrigger className="h-9 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system-ui">System Default</SelectItem>
                    <SelectItem value="Inter">Inter</SelectItem>
                    <SelectItem value="JetBrains Mono">JetBrains Mono</SelectItem>
                    <SelectItem value="Fira Code">Fira Code</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : activeTab === "layout" ? (
            <>
              {/* Density */}
              <div>
                <Label className="text-xs font-medium mb-2 block">UI Density</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["compact", "comfortable", "spacious"] as const).map((d) => (
                    <button
                      key={d}
                      className={cn(
                        "rounded-xl border border-border/30 p-3 text-xs transition-all hover:bg-accent/20 capitalize",
                        prefs.density === d && "border-blue-500/50 bg-accent/10",
                      )}
                      onClick={() => update({ density: d })}
                    >
                      <div className="font-medium mb-1">{d}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {d === "compact" ? "Smaller text, tighter spacing" :
                         d === "comfortable" ? "Default spacing and size" :
                         "Larger text, more breathing room"}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Border radius */}
              <div>
                <Label className="text-xs font-medium mb-2 block">Corner Roundness</Label>
                <div className="flex gap-2">
                  {[
                    { value: "none", label: "Sharp", preview: "rounded-none" },
                    { value: "sm", label: "Subtle", preview: "rounded-sm" },
                    { value: "md", label: "Medium", preview: "rounded-md" },
                    { value: "lg", label: "Round", preview: "rounded-lg" },
                    { value: "xl", label: "Pill", preview: "rounded-xl" },
                  ].map((r) => (
                    <button
                      key={r.value}
                      className={cn(
                        "flex-1 flex flex-col items-center gap-1.5 p-2 border border-border/30 rounded-xl text-[10px] transition-all hover:bg-accent/20",
                        prefs.border_radius === r.value && "border-blue-500/50 bg-accent/10",
                      )}
                      onClick={() => update({ border_radius: r.value })}
                    >
                      <div className={cn("h-6 w-10 border-2 border-muted-foreground/30", r.preview)} />
                      <span>{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Custom CSS */}
              <div>
                <Label className="text-xs font-medium mb-1.5 block">Custom CSS</Label>
                <Textarea
                  className="font-mono text-xs min-h-[100px] rounded-xl"
                  placeholder="/* Override any style */"
                  value={prefs.custom_css}
                  onChange={(e) => update({ custom_css: e.target.value })}
                />
              </div>

              <Separator />

              {/* Keyboard shortcuts info */}
              <div>
                <Label className="text-xs font-medium mb-2 block">Keyboard Shortcuts</Label>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between"><span>Open settings</span><kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono border border-border/30">Ctrl+,</kbd></div>
                  <div className="flex justify-between"><span>Command palette</span><kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono border border-border/30">Ctrl+K</kbd></div>
                  <div className="flex justify-between"><span>Shortcut help</span><kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono border border-border/30">?</kbd></div>
                </div>
              </div>

              <Separator />

              {/* Reset */}
              <Button variant="outline" size="sm" className="rounded-lg" onClick={() => applyPreset(PRESETS[0])}>
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Reset to Defaults
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
