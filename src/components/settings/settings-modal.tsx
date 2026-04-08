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
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/lib/utils";
import { ColorPicker } from "@/components/ui/color-picker";
import { DARK_THEMES, LIGHT_THEMES, resolveThemePreference, type ThemeDefinition } from "@/lib/themes";

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

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

function selectionCardClass(active: boolean, className?: string) {
  return cn(
    "selection-card relative overflow-hidden rounded-[1rem] border p-3 transition-all duration-200",
    active && "selection-card-active",
    className,
  );
}

function selectionIndicatorClass(active: boolean) {
  return cn(
    "flex h-5 w-5 items-center justify-center rounded-full border text-white transition-all",
    active
      ? "border-[var(--theme-accent)] bg-[var(--theme-accent)] shadow-[var(--theme-accent-shadow)]"
      : "border-[var(--panel-border-strong)] bg-transparent"
  );
}

function chipClass(active: boolean, className?: string) {
  return cn(
    "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-200",
    active
      ? "selection-card-active text-[var(--theme-accent-text)]"
      : "selection-card text-muted-foreground hover:text-foreground",
    className,
  );
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<string>("layout");
  const { uiPrefs, setUiPref, commitUiPrefs, revertUiPrefs, resetUiPrefs, hasUnsavedPrefs } = useStore(useShallow((s) => ({ uiPrefs: s.uiPrefs, setUiPref: s.setUiPref, commitUiPrefs: s.commitUiPrefs, revertUiPrefs: s.revertUiPrefs, resetUiPrefs: s.resetUiPrefs, hasUnsavedPrefs: s.hasUnsavedPrefs })));
  const modalRef = useRef<HTMLDivElement>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  function handleSave() {
    commitUiPrefs();
  }

  function handleClose() {
    if (hasUnsavedPrefs) {
      setShowExitConfirm(true);
    } else {
      onClose();
    }
  }

  function handleDiscardAndClose() {
    revertUiPrefs();
    setShowExitConfirm(false);
    onClose();
  }

  function handleKeepEditing() {
    setShowExitConfirm(false);
  }

  // Focus trap and escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { handleClose(); return; }
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
  }, [open, onClose, hasUnsavedPrefs]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Settings">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fade-in_0.2s_ease-out]"
        onClick={handleClose}
      />

      {/* Modal */}
      <div ref={modalRef} className="surface-panel-strong relative z-10 w-[90vw] max-h-[85vh] overflow-hidden rounded-[1.2rem] animate-[slide-up_0.3s_cubic-bezier(0.16,1,0.3,1)]" style={{ maxWidth: "clamp(600px, 55vw, 900px)" }}>
        <div className="flex items-center justify-between border-b border-[var(--panel-border)] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="brand-chip flex h-9 w-9 items-center justify-center rounded-[0.9rem]">
              <Settings2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Settings</h2>
              <p className="text-xs text-muted-foreground">Customize your AgentHub experience</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasUnsavedPrefs && (
              <Button size="sm" className="h-8 text-sm rounded-lg animate-fade-in" onClick={handleSave}>
                Save
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-lg"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Exit confirmation floating popup */}
        {showExitConfirm && (
          <div className="surface-panel-strong absolute right-4 top-16 z-50 w-72 space-y-3 rounded-[1rem] p-4 animate-fade-in">
            <p className="text-sm text-foreground font-medium">You have unsaved changes</p>
            <p className="text-xs text-muted-foreground">Your changes will be lost if you close without saving.</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-8 text-xs rounded-lg"
                onClick={handleDiscardAndClose}
              >
                Discard & Close
              </Button>
              <Button
                size="sm"
                className="flex-1 h-8 text-xs rounded-lg"
                onClick={handleKeepEditing}
              >
                Keep Editing
              </Button>
            </div>
          </div>
        )}

        <div className="flex h-[calc(85vh-80px)]">
          <div className="w-44 shrink-0 border-r border-[var(--panel-border)] p-3 space-y-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "relative flex w-full items-center gap-2.5 rounded-[0.9rem] px-3 py-2.5 text-sm font-medium transition-all duration-300",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {isActive && (
                    <div className="selection-card-active absolute inset-0 rounded-[0.9rem] animate-[luminance-pulse_3s_ease-in-out_infinite]" />
                  )}
                  <Icon className={cn("relative z-10 h-4 w-4 shrink-0", isActive && "text-[var(--theme-accent-text)]")} />
                  <span className="relative z-10 font-medium">{tab.label}</span>
                  {isActive && (
                    <ChevronRight className="relative z-10 ml-auto h-3 w-3 text-[var(--theme-accent-text)]" />
                  )}
                </button>
              );
            })}


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
        {desc && <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: typeof Layout; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">{title}</h3>
    </div>
  );
}

