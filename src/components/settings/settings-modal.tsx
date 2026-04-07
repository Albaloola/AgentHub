"use client";

import { useState, useEffect, useRef } from "react";
import {
  X, Monitor, Moon, Sun, Type, Layout, Palette, MessageSquare,
  Settings2, Sparkles, Zap, RotateCcw, ChevronRight, Check,
  Sidebar, Eye, Bell, Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type UiPrefs = ReturnType<typeof useStore.getState>["uiPrefs"];
type SetUiPref = ReturnType<typeof useStore.getState>["setUiPref"];

const TABS = [
  { id: "layout", label: "Layout", icon: Layout },
  { id: "theme", label: "Theme", icon: Palette },
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "animations", label: "Effects", icon: Sparkles },
  { id: "sidebar", label: "Sidebar", icon: Sidebar },
  { id: "general", label: "General", icon: Settings2 },
] as const;

const DENSITY_OPTIONS = [
  { value: "compact" as const, label: "Compact", desc: "Maximum information density" },
  { value: "comfortable" as const, label: "Comfortable", desc: "Balanced spacing" },
  { value: "spacious" as const, label: "Spacious", desc: "Relaxed, airy layout" },
];

const ACCENT_COLORS = [
  { value: "blue-violet", label: "Blue Violet", swatch: "from-blue-500 to-violet-600" },
  { value: "cyan-blue", label: "Cyan Blue", swatch: "from-cyan-500 to-blue-600" },
  { value: "emerald-teal", label: "Emerald", swatch: "from-emerald-500 to-teal-600" },
  { value: "amber-orange", label: "Amber", swatch: "from-amber-500 to-orange-600" },
  { value: "rose-pink", label: "Rose", swatch: "from-rose-500 to-pink-600" },
  { value: "indigo-purple", label: "Indigo", swatch: "from-indigo-500 to-purple-600" },
];

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<string>("layout");
  const { uiPrefs, setUiPref, resetUiPrefs } = useStore();
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus trap and escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      // Focus trap
      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    // Focus first element
    setTimeout(() => {
      const first = modalRef.current?.querySelector<HTMLElement>("button");
      first?.focus();
    }, 100);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Settings">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fade-in_0.2s_ease-out]"
        onClick={onClose}
      />

      {/* Modal */}
      <div ref={modalRef} className="relative z-10 w-[90vw] max-w-3xl max-h-[85vh] rounded-2xl border border-white/[0.08] glass-strong animate-[slide-up_0.3s_cubic-bezier(0.16,1,0.3,1)] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-[0_0_12px_oklch(0.55_0.24_264/0.3)]">
              <Settings2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Settings</h2>
              <p className="text-xs text-muted-foreground/60">Customize your AgentHub experience</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg hover:bg-white/[0.06]"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex h-[calc(85vh-80px)]">
          <div className="w-44 shrink-0 border-r border-white/[0.06] p-3 space-y-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "relative flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-all duration-200",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"
                  )}
                >
                  {isActive && (
                    <div className="absolute inset-0 rounded-xl bg-oklch(0.55_0.24_264_/0.08) animate-[luminance-pulse_3s_ease-in-out_infinite]" />
                  )}
                  <Icon className={cn("h-4 w-4 shrink-0 relative z-10", isActive && "text-oklch(0.55_0.24_264)")} />
                  <span className="relative z-10 font-medium">{tab.label}</span>
                  {isActive && (
                    <ChevronRight className="h-3 w-3 ml-auto relative z-10 text-oklch(0.55_0.24_264)" />
                  )}
                </button>
              );
            })}

            <Separator className="my-2" />

            <button
              onClick={() => { resetUiPrefs(); }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:text-red-400 transition-all duration-200 hover:bg-white/[0.03]"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset All</span>
            </button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              {activeTab === "layout" && <LayoutTab prefs={uiPrefs} setPref={setUiPref} />}
              {activeTab === "theme" && <ThemeTab prefs={uiPrefs} setPref={setUiPref} />}
              {activeTab === "chat" && <ChatTab prefs={uiPrefs} setPref={setUiPref} />}
              {activeTab === "animations" && <EffectsTab prefs={uiPrefs} setPref={setUiPref} />}
              {activeTab === "sidebar" && <SidebarTab prefs={uiPrefs} setPref={setUiPref} />}
              {activeTab === "general" && <GeneralTab prefs={uiPrefs} setPref={setUiPref} />}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

function SettingRow({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {desc && <div className="text-xs text-muted-foreground/60 mt-0.5">{desc}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: typeof Layout; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground/80">{title}</h3>
    </div>
  );
}

function LayoutTab({ prefs, setPref }: { prefs: UiPrefs; setPref: SetUiPref }) {
  const [zoomPreview, setZoomPreview] = useState(prefs.fontSize);
  const [fontPreview, setFontPreview] = useState(prefs.fontSize);

  const FONT_FAMILIES: Record<string, string> = {
    geist: "var(--font-geist-sans)",
    inter: "Inter, system-ui, sans-serif",
    "plus-jakarta": "Plus Jakarta Sans, system-ui, sans-serif",
    "ibm-plex": "IBM Plex Sans, system-ui, sans-serif",
    "sf-pro": "SF Pro Display, system-ui, sans-serif",
    "jetbrains-mono": "JetBrains Mono, monospace",
  };

  const currentFontFamily = FONT_FAMILIES[prefs.fontFamily] || FONT_FAMILIES.geist;

  return (
    <>
      <SectionTitle icon={Layout} title="Density" />
      <div className="grid gap-2">
        {DENSITY_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setPref("density", opt.value)}
            className={cn(
              "flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all duration-200",
              prefs.density === opt.value
                ? "border-oklch(0.55_0.24_264_/0.6) bg-oklch(0.55_0.24_264_/0.12) shadow-[0_0_12px_oklch(0.55_0.24_264_/0.15)]"
                : "border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.03]"
            )}
          >
            <div className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all",
              prefs.density === opt.value
                ? "border-oklch(0.55_0.24_264) bg-oklch(0.55_0.24_264)"
                : "border-white/[0.15]"
            )}>
              {prefs.density === opt.value && <Check className="h-3 w-3 text-white" />}
            </div>
            <div>
              <div className="text-sm font-medium">{opt.label}</div>
              <div className="text-[11px] text-muted-foreground/60">{opt.desc}</div>
            </div>
          </button>
        ))}
      </div>

      <Separator />

      <SectionTitle icon={Type} title="Zoom" />
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground/60">Smaller</span>
          <span className="text-xs font-mono text-foreground/80">{zoomPreview}%</span>
          <span className="text-xs text-muted-foreground/60">Larger</span>
        </div>
        <Slider
          min={70}
          max={150}
          step={5}
          value={[zoomPreview]}
          onValueChange={(v) => setZoomPreview(Array.isArray(v) ? v[0] : v)}
          onValueCommitted={(v) => setPref("fontSize", Math.round((Array.isArray(v) ? v[0] : v) * 0.16))}
        />
        <div
          className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center transition-all duration-200"
          style={{ fontSize: `${zoomPreview * 0.16}px` }}
        >
          <span className="text-muted-foreground/70">Preview text at {zoomPreview}% zoom</span>
        </div>
      </div>

      <Separator />

      <SectionTitle icon={Type} title="Font Size" />
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground/60">12px</span>
          <span className="text-xs font-mono text-foreground/80">{fontPreview}px</span>
          <span className="text-xs text-muted-foreground/60">24px</span>
        </div>
        <Slider
          min={12}
          max={24}
          step={1}
          value={[fontPreview]}
          onValueChange={(v) => setFontPreview(Array.isArray(v) ? v[0] : v)}
          onValueCommitted={(v) => setPref("fontSize", Array.isArray(v) ? v[0] : v)}
        />
        <div
          className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center transition-all duration-200"
          style={{ fontFamily: currentFontFamily, fontSize: `${fontPreview}px` }}
        >
          <span className="text-muted-foreground/70">The quick brown fox jumps over the lazy dog</span>
        </div>
      </div>

      <Separator />

      <SectionTitle icon={Type} title="Font Family" />
      <div className="grid grid-cols-2 gap-2">
        {[
          { value: "geist", label: "Geist Sans", style: { fontFamily: "var(--font-geist-sans)" } },
          { value: "inter", label: "Inter", style: { fontFamily: "Inter, system-ui, sans-serif" } },
          { value: "plus-jakarta", label: "Plus Jakarta", style: { fontFamily: "Plus Jakarta Sans, system-ui, sans-serif" } },
          { value: "ibm-plex", label: "IBM Plex Sans", style: { fontFamily: "IBM Plex Sans, system-ui, sans-serif" } },
          { value: "sf-pro", label: "SF Pro", style: { fontFamily: "SF Pro Display, system-ui, sans-serif" } },
          { value: "jetbrains-mono", label: "JetBrains Mono", style: { fontFamily: "JetBrains Mono, monospace" } },
        ].map((font) => (
          <button
            key={font.value}
            onClick={() => setPref("fontFamily", font.value)}
            className={cn(
              "flex flex-col gap-1 rounded-xl border-2 p-3 text-left transition-all duration-200",
              prefs.fontFamily === font.value
                ? "border-oklch(0.55_0.24_264_/0.6) bg-oklch(0.55_0.24_264_/0.12) shadow-[0_0_12px_oklch(0.55_0.24_264_/0.15)]"
                : "border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.03]"
            )}
          >
            <div className="flex items-center gap-2">
              <div className={cn(
                "flex h-4 w-4 items-center justify-center rounded-full border-2 transition-all",
                prefs.fontFamily === font.value
                  ? "border-oklch(0.55_0.24_264) bg-oklch(0.55_0.24_264)"
                  : "border-white/[0.15]"
              )}>
                {prefs.fontFamily === font.value && <Check className="h-2.5 w-2.5 text-white" />}
              </div>
              <span className="text-xs font-medium">{font.label}</span>
            </div>
            <span className="text-[11px] text-muted-foreground/50 truncate" style={font.style}>
              The quick brown fox
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

function ThemeTab({ prefs, setPref }: { prefs: UiPrefs; setPref: SetUiPref }) {
  return (
    <>
      <SectionTitle icon={Palette} title="Appearance" />
      <div className="grid grid-cols-3 gap-2">
        {[
          { value: "dark", label: "Dark", icon: Moon },
          { value: "light", label: "Light", icon: Sun },
          { value: "system", label: "System", icon: Monitor },
        ].map((theme) => {
          const Icon = theme.icon;
          return (
              <button
                key={theme.value}
                onClick={() => setPref("theme", theme.value)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all duration-200",
                  prefs.theme === theme.value
                    ? "border-oklch(0.55_0.24_264_/0.6) bg-oklch(0.55_0.24_264_/0.12) shadow-[0_0_12px_oklch(0.55_0.24_264_/0.15)]"
                    : "border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.03]"
                )}
              >
              <Icon className={cn("h-5 w-5", prefs.theme === theme.value && "text-oklch(0.55_0.24_264)")} />
              <span className="text-xs font-medium">{theme.label}</span>
            </button>
          );
        })}
      </div>

      <Separator />

      <SectionTitle icon={Palette} title="Accent Color" />
      <div className="grid grid-cols-3 gap-2">
        {ACCENT_COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => setPref("accentColor", color.value)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border-2 p-3 transition-all duration-200",
                  prefs.accentColor === color.value
                    ? "border-oklch(0.55_0.24_264_/0.6) bg-oklch(0.55_0.24_264_/0.12) shadow-[0_0_12px_oklch(0.55_0.24_264_/0.15)]"
                    : "border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.03]"
                )}
              >
            <div className={cn("h-4 w-4 rounded-full bg-gradient-to-br", color.swatch)} />
            <span className="text-xs font-medium">{color.label}</span>
            {prefs.accentColor === color.value && (
              <Check className="h-3 w-3 ml-auto text-oklch(0.55_0.24_264)" />
            )}
          </button>
        ))}
      </div>

      <Separator />

      <Separator />

      <SectionTitle icon={Sparkles} title="Glass Glow" />

      <div className="space-y-4">
        {/* UI panel glow color */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Panel Glow</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { label: "Blue", value: "rgba(59,130,246,0.1)" },
              { label: "Violet", value: "rgba(139,92,246,0.1)" },
              { label: "Cyan", value: "rgba(6,182,212,0.1)" },
              { label: "Emerald", value: "rgba(16,185,129,0.1)" },
              { label: "Amber", value: "rgba(245,158,11,0.1)" },
              { label: "Rose", value: "rgba(251,86,91,0.1)" },
              { label: "White", value: "rgba(242,242,242,0.07)" },
            ].map((c) => (
              <button
                key={c.label}
                onClick={() => setPref("glowColor", c.value)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] border transition-all",
                  prefs.glowColor === c.value
                    ? "border-white/20 bg-white/10"
                    : "border-white/[0.06] hover:border-white/[0.12]"
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Agent response glow color */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Agent Bubble Glow</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              { label: "Emerald", value: "rgba(16,185,129,0.1)" },
              { label: "Cyan", value: "rgba(6,182,212,0.1)" },
              { label: "Violet", value: "rgba(139,92,246,0.1)" },
              { label: "Blue", value: "rgba(59,130,246,0.1)" },
              { label: "Amber", value: "rgba(245,158,11,0.1)" },
              { label: "Rose", value: "rgba(251,86,91,0.1)" },
              { label: "White", value: "rgba(242,242,242,0.07)" },
            ].map((c) => (
              <button
                key={c.label}
                onClick={() => setPref("agentGlowColor", c.value)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] border transition-all",
                  prefs.agentGlowColor === c.value
                    ? "border-white/20 bg-white/10"
                    : "border-white/[0.06] hover:border-white/[0.12]"
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Glow spread */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Glow Spread</span>
            <span className="text-[10px] text-muted-foreground/50">{prefs.glowSpread}px</span>
          </div>
          <input
            type="range"
            min={0}
            max={60}
            value={prefs.glowSpread}
            onChange={(e) => setPref("glowSpread", parseInt(e.target.value))}
            className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-[9px] text-muted-foreground/30 mt-1">
            <span>None</span>
            <span>Subtle</span>
            <span>Bright</span>
          </div>
        </div>
      </div>
    </>
  );
}

function ChatTab({ prefs, setPref }: { prefs: UiPrefs; setPref: SetUiPref }) {
  return (
    <>
      <SectionTitle icon={MessageSquare} title="Chat Display" />
      <SettingRow label="Show timestamps" desc="Display time next to each message">
        <Switch checked={prefs.showTimestamps} onCheckedChange={(v) => setPref("showTimestamps", v)} />
      </SettingRow>
      <SettingRow label="Show avatars" desc="Display agent avatars in chat">
        <Switch checked={prefs.showAvatars} onCheckedChange={(v) => setPref("showAvatars", v)} />
      </SettingRow>
      <SettingRow label="Markdown rendering" desc="Render markdown in messages">
        <Switch checked={prefs.markdownEnabled} onCheckedChange={(v) => setPref("markdownEnabled", v)} />
      </SettingRow>
      <SettingRow label="Auto-scroll to bottom" desc="Automatically scroll to newest messages">
        <Switch checked={prefs.autoScroll} onCheckedChange={(v) => setPref("autoScroll", v)} />
      </SettingRow>
    </>
  );
}

function EffectsTab({ prefs, setPref }: { prefs: UiPrefs; setPref: SetUiPref }) {
  return (
    <>
      <SectionTitle icon={Sparkles} title="Visual Effects" />
      <SettingRow label="Ambient Background" desc="Animated gradient blobs in the background">
        <Switch checked={prefs.ambientBackground} onCheckedChange={(v) => setPref("ambientBackground", v)} />
      </SettingRow>
      <SettingRow label="Starfield" desc="Twinkling stars in chat backgrounds">
        <Switch checked={prefs.showStarfield} onCheckedChange={(v) => setPref("showStarfield", v)} />
      </SettingRow>
      <SettingRow label="Meteor Showers" desc="Occasional meteor streaks across the sky">
        <Switch checked={prefs.showMeteors} onCheckedChange={(v) => setPref("showMeteors", v)} />
      </SettingRow>
      <SettingRow label="Ambient Glow" desc="Subtle glow effects on active elements">
        <Switch checked={prefs.showAmbientGlow} onCheckedChange={(v) => setPref("showAmbientGlow", v)} />
      </SettingRow>

      <Separator />

      <SectionTitle icon={Zap} title="Animations" />
      <SettingRow label="Enable Animations" desc="Toggle all UI animations and transitions">
        <Switch checked={prefs.animationsEnabled} onCheckedChange={(v) => setPref("animationsEnabled", v)} />
      </SettingRow>
    </>
  );
}

function SidebarTab({ prefs, setPref }: { prefs: UiPrefs; setPref: SetUiPref }) {
  return (
    <>
      <SectionTitle icon={Sidebar} title="Navigation Style" />
      <div className="grid grid-cols-2 gap-2">
        {[
          { value: "pills" as const, label: "Floating Pills", desc: "Rounded pill-shaped items" },
          { value: "list" as const, label: "Classic List", desc: "Traditional list items" },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => setPref("navStyle", opt.value)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border p-4 text-left transition-all duration-200",
              prefs.navStyle === opt.value
                ? "border-oklch(0.55_0.24_264_/0.4) bg-oklch(0.55_0.24_264_/0.08)"
                : "border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.02]"
            )}
          >
            <div className={cn(
              "flex h-10 w-full items-center justify-center rounded-lg border transition-all",
              prefs.navStyle === opt.value
                ? "border-oklch(0.55_0.24_264_/0.3) bg-oklch(0.55_0.24_264_/0.1)"
                : "border-white/[0.08]"
            )}>
              {opt.value === "pills" ? (
                <div className="flex gap-1">
                  <div className="h-2 w-6 rounded-full bg-oklch(0.55_0.24_264_/0.4)" />
                  <div className="h-2 w-4 rounded-full bg-white/[0.08]" />
                  <div className="h-2 w-5 rounded-full bg-white/[0.08]" />
                </div>
              ) : (
                <div className="flex flex-col gap-1 w-full px-2">
                  <div className="h-1.5 w-full rounded-sm bg-oklch(0.55_0.24_264_/0.4)" />
                  <div className="h-1.5 w-3/4 rounded-sm bg-white/[0.08]" />
                  <div className="h-1.5 w-5/6 rounded-sm bg-white/[0.08]" />
                </div>
              )}
            </div>
            <div>
              <div className="text-xs font-medium">{opt.label}</div>
              <div className="text-[10px] text-muted-foreground/60">{opt.desc}</div>
            </div>
          </button>
        ))}
      </div>

      <Separator />

      <SectionTitle icon={Eye} title="Sidebar Behavior" />
      <SettingRow label="Start collapsed" desc="Sidebar starts in icon-only mode">
        <Switch checked={prefs.sidebarCollapsed} onCheckedChange={(v) => setPref("sidebarCollapsed", v)} />
      </SettingRow>
    </>
  );
}

function GeneralTab({ prefs, setPref }: { prefs: UiPrefs; setPref: SetUiPref }) {
  const { resetUiPrefs } = useStore();
  return (
    <>
      <SectionTitle icon={Globe} title="Language & Region" />
      <SettingRow label="Language" desc="Interface language">
        <span className="text-sm text-muted-foreground">English</span>
      </SettingRow>

      <Separator />

      <SectionTitle icon={Bell} title="Notifications" />
      <SettingRow label="Enable notifications" desc="Show system notifications">
        <Switch checked={prefs.notificationsEnabled} onCheckedChange={(v) => setPref("notificationsEnabled", v)} />
      </SettingRow>
      <SettingRow label="Sound effects" desc="Play sounds for events">
        <Switch checked={prefs.soundEffects} onCheckedChange={(v) => setPref("soundEffects", v)} />
      </SettingRow>

      <Separator />

      <SectionTitle icon={Settings2} title="Data" />
      <SettingRow label="Reset all settings" desc="Restore everything to defaults">
        <Button variant="outline" size="sm" onClick={() => { resetUiPrefs(); }} className="text-xs">
          <RotateCcw className="h-3 w-3 mr-1" />
          Reset
        </Button>
      </SettingRow>
    </>
  );
}