function LayoutTab({ prefs, setPref }: { prefs: UiPrefs; setPref: SetUiPref }) {
  const [fontPreview, setFontPreview] = useState(prefs.fontSize);
  const [zoomPreview, setZoomPreview] = useState(prefs.zoom ?? 100);

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
            className={selectionCardClass(prefs.density === opt.value, "flex items-center gap-3 text-left")}
          >
            <div className={selectionIndicatorClass(prefs.density === opt.value)}>
              {prefs.density === opt.value && <Check className="h-3 w-3 text-white" />}
            </div>
            <div>
              <div className="text-sm font-medium">{opt.label}</div>
              <div className="text-[0.6875rem] text-muted-foreground">{opt.desc}</div>
            </div>
          </button>
        ))}
      </div>

      <Separator />

      <SectionTitle icon={Type} title="Zoom" />
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">75%</span>
          <span className="text-lg font-bold text-foreground tabular-nums">{zoomPreview}%</span>
          <span className="text-sm text-muted-foreground">150%</span>
        </div>
        <Slider
          min={75}
          max={150}
          step={1}
          milestones={[75, 80, 90, 100, 110, 125, 150]}
          snapOnRelease
          unit="%"
          value={[zoomPreview]}
          onValueChange={(v) => setZoomPreview(Array.isArray(v) ? v[0] : v)}
          onValueCommitted={(v) => setPref("zoom", Array.isArray(v) ? v[0] : v)}
        />
      </div>

      <Separator />

      <SectionTitle icon={Type} title="Font Sizes" />
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">UI Elements</span>
            <span className="text-sm text-muted-foreground tabular-nums">{fontPreview}px</span>
          </div>
          <Slider
            min={12}
            max={24}
            step={1}
            milestones={[12, 14, 16, 18, 20, 24]}
            snapOnRelease
            unit="px"
            value={[fontPreview]}
            onValueChange={(v) => setFontPreview(Array.isArray(v) ? v[0] : v)}
            onValueCommitted={(v) => setPref("fontSize", Array.isArray(v) ? v[0] : v)}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Headings & Titles</span>
            <span className="text-sm text-muted-foreground tabular-nums">{prefs.titleFontSize || 18}px</span>
          </div>
          <Slider
            min={14}
            max={32}
            step={1}
            milestones={[14, 16, 18, 24, 32]}
            snapOnRelease
            unit="px"
            value={[prefs.titleFontSize || 18]}
            onValueChange={(v) => setPref("titleFontSize", Array.isArray(v) ? v[0] : v)}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Chat Content</span>
            <span className="text-sm text-muted-foreground tabular-nums">{prefs.chatFontSize || 14}px</span>
          </div>
          <Slider
            min={12}
            max={24}
            step={1}
            milestones={[12, 14, 16, 18, 20, 24]}
            snapOnRelease
            unit="px"
            value={[prefs.chatFontSize || 14]}
            onValueChange={(v) => setPref("chatFontSize", Array.isArray(v) ? v[0] : v)}
          />
        </div>
        <div
          className="surface-subtle rounded-[1rem] p-4 text-center transition-all duration-200"
          style={{ fontFamily: currentFontFamily, fontSize: `${fontPreview}px` }}
        >
          <span className="text-foreground/70">The quick brown fox jumps over the lazy dog</span>
        </div>
      </div>

      <Separator />

      <SectionTitle icon={Type} title="Font Family" />
      <div className="grid grid-cols-2 gap-2">
        {[
          { value: "geist", label: "Geist Sans", cat: "Default", style: { fontFamily: "var(--font-geist-sans)" } },
          { value: "inter", label: "Inter", cat: "Clean", style: { fontFamily: "'Inter', system-ui" } },
          { value: "nunito", label: "Nunito", cat: "Smooth", style: { fontFamily: "'Nunito', system-ui" } },
          { value: "lexend", label: "Lexend", cat: "Easy Read", style: { fontFamily: "'Lexend', system-ui" } },
          { value: "plus-jakarta", label: "Plus Jakarta", cat: "Modern", style: { fontFamily: "'Plus Jakarta Sans', system-ui" } },
          { value: "ibm-plex", label: "IBM Plex Sans", cat: "Technical", style: { fontFamily: "'IBM Plex Sans', system-ui" } },
          { value: "jetbrains-mono", label: "JetBrains Mono", cat: "Code", style: { fontFamily: "'JetBrains Mono', monospace" } },
          { value: "caveat", label: "Caveat", cat: "Handwriting", style: { fontFamily: "'Caveat', cursive" } },
          { value: "comic-neue", label: "Comic Neue", cat: "Casual", style: { fontFamily: "'Comic Neue', cursive" } },
        ].map((font) => (
          <button
            key={font.value}
            onClick={() => setPref("fontFamily", font.value)}
            className={selectionCardClass(prefs.fontFamily === font.value, "flex flex-col gap-1 text-left")}
          >
            <div className="flex items-center gap-2">
              <div className={selectionIndicatorClass(prefs.fontFamily === font.value)}>
                {prefs.fontFamily === font.value && <Check className="h-2.5 w-2.5 text-white" />}
              </div>
              <span className="text-xs font-medium">{font.label}</span>
              <span className="text-[0.5625rem] text-muted-foreground ml-auto">{font.cat}</span>
            </div>
            <span className="text-sm text-muted-foreground truncate" style={font.style}>
              The quick brown fox
            </span>
          </button>
        ))}
      </div>

      <Separator />

      <SectionTitle icon={Type} title="Title Font" />
      <p className="text-xs text-muted-foreground mb-2">Used for page headings, panel titles, and navigation</p>
      <FontPicker
        value={prefs.titleFont || prefs.fontFamily}
        onChange={(v) => setPref("titleFont", v)}
      />

      <Separator />

      <SectionTitle icon={Type} title="Chat Font" />
      <p className="text-xs text-muted-foreground mb-2">Used for message bubbles and chat text</p>
      <FontPicker
        value={prefs.chatFont || prefs.fontFamily}
        onChange={(v) => setPref("chatFont", v)}
      />
    </>
  );
}

const FONT_PICKER_FAMILIES: Record<string, string> = {
  geist: "var(--font-geist-sans), system-ui, sans-serif",
  inter: "'Inter', system-ui, sans-serif",
  nunito: "'Nunito', system-ui, sans-serif",
  lexend: "'Lexend', system-ui, sans-serif",
  "plus-jakarta": "'Plus Jakarta Sans', system-ui, sans-serif",
  "ibm-plex": "'IBM Plex Sans', system-ui, sans-serif",
  "jetbrains-mono": "'JetBrains Mono', monospace",
  caveat: "'Caveat', cursive",
  "comic-neue": "'Comic Neue', cursive",
};

function FontPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const fonts = [
    { value: "geist", label: "Geist Sans" },
    { value: "inter", label: "Inter" },
    { value: "nunito", label: "Nunito" },
    { value: "lexend", label: "Lexend" },
    { value: "plus-jakarta", label: "Plus Jakarta" },
    { value: "ibm-plex", label: "IBM Plex" },
    { value: "jetbrains-mono", label: "JetBrains Mono" },
    { value: "caveat", label: "Caveat" },
    { value: "comic-neue", label: "Comic Neue" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {fonts.map((f) => (
          <button
            key={f.value}
            onClick={() => onChange(f.value)}
            className={chipClass(value === f.value)}
            style={{ fontFamily: FONT_PICKER_FAMILIES[f.value] }}
          >
            {f.label}
          </button>
        ))}
      </div>
      {/* Live preview */}
      <div
        className="surface-subtle rounded-[1rem] p-4 transition-all duration-300"
        style={{ fontFamily: FONT_PICKER_FAMILIES[value] || FONT_PICKER_FAMILIES.geist }}
      >
        <p className="text-base text-foreground/80">The quick brown fox jumps over the lazy dog</p>
        <p className="text-sm text-muted-foreground/60 mt-1">abcdefghijklmnopqrstuvwxyz 0123456789</p>
      </div>
    </div>
  );
}

function ThemePreviewCard({
  theme,
  selected,
  onSelect,
}: {
  theme: ThemeDefinition;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={selectionCardClass(selected, "p-0 text-left h-full flex flex-col")}
    >
      <div className="p-3">
        <div
          className="overflow-hidden rounded-[0.95rem] border p-3"
          style={{ background: theme.preview.canvas, borderColor: theme.preview.border }}
        >
          <div className="mb-3 flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full" style={{ background: theme.preview.accent }} />
            <div className="h-2 w-2 rounded-full" style={{ background: theme.preview.accentAlt, opacity: 0.8 }} />
            <div className="h-2 w-2 rounded-full" style={{ background: theme.preview.border, opacity: 0.8 }} />
            <div className="ml-auto h-1.5 w-12 rounded-full" style={{ background: theme.preview.border, opacity: 0.65 }} />
          </div>
          <div className="grid grid-cols-[0.9fr_1.4fr] gap-2">
            <div
              className="flex min-h-24 flex-col gap-2 rounded-[0.8rem] border p-2"
              style={{ background: theme.preview.surfaceAlt, borderColor: theme.preview.border }}
            >
              <div className="h-2.5 w-14 rounded-full" style={{ background: theme.preview.accent, opacity: 0.9 }} />
              <div className="h-2 w-full rounded-full" style={{ background: theme.preview.border, opacity: 0.75 }} />
              <div className="h-2 w-5/6 rounded-full" style={{ background: theme.preview.border, opacity: 0.55 }} />
              <div className="mt-auto flex gap-1">
                <div className="h-5 w-5 rounded-md" style={{ background: theme.preview.surface, border: `1px solid ${theme.preview.border}` }} />
                <div className="h-5 w-5 rounded-md" style={{ background: theme.preview.surface, border: `1px solid ${theme.preview.border}` }} />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div
                className="flex items-center justify-between rounded-[0.8rem] border p-2"
                style={{ background: theme.preview.surface, borderColor: theme.preview.border }}
              >
                <div className="space-y-1">
                  <div className="h-2.5 w-16 rounded-full" style={{ background: theme.preview.accent, opacity: 0.88 }} />
                  <div className="h-2 w-12 rounded-full" style={{ background: theme.preview.border, opacity: 0.65 }} />
                </div>
                <div className="h-7 w-7 rounded-[0.75rem]" style={{ background: `linear-gradient(135deg, ${theme.preview.accent}, ${theme.preview.accentAlt})` }} />
              </div>
              <div
                className="rounded-[0.8rem] border p-2"
                style={{ background: theme.preview.surface, borderColor: theme.preview.border }}
              >
                <div className="mb-2 h-2.5 w-24 rounded-full" style={{ background: theme.preview.border, opacity: 0.8 }} />
                <div className="space-y-1.5">
                  <div className="h-2 rounded-full" style={{ background: theme.preview.border, opacity: 0.55 }} />
                  <div className="h-2 rounded-full" style={{ background: theme.preview.border, opacity: 0.4 }} />
                  <div className="h-2 w-5/6 rounded-full" style={{ background: theme.preview.accent, opacity: 0.72 }} />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-start gap-3">
          <div className={selectionIndicatorClass(selected)}>
            {selected && <Check className="h-3 w-3 text-white" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{theme.label}</span>
              <span className={chipClass(false, "px-2 py-0.5 text-[0.625rem]")}>
                {theme.accentLabel}
              </span>
            </div>
            <p className="mt-1 text-[0.6875rem] leading-5 text-muted-foreground">{theme.description}</p>
          </div>
          {theme.mode === "dark" ? <Moon className="h-4 w-4 text-muted-foreground" /> : <Sun className="h-4 w-4 text-muted-foreground" />}
        </div>
      </div>
    </button>
  );
}

function ThemeTab({ prefs, setPref }: { prefs: UiPrefs; setPref: SetUiPref }) {
  const systemTheme =
    typeof window !== "undefined"
      ? resolveThemePreference("system", window.matchMedia("(prefers-color-scheme: dark)").matches).resolvedTheme
      : LIGHT_THEMES[0];

  return (
    <>
      <SectionTitle icon={Palette} title="Theme Gallery" />
      <p className="text-sm text-muted-foreground">
        Each theme defines its own surfaces, borders, typography contrast, chart palette, glass treatment, and accent energy.
      </p>

      <div className="space-y-5">
        <div className="space-y-3">
          <SectionTitle icon={Moon} title="Dark Themes" />
          <div className="grid gap-3 items-stretch md:grid-cols-3">
            {DARK_THEMES.map((theme) => (
              <ThemePreviewCard
                key={theme.id}
                theme={theme}
                selected={prefs.theme === theme.id}
                onSelect={() => setPref("theme", theme.id)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <SectionTitle icon={Sun} title="Light Themes" />
          <div className="grid gap-3 items-stretch md:grid-cols-3">
            {LIGHT_THEMES.map((theme) => (
              <ThemePreviewCard
                key={theme.id}
                theme={theme}
                selected={prefs.theme === theme.id}
                onSelect={() => setPref("theme", theme.id)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <SectionTitle icon={Monitor} title="System Theme" />
          <button
            onClick={() => setPref("theme", "system")}
            className={selectionCardClass(prefs.theme === "system", "flex items-center gap-4")}
          >
            <div className="brand-chip flex h-12 w-12 items-center justify-center rounded-[0.95rem] text-white">
              <Monitor className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Follow system appearance</span>
                <span className={chipClass(false, "px-2 py-0.5 text-[0.625rem]")}>
                  {systemTheme.label}
                </span>
              </div>
              <p className="mt-1 text-[0.6875rem] leading-5 text-muted-foreground">
                AgentHub will switch between {resolveThemePreference("system", true).resolvedTheme.label} and {resolveThemePreference("system", false).resolvedTheme.label} based on your OS theme.
              </p>
            </div>
            <div className={selectionIndicatorClass(prefs.theme === "system")}>
              {prefs.theme === "system" && <Check className="h-3 w-3 text-white" />}
            </div>
          </button>
        </div>
      </div>

      <SectionTitle icon={Sparkles} title="Glass Glow" />

      <div className="space-y-4">
        {/* Panel glow */}
        <GlowColorPicker
          label="Panel Glow"
          value={prefs.glowColor}
          onChange={(v) => setPref("glowColor", v)}
        />

        {/* Agent bubble glow */}
        <GlowColorPicker
          label="Agent Bubble Glow"
          value={prefs.agentGlowColor}
          onChange={(v) => setPref("agentGlowColor", v)}
        />

        {/* Glow spread */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Glow Spread</span>
            <span className="text-[0.625rem] text-muted-foreground">{prefs.glowSpread}px</span>
          </div>
          <Slider
            min={0}
            max={60}
            step={1}
            milestones={[0, 10, 20, 30, 45, 60]}
            snapOnRelease
            unit="px"
            value={[prefs.glowSpread]}
            onValueChange={(v) => setPref("glowSpread", Array.isArray(v) ? v[0] : v)}
            onValueCommitted={(v) => setPref("glowSpread", Array.isArray(v) ? v[0] : v)}
          />
          <div className="flex justify-between text-[0.5625rem] text-muted-foreground mt-1">
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
            className={selectionCardClass(prefs.navStyle === opt.value, "flex flex-col items-center gap-2 text-left")}
          >
            <div className={cn(
              "flex h-10 w-full items-center justify-center rounded-lg border transition-all",
              prefs.navStyle === opt.value
                ? "border-[var(--theme-accent-border)] bg-[var(--theme-accent-softer)]"
                : "border-[var(--panel-border)]"
            )}>
              {opt.value === "pills" ? (
                <div className="flex gap-1">
                  <div className="h-2 w-6 rounded-full bg-[var(--theme-accent-line)]" />
                  <div className="h-2 w-4 rounded-full bg-foreground/[0.08]" />
                  <div className="h-2 w-5 rounded-full bg-foreground/[0.08]" />
                </div>
              ) : (
                <div className="flex flex-col gap-1 w-full px-2">
                  <div className="h-1.5 w-full rounded-sm bg-[var(--theme-accent-line)]" />
                  <div className="h-1.5 w-3/4 rounded-sm bg-foreground/[0.08]" />
                  <div className="h-1.5 w-5/6 rounded-sm bg-foreground/[0.08]" />
                </div>
              )}
            </div>
            <div>
              <div className="text-xs font-medium">{opt.label}</div>
              <div className="text-[0.625rem] text-muted-foreground">{opt.desc}</div>
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
  const resetUiPrefs = useStore((s) => s.resetUiPrefs);
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <>
      <SectionTitle icon={Globe} title="Language & Region" />
      <SettingRow label="Language" desc="Interface language">
        <span className="text-sm text-muted-foreground">English</span>
      </SettingRow>
      <SettingRow label="Date Format" desc="How dates and times appear">
        <select
          className="bg-foreground/[0.03] border border-foreground/[0.06] rounded-md px-2 py-1 text-sm outline-none min-w-[120px]"
          value={prefs.dateFormat || "system"}
          onChange={(e) => setPref("dateFormat", e.target.value as any)}
        >
          <option value="system">System Default</option>
          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
          <option value="DD/MM/YYYY">DD/MM/YYYY</option>
        </select>
      </SettingRow>

      <Separator />

      <SectionTitle icon={Bell} title="Notifications" />
      <SettingRow label="Enable notifications" desc="Show system notifications">
        <Switch checked={prefs.notificationsEnabled} onCheckedChange={(v) => setPref("notificationsEnabled", v)} />
      </SettingRow>
      <div className={cn("space-y-0 pl-4 border-l-2 border-foreground/[0.06] ml-4 transition-opacity", !prefs.notificationsEnabled && "opacity-50 pointer-events-none")}>
        <SettingRow label="Agent Errors" desc="Notify when agents fail">
          <Switch checked={prefs.notifyAgentErrors} onCheckedChange={(v) => setPref("notifyAgentErrors", v)} />
        </SettingRow>
        <SettingRow label="Task Updates" desc="Notify when scheduled tasks finish">
          <Switch checked={prefs.notifyTasks} onCheckedChange={(v) => setPref("notifyTasks", v)} />
        </SettingRow>
        <SettingRow label="Webhooks" desc="Notify on incoming webhooks">
          <Switch checked={prefs.notifyWebhooks} onCheckedChange={(v) => setPref("notifyWebhooks", v)} />
        </SettingRow>
      </div>
      <SettingRow label="Sound effects" desc="Play sounds for events">
        <Switch checked={prefs.soundEffects} onCheckedChange={(v) => setPref("soundEffects", v)} />
      </SettingRow>

      <Separator />

      <SectionTitle icon={Settings2} title="Data" />
      <div className="space-y-4 rounded-[1rem] border border-[var(--status-danger)]/20 p-4 relative overflow-hidden bg-[var(--status-danger)]/5">
        <div>
          <h4 className="text-sm font-semibold text-[var(--status-danger)]">Danger Zone</h4>
          <p className="text-xs text-muted-foreground mt-1">Resetting all settings will permanently clear your layout, theme, chat preferences, and effect settings. They will revert immediately to their factory defaults.</p>
        </div>
        {confirmReset ? (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmReset(false)}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={() => { resetUiPrefs(); setConfirmReset(false); }}>Yes, Reset Settings</Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setConfirmReset(true)} className="text-[var(--status-danger)] hover:bg-[var(--status-danger)]/10 hover:text-[var(--status-danger)]">
            Reset all settings
          </Button>
        )}
      </div>
    </>
  );
}

// Color picker for glow settings with presets + custom
const GLOW_PRESETS = [
  { label: "Blue", value: "rgba(59,130,246,0.3)", dot: "#3b82f6" },
  { label: "Violet", value: "rgba(139,92,246,0.3)", dot: "#8b5cf6" },
  { label: "Cyan", value: "rgba(6,182,212,0.3)", dot: "#06b6d4" },
  { label: "Emerald", value: "rgba(16,185,129,0.3)", dot: "#10b981" },
  { label: "Amber", value: "rgba(245,158,11,0.3)", dot: "#f59e0b" },
  { label: "Rose", value: "rgba(251,86,91,0.3)", dot: "#fb565b" },
  { label: "White", value: "rgba(242,242,242,0.2)", dot: "#f2f2f2" },
];

function GlowColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [customOpen, setCustomOpen] = useState(false);
  const isPreset = GLOW_PRESETS.some((p) => p.value === value);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="h-4 w-4 rounded-full border border-foreground/[0.15]" style={{ background: value }} />
      </div>
      <div className="grid grid-cols-4 gap-2">
        {GLOW_PRESETS.map((c) => (
          <button
            key={c.label}
            onClick={() => { onChange(c.value); setCustomOpen(false); }}
            className={cn(
              "flex items-center gap-2 rounded-xl border-2 p-2.5 transition-all duration-200",
              value === c.value
                ? "border-foreground/30 bg-foreground/[0.08]"
                : "border-foreground/[0.06] hover:border-foreground/[0.12] hover:bg-foreground/[0.03]",
            )}
          >
            <div className="h-3.5 w-3.5 rounded-full shrink-0" style={{ background: c.dot, boxShadow: `0 0 6px ${c.dot}60` }} />
            <span className="text-xs">{c.label}</span>
          </button>
        ))}
        <button
          onClick={() => setCustomOpen(!customOpen)}
          className={cn(
            "flex items-center gap-2 rounded-xl border-2 p-2.5 transition-all duration-200",
            !isPreset && !customOpen
              ? "border-foreground/30 bg-foreground/[0.08]"
              : customOpen
                ? "selection-card-active"
                : "border-foreground/[0.06] hover:border-foreground/[0.12] hover:bg-foreground/[0.03]",
          )}
        >
          <div className="h-3.5 w-3.5 rounded-full shrink-0" style={{
            background: "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)",
          }} />
          <span className="text-xs">Custom</span>
        </button>
      </div>
      {customOpen && (
        <div className="mt-3">
          <ColorPicker
            color={value}
            onChange={onChange}
            onClose={() => setCustomOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
