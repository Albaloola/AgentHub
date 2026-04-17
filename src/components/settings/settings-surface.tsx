"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Bell,
  Bot,
  Check,
  ChevronRight,
  Globe,
  Info,
  Layout,
  Maximize,
  MessageSquare,
  Monitor,
  Moon,
  Palette,
  Settings2,
  Sidebar,
  Sparkles,
  Sun,
  Type,
  X,
} from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { ColorPicker } from "@/components/ui/color-picker";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  DARK_THEMES,
  LIGHT_THEMES,
  resolveThemePreference,
  type ThemeDefinition,
} from "@/lib/themes";

type UiPrefs = ReturnType<typeof useStore.getState>["uiPrefs"];
type SetUiPref = ReturnType<typeof useStore.getState>["setUiPref"];

type SettingsTabId = "workspace" | "appearance" | "chat" | "notifications" | "about";

const TABS: Array<{ id: SettingsTabId; label: string; icon: typeof Layout }> = [
  { id: "workspace", label: "Workspace", icon: Layout },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "about", label: "About", icon: Info },
];

const DENSITY_OPTIONS = [
  { value: "compact" as const, label: "Compact", desc: "Maximum information density" },
  { value: "comfortable" as const, label: "Comfortable", desc: "Balanced spacing" },
  { value: "spacious" as const, label: "Spacious", desc: "Relaxed, airy layout" },
];

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

const GLOW_PRESETS = [
  { label: "Blue", value: "rgba(59,130,246,0.3)", dot: "#3b82f6" },
  { label: "Violet", value: "rgba(139,92,246,0.3)", dot: "#8b5cf6" },
  { label: "Cyan", value: "rgba(6,182,212,0.3)", dot: "#06b6d4" },
  { label: "Emerald", value: "rgba(16,185,129,0.3)", dot: "#10b981" },
  { label: "Amber", value: "rgba(245,158,11,0.3)", dot: "#f59e0b" },
  { label: "Rose", value: "rgba(251,86,91,0.3)", dot: "#fb565b" },
  { label: "White", value: "rgba(242,242,242,0.2)", dot: "#f2f2f2" },
];

interface SettingsSurfaceProps {
  variant: "modal" | "page";
  onClose?: () => void;
}

export function SettingsSurface({ variant, onClose }: SettingsSurfaceProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabId>("workspace");
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const {
    uiPrefs,
    setUiPref,
    commitUiPrefs,
    revertUiPrefs,
    resetUiPrefs,
    hasUnsavedPrefs,
  } = useStore(
    useShallow((s) => ({
      uiPrefs: s.uiPrefs,
      setUiPref: s.setUiPref,
      commitUiPrefs: s.commitUiPrefs,
      revertUiPrefs: s.revertUiPrefs,
      resetUiPrefs: s.resetUiPrefs,
      hasUnsavedPrefs: s.hasUnsavedPrefs,
    })),
  );

  function handleSave() {
    commitUiPrefs();
    if (variant === "modal") {
      setShowExitConfirm(false);
    }
  }

  function handleDiscard() {
    revertUiPrefs();
    setShowExitConfirm(false);
  }

  const handleAttemptClose = useCallback(() => {
    if (variant !== "modal") return;
    if (hasUnsavedPrefs) {
      setShowExitConfirm(true);
      return;
    }
    onClose?.();
  }, [hasUnsavedPrefs, onClose, variant]);

  useEffect(() => {
    if (variant !== "modal") return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleAttemptClose();
        return;
      }
      if (event.key !== "Tab" || !modalRef.current) return;
      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const timer = window.setTimeout(() => {
      modalRef.current?.querySelector<HTMLElement>("button")?.focus();
    }, 80);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      window.clearTimeout(timer);
    };
  }, [handleAttemptClose, variant]);

  const surface = (
    <div
      ref={variant === "modal" ? modalRef : undefined}
      className={cn(
        "surface-panel-strong relative overflow-hidden",
        variant === "modal"
          ? "w-[95vw] max-h-[90vh] rounded-[var(--workspace-radius-lg)] animate-[slide-up_0.3s_cubic-bezier(0.16,1,0.3,1)]"
          : "mx-auto w-full max-w-7xl rounded-[var(--workspace-radius-xl)] border border-[var(--panel-border)]/85 shadow-[var(--panel-shadow-dramatic)]",
      )}
      style={variant === "modal" ? { maxWidth: "clamp(860px, 82vw, 1280px)" } : undefined}
    >
      <SettingsHeader
        variant={variant}
        hasUnsavedPrefs={hasUnsavedPrefs}
        onClose={handleAttemptClose}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />

      {showExitConfirm && variant === "modal" && (
        <div className="surface-panel-strong absolute right-4 top-16 z-50 w-80 space-y-3 rounded-[var(--workspace-radius-md)] p-4 animate-fade-in">
          <p className="text-sm font-medium text-foreground">You have unsaved changes</p>
          <p className="text-xs text-muted-foreground">
            Keep editing, or discard the live preview changes before closing.
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={handleDiscard}>
              Discard
            </Button>
            <Button size="sm" className="flex-1" onClick={() => setShowExitConfirm(false)}>
              Keep editing
            </Button>
          </div>
        </div>
      )}

      <div className={cn("flex min-h-0", variant === "modal" ? "h-[calc(90vh-86px)]" : "min-h-[calc(100vh-16rem)]")}>
        <aside className="w-56 shrink-0 border-r border-[var(--panel-border)] p-4">
          <div className="space-y-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "relative flex w-full items-center gap-2.5 rounded-[var(--workspace-radius-sm)] px-3 py-2.5 text-sm font-medium transition-all duration-300",
                    isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {isActive && (
                    <div className="selection-card-active absolute inset-0 rounded-[var(--workspace-radius-sm)] animate-[luminance-pulse_3s_ease-in-out_infinite]" />
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

          <div className="mt-6 rounded-[var(--workspace-radius-md)] border border-[var(--panel-border)] bg-[var(--surface-subtle)] p-3">
            <p className="text-[var(--text-caption)] font-semibold uppercase tracking-[var(--tracking-label)] text-muted-foreground">
              Live Preview
            </p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Theme, typography, glow, and layout changes apply immediately and save only when you commit them.
            </p>
          </div>
        </aside>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-6 p-6">
            {activeTab === "workspace" && <WorkspaceTab prefs={uiPrefs} setPref={setUiPref} />}
            {activeTab === "appearance" && <AppearanceTab prefs={uiPrefs} setPref={setUiPref} />}
            {activeTab === "chat" && <ChatTab prefs={uiPrefs} setPref={setUiPref} />}
            {activeTab === "notifications" && (
              <NotificationsTab
                prefs={uiPrefs}
                setPref={setUiPref}
                resetUiPrefs={resetUiPrefs}
              />
            )}
            {activeTab === "about" && <AboutTab />}
          </div>
        </ScrollArea>
      </div>
    </div>
  );

  if (variant === "page") {
    return surface;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Settings">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fade-in_0.2s_ease-out]"
        onClick={handleAttemptClose}
      />
      <div className="relative z-10">{surface}</div>
    </div>
  );
}

function SettingsHeader({
  variant,
  hasUnsavedPrefs,
  onClose,
  onSave,
  onDiscard,
}: {
  variant: "modal" | "page";
  hasUnsavedPrefs: boolean;
  onClose: () => void;
  onSave: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-[var(--panel-border)] px-6 py-5">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <div className="brand-chip flex h-11 w-11 items-center justify-center rounded-[var(--workspace-radius-md)]">
            <Settings2 className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className={cn("title-font settings-display-title truncate font-semibold tracking-tight", variant === "page" && "max-w-[28rem]")}>
              {variant === "page" ? "Settings" : "Quick Settings"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {variant === "page"
                ? "Theme, motion, reading, and notification preferences for this workspace."
                : "Adjust visuals, reading, and alerts without leaving your current view."}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {hasUnsavedPrefs ? (
            <>
              <span className="rounded-full border border-[var(--theme-accent-border)] bg-[var(--theme-accent-softer)] px-3 py-1 text-[var(--text-caption)] font-medium text-[var(--theme-accent-text)]">
                Unsaved preview changes
              </span>
              <Button size="sm" className="h-8 rounded-lg px-3 text-xs" onClick={onSave}>
                Save changes
              </Button>
              <Button size="sm" variant="outline" className="h-8 rounded-lg px-3 text-xs" onClick={onDiscard}>
                Discard
              </Button>
            </>
          ) : (
            <span className="rounded-full border border-[var(--panel-border)] bg-[var(--surface-subtle)] px-3 py-1 text-[var(--text-caption)] font-medium text-muted-foreground">
              All changes saved locally
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {variant === "modal" ? (
          <Link
            href="/settings"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9 rounded-xl px-3")}
          >
            Open full page
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <Link
            href="/admin"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "h-9 rounded-xl px-3")}
          >
            Platform controls
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        )}

        {variant === "modal" && (
          <Button variant="ghost" size="icon-sm" className="rounded-lg" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function SettingRow({
  label,
  desc,
  children,
}: {
  label: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{label}</div>
        {desc && <div className="mt-0.5 text-xs text-muted-foreground">{desc}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  eyebrow,
}: {
  icon: typeof Layout;
  title: string;
  eyebrow?: string;
}) {
  return (
    <div className="space-y-1">
      {eyebrow ? (
        <p className="text-[var(--text-caption)] font-semibold uppercase tracking-[var(--tracking-label)] text-muted-foreground">
          {eyebrow}
        </p>
      ) : null}
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
      </div>
    </div>
  );
}

function WorkspaceTab({ prefs, setPref }: { prefs: UiPrefs; setPref: SetUiPref }) {
  return (
    <>
      <SectionTitle icon={Layout} title="Workspace Layout" eyebrow="Structure" />
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {DENSITY_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => setPref("density", option.value)}
            className={selectionCardClass(
              prefs.density === option.value,
              "group flex h-36 flex-col items-center overflow-hidden p-0 text-left",
            )}
          >
            <div className="relative flex-1 w-full overflow-hidden bg-foreground/[0.01]">
              <div className="absolute inset-0 flex items-center justify-center p-4 transition-transform duration-300 group-hover:scale-[1.08]">
                <div className="w-full max-w-[10rem] space-y-2">
                  <div
                    className={cn(
                      "rounded-sm bg-[var(--theme-accent-line)]",
                      option.value === "compact" ? "h-1 w-full" : option.value === "comfortable" ? "h-1.5 w-full" : "h-2.5 w-full",
                    )}
                  />
                  <div
                    className={cn(
                      "rounded-sm bg-foreground/[0.08]",
                      option.value === "compact" ? "h-1 w-[88%]" : option.value === "comfortable" ? "h-1.5 w-[88%]" : "h-2.5 w-[88%]",
                    )}
                  />
                  <div
                    className={cn(
                      "rounded-sm bg-foreground/[0.08]",
                      option.value === "compact" ? "h-1 w-[72%]" : option.value === "comfortable" ? "h-1.5 w-[72%]" : "h-2.5 w-[72%]",
                    )}
                  />
                </div>
              </div>
            </div>
            <div className="flex w-full items-center justify-between border-t border-[var(--panel-border)] bg-[var(--glass-bg)] px-3 py-2">
              <div>
                <div className="text-xs font-semibold">{option.label}</div>
                <div className="text-[var(--text-label)] text-muted-foreground">{option.desc}</div>
              </div>
              <div className={selectionIndicatorClass(prefs.density === option.value)}>
                {prefs.density === option.value ? <Check className="h-3 w-3 text-white" /> : null}
              </div>
            </div>
          </button>
        ))}
      </div>

      <Separator />

      <SectionTitle icon={Sidebar} title="Navigation Feel" eyebrow="Primary controls" />
      <div className="grid gap-3 md:grid-cols-2">
        {[
          { value: "pills" as const, label: "Floating pills", desc: "Rounded, high-contrast nav affordances." },
          { value: "list" as const, label: "Classic list", desc: "Flatter navigation with quieter outlines." },
        ].map((option) => (
          <button
            key={option.value}
            onClick={() => setPref("navStyle", option.value)}
            className={selectionCardClass(prefs.navStyle === option.value, "flex flex-col gap-3 text-left")}
          >
            <div
              className={cn(
                "flex h-12 w-full items-center justify-center rounded-xl border",
                prefs.navStyle === option.value
                  ? "border-[var(--theme-accent-border)] bg-[var(--theme-accent-softer)]"
                  : "border-[var(--panel-border)]",
              )}
            >
              {option.value === "pills" ? (
                <div className="flex gap-1.5">
                  <div className="h-2 w-7 rounded-full bg-[var(--theme-accent-line)]" />
                  <div className="h-2 w-5 rounded-full bg-foreground/[0.08]" />
                  <div className="h-2 w-6 rounded-full bg-foreground/[0.08]" />
                </div>
              ) : (
                <div className="flex w-full max-w-[11rem] flex-col gap-1.5 px-4">
                  <div className="h-1.5 w-full rounded-sm bg-[var(--theme-accent-line)]" />
                  <div className="h-1.5 w-4/5 rounded-sm bg-foreground/[0.08]" />
                  <div className="h-1.5 w-3/5 rounded-sm bg-foreground/[0.08]" />
                </div>
              )}
            </div>
            <div>
              <div className="text-sm font-medium">{option.label}</div>
              <div className="text-xs text-muted-foreground">{option.desc}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-4">
        <SettingRow label="Start collapsed" desc="Open the sidebar in icon-first mode">
          <Switch checked={prefs.sidebarCollapsed} onCheckedChange={(value) => setPref("sidebarCollapsed", value)} />
        </SettingRow>
      </div>

      <Separator />

      <SectionTitle icon={Maximize} title="Interface Scale" eyebrow="Reading comfort" />
      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="space-y-3 rounded-[var(--workspace-radius-md)] border border-[var(--panel-border)] bg-[var(--surface-subtle)] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">UI scale</p>
              <p className="text-xs text-muted-foreground">
                Adjusts the fluid interface scale without magnifying the whole document or clipping the viewport.
              </p>
            </div>
            <span className="rounded-full border border-[var(--panel-border)] px-3 py-1 text-xs font-medium tabular-nums">
              {prefs.zoom}%
            </span>
          </div>
          <Slider
            min={80}
            max={135}
            step={5}
            milestones={[80, 90, 100, 115, 135]}
            snapOnRelease
            unit="%"
            value={[prefs.zoom]}
            onValueChange={(value) => setPref("zoom", value[0] ?? 100)}
          />
        </div>

        <div className="rounded-[var(--workspace-radius-md)] border border-[var(--panel-border)] bg-[var(--surface-subtle)] p-4">
          <p className="text-[var(--text-caption)] font-semibold uppercase tracking-[var(--tracking-label)] text-muted-foreground">
            Preview
          </p>
          <div className="mt-3 space-y-3 rounded-[var(--workspace-radius-md)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-4">
            <div className="flex items-center justify-between">
              <div className="title-font text-sm font-semibold">Control room</div>
              <div className="rounded-full bg-[var(--theme-accent-softer)] px-2 py-1 text-[var(--text-label)] text-[var(--theme-accent-text)]">
                Live
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-2 w-full rounded-full bg-foreground/[0.08]" />
              <div className="h-2 w-4/5 rounded-full bg-foreground/[0.08]" />
              <div className="h-2 w-3/5 rounded-full bg-[var(--theme-accent-line)]" />
            </div>
          </div>
        </div>
      </div>

      <Separator />

      <SectionTitle icon={Type} title="Interface Typography" eyebrow="Typography" />
      <TypographySection
        title="Interface Font"
        desc="Used for navigation, menus, controls, and utility copy."
        prefKey="fontFamily"
        prefSizeKey="fontSize"
        prefs={prefs}
        setPref={setPref}
        minSize={12}
        maxSize={22}
        defaultSize={16}
        previewText="Buttons, menus, and panel copy stay easy to scan."
      />
    </>
  );
}

function AppearanceTab({ prefs, setPref }: { prefs: UiPrefs; setPref: SetUiPref }) {
  const systemTheme =
    typeof window !== "undefined"
      ? resolveThemePreference("system", window.matchMedia("(prefers-color-scheme: dark)").matches).resolvedTheme
      : LIGHT_THEMES[0];

  return (
    <>
      <SectionTitle icon={Palette} title="Theme Gallery" eyebrow="Appearance" />
      <p className="max-w-3xl text-sm text-muted-foreground">
        Each theme carries its own contrast model, glass treatment, chart palette, and background atmosphere.
      </p>

      <div className="space-y-5">
        <div className="space-y-4">
          <SectionTitle icon={Moon} title="Dark Themes" />
          <div className="grid items-stretch gap-4 lg:grid-cols-4">
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

        <div className="space-y-4">
          <SectionTitle icon={Sun} title="Light Themes" />
          <div className="grid items-stretch gap-4 lg:grid-cols-4">
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
            <div className="brand-chip flex h-12 w-12 items-center justify-center rounded-[var(--workspace-radius-sm)] text-white">
              <Monitor className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Follow system appearance</span>
                <span className={chipClass(false, "px-2 py-0.5 text-[var(--text-label)]")}>
                  {systemTheme.label}
                </span>
              </div>
              <p className="mt-1 text-[var(--text-caption)] leading-5 text-muted-foreground">
                AgentHub will swap between {resolveThemePreference("system", true).resolvedTheme.label} and {resolveThemePreference("system", false).resolvedTheme.label} with your OS theme.
              </p>
            </div>
            <div className={selectionIndicatorClass(prefs.theme === "system")}>
              {prefs.theme === "system" ? <Check className="h-3 w-3 text-white" /> : null}
            </div>
          </button>
        </div>
      </div>

      <Separator />

      <SectionTitle icon={Type} title="Heading Typography" eyebrow="Titles" />
      <TypographySection
        title="Heading Font"
        desc="Used for page titles, section headers, and the contextual topbar title."
        prefKey="titleFont"
        prefSizeKey="titleFontSize"
        prefs={prefs}
        setPref={setPref}
        fallbackKey="fontFamily"
        minSize={15}
        maxSize={32}
        defaultSize={18}
        previewText="Mission Control"
        isTitle
      />

      <Separator />

      <SectionTitle icon={Sparkles} title="Atmosphere & Motion" eyebrow="Effects" />
      <div className="space-y-4">
        <SettingRow label="Ambient background" desc="Blurred color fields behind the workspace canvas.">
          <Switch checked={prefs.ambientBackground} onCheckedChange={(value) => setPref("ambientBackground", value)} />
        </SettingRow>
        <SettingRow label="Starfield layers" desc="Render star layers on supported dark themes.">
          <Switch checked={prefs.showStarfield} onCheckedChange={(value) => setPref("showStarfield", value)} />
        </SettingRow>
        <SettingRow label="Meteor streaks" desc="Allow meteor passes when starfield layers are active.">
          <Switch checked={prefs.showMeteors} onCheckedChange={(value) => setPref("showMeteors", value)} />
        </SettingRow>
        <SettingRow label="Ambient glow" desc="Keep neon hover glows, pulse accents, and atmospheric bloom.">
          <Switch checked={prefs.showAmbientGlow} onCheckedChange={(value) => setPref("showAmbientGlow", value)} />
        </SettingRow>
        <SettingRow label="Animations" desc="Enable layout transitions and animated backgrounds.">
          <Switch checked={prefs.animationsEnabled} onCheckedChange={(value) => setPref("animationsEnabled", value)} />
        </SettingRow>
      </div>

      <Separator />

      <SectionTitle icon={Sparkles} title="Glass Glow" eyebrow="Lighting" />
      <div className="space-y-4">
        <GlowColorPicker
          label="Panel glow"
          value={prefs.glowColor}
          onChange={(value) => setPref("glowColor", value)}
        />
        <GlowColorPicker
          label="Agent bubble glow"
          value={prefs.agentGlowColor}
          onChange={(value) => setPref("agentGlowColor", value)}
        />

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Glow spread</span>
            <span className="text-[var(--text-label)] text-muted-foreground">{prefs.glowSpread}px</span>
          </div>
          <Slider
            min={0}
            max={60}
            step={1}
            milestones={[0, 10, 20, 30, 45, 60]}
            snapOnRelease
            unit="px"
            value={[prefs.glowSpread]}
            onValueChange={(value) => setPref("glowSpread", value[0] ?? 20)}
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Glow intensity</span>
            <span className="text-[var(--text-label)] text-muted-foreground">{Math.round((prefs.glowIntensity ?? 0.5) * 100)}%</span>
          </div>
          <Slider
            min={0}
            max={1}
            step={0.05}
            value={[prefs.glowIntensity ?? 0.5]}
            onValueChange={(value) => setPref("glowIntensity", value[0] ?? 0.5)}
          />
        </div>
      </div>
    </>
  );
}

function ChatTab({ prefs, setPref }: { prefs: UiPrefs; setPref: SetUiPref }) {
  return (
    <>
      <SectionTitle icon={Type} title="Chat Typography" eyebrow="Reading" />
      <TypographySection
        title="Chat content font"
        desc="Used in message bubbles, markdown blocks, and the chat composer."
        prefKey="chatFont"
        prefSizeKey="chatFontSize"
        prefs={prefs}
        setPref={setPref}
        fallbackKey="fontFamily"
        minSize={12}
        maxSize={24}
        defaultSize={14}
        previewText="Structured answers, markdown, and code snippets stay readable."
      />

      <Separator />

      <SectionTitle icon={MessageSquare} title="Conversation View" eyebrow="Message UI" />
      <div className="space-y-4">
        <SettingRow label="Render markdown" desc="Format lists, tables, and code fences inside assistant messages.">
          <Switch checked={prefs.markdownEnabled} onCheckedChange={(value) => setPref("markdownEnabled", value)} />
        </SettingRow>
        <SettingRow label="Show timestamps" desc="Display relative time alongside each message group.">
          <Switch checked={prefs.showTimestamps} onCheckedChange={(value) => setPref("showTimestamps", value)} />
        </SettingRow>
        <SettingRow label="Show avatars" desc="Display user and agent avatars beside messages.">
          <Switch checked={prefs.showAvatars} onCheckedChange={(value) => setPref("showAvatars", value)} />
        </SettingRow>
        <SettingRow label="Auto-scroll" desc="Follow the latest message while a conversation is growing.">
          <Switch checked={prefs.autoScroll} onCheckedChange={(value) => setPref("autoScroll", value)} />
        </SettingRow>
      </div>
    </>
  );
}

function NotificationsTab({
  prefs,
  setPref,
  resetUiPrefs,
}: {
  prefs: UiPrefs;
  setPref: SetUiPref;
  resetUiPrefs: () => void;
}) {
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <>
      <SectionTitle icon={Bell} title="Notification Filters" eyebrow="Alerts" />
      <SettingRow label="Enable notifications" desc="Show in-app banners and notification center items.">
        <Switch checked={prefs.notificationsEnabled} onCheckedChange={(value) => setPref("notificationsEnabled", value)} />
      </SettingRow>

      <div
        className={cn(
          "ml-4 space-y-0 border-l-2 border-foreground/[0.06] pl-4 transition-opacity",
          !prefs.notificationsEnabled && "pointer-events-none opacity-50",
        )}
      >
        <SettingRow label="Agent errors" desc="Notify when an agent fails or disconnects.">
          <Switch checked={prefs.notifyAgentErrors} onCheckedChange={(value) => setPref("notifyAgentErrors", value)} />
        </SettingRow>
        <SettingRow label="Task updates" desc="Notify when scheduled work completes or changes state.">
          <Switch checked={prefs.notifyTasks} onCheckedChange={(value) => setPref("notifyTasks", value)} />
        </SettingRow>
        <SettingRow label="Webhooks" desc="Notify when external triggers arrive.">
          <Switch checked={prefs.notifyWebhooks} onCheckedChange={(value) => setPref("notifyWebhooks", value)} />
        </SettingRow>
      </div>

      <Separator />

      <SectionTitle icon={Globe} title="Region & Feedback" eyebrow="System" />
      <SettingRow label="Date format" desc="Controls how the contextual topbar formats date + time.">
        <select
          className="min-w-[13rem] rounded-md border border-foreground/[0.06] bg-foreground/[0.03] px-2 py-1 text-sm outline-none"
          value={prefs.dateFormat || "system"}
          onChange={(event) =>
            setPref("dateFormat", event.target.value as UiPrefs["dateFormat"])
          }
        >
          <option value="system">System default</option>
          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
          <option value="DD/MM/YYYY">DD/MM/YYYY</option>
        </select>
      </SettingRow>
      <SettingRow label="Sound effects" desc="Play a short tone for new toasts and in-app feedback.">
        <Switch checked={prefs.soundEffects} onCheckedChange={(value) => setPref("soundEffects", value)} />
      </SettingRow>

      <Separator />

      <SectionTitle icon={Settings2} title="Reset Preferences" eyebrow="Data" />
      <div className="relative overflow-hidden rounded-[var(--workspace-radius-md)] border border-[var(--status-danger)]/20 bg-[var(--status-danger)]/5 p-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--status-danger)]">Danger zone</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Reset local layout, theme, typography, notification, and effect preferences back to the factory defaults.
          </p>
        </div>
        <div className="mt-4 flex gap-2">
          {confirmReset ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setConfirmReset(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  resetUiPrefs();
                  setConfirmReset(false);
                }}
              >
                Reset settings
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmReset(true)}
              className="text-[var(--status-danger)] hover:bg-[var(--status-danger)]/10 hover:text-[var(--status-danger)]"
            >
              Reset all settings
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

function TypographySection({
  title,
  desc,
  prefKey,
  prefSizeKey,
  prefs,
  setPref,
  fallbackKey,
  minSize,
  maxSize,
  defaultSize,
  previewText,
  isTitle = false,
}: {
  title: string;
  desc: string;
  prefKey: keyof UiPrefs;
  prefSizeKey: keyof UiPrefs;
  prefs: UiPrefs;
  setPref: SetUiPref;
  fallbackKey?: keyof UiPrefs;
  minSize: number;
  maxSize: number;
  defaultSize: number;
  previewText: string;
  isTitle?: boolean;
}) {
  const fontValue = String(prefs[prefKey] || (fallbackKey ? prefs[fallbackKey] : "geist"));
  const sizeValue = Number(prefs[prefSizeKey] || defaultSize);
  const fontFamily = FONT_PICKER_FAMILIES[fontValue] || FONT_PICKER_FAMILIES.geist;

  return (
    <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium">{title}</h3>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
        <FontPicker value={fontValue} onChange={(value) => setPref(prefKey, value as UiPrefs[typeof prefKey])} />
        <div className="rounded-[var(--workspace-radius-md)] border border-[var(--panel-border)] bg-[var(--surface-subtle)] p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[var(--text-caption)] text-muted-foreground">Size</span>
            <span className="text-[var(--text-caption)] font-mono tabular-nums text-muted-foreground">{sizeValue}px</span>
          </div>
          <Slider
            min={minSize}
            max={maxSize}
            step={1}
            milestones={[minSize, Math.floor((minSize + maxSize) / 2), maxSize]}
            snapOnRelease
            unit="px"
            value={[sizeValue]}
            onValueChange={(value) => setPref(prefSizeKey, value[0] as UiPrefs[typeof prefSizeKey])}
          />
        </div>
      </div>

      <div className="rounded-[var(--workspace-radius-md)] border border-[var(--panel-border)] bg-[var(--surface-subtle)] p-4">
        <p className="text-[var(--text-caption)] font-semibold uppercase tracking-[var(--tracking-label)] text-muted-foreground">
          Preview
        </p>
        <div
          className={cn(
            "mt-3 flex min-h-[10rem] items-center justify-center rounded-[var(--workspace-radius-md)] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-5 text-center",
            isTitle && "font-semibold tracking-tight",
          )}
          style={{ fontFamily, fontSize: `${sizeValue}px` }}
        >
          {previewText}
        </div>
      </div>
    </div>
  );
}

function FontPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
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
        {fonts.map((font) => (
          <button
            key={font.value}
            onClick={() => onChange(font.value)}
            className={chipClass(value === font.value)}
            style={{ fontFamily: FONT_PICKER_FAMILIES[font.value] }}
          >
            {font.label}
          </button>
        ))}
      </div>

      <div
        className="surface-subtle rounded-[var(--workspace-radius-md)] p-4 transition-all duration-300"
        style={{ fontFamily: FONT_PICKER_FAMILIES[value] || FONT_PICKER_FAMILIES.geist }}
      >
        <p className="text-base text-foreground/80">The quick brown fox jumps over the lazy dog</p>
        <p className="mt-1 text-sm text-muted-foreground/60">
          abcdefghijklmnopqrstuvwxyz 0123456789
        </p>
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
      className={selectionCardClass(selected, "flex h-full flex-col p-0 text-left")}
    >
      <div className="p-3">
        <div
          className="overflow-hidden rounded-[var(--workspace-radius-sm)] border p-3"
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
              className="flex min-h-24 flex-col gap-2 rounded-[var(--workspace-radius-sm)] border p-2"
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
                className="flex items-center justify-between rounded-[var(--workspace-radius-sm)] border p-2"
                style={{ background: theme.preview.surface, borderColor: theme.preview.border }}
              >
                <div className="space-y-1">
                  <div className="h-2.5 w-16 rounded-full" style={{ background: theme.preview.accent, opacity: 0.88 }} />
                  <div className="h-2 w-12 rounded-full" style={{ background: theme.preview.border, opacity: 0.65 }} />
                </div>
                <div
                  className="h-7 w-7 rounded-lg"
                  style={{ background: `linear-gradient(135deg, ${theme.preview.accent}, ${theme.preview.accentAlt})` }}
                />
              </div>
              <div
                className="rounded-[var(--workspace-radius-sm)] border p-2"
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
            {selected ? <Check className="h-3 w-3 text-white" /> : null}
          </div>
          <div className="min-w-0 flex-1 text-left">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium">{theme.label}</span>
              <span className={chipClass(false, "shrink-0 px-2 py-0.5 text-[var(--text-label)]")}>
                {theme.accentLabel}
              </span>
            </div>
            <p className="mt-1 line-clamp-3 text-[var(--text-caption)] leading-snug text-muted-foreground">
              {theme.description}
            </p>
          </div>
          <div className="ml-1 mt-0.5 shrink-0">
            {theme.mode === "dark" ? (
              <Moon className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Sun className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function GlowColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [customOpen, setCustomOpen] = useState(false);
  const isPreset = GLOW_PRESETS.some((preset) => preset.value === value);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="h-4 w-4 rounded-full border border-foreground/[0.15]" style={{ background: value }} />
      </div>
      <div className="grid grid-cols-4 gap-2">
        {GLOW_PRESETS.map((preset) => (
          <button
            key={preset.label}
            onClick={() => {
              onChange(preset.value);
              setCustomOpen(false);
            }}
            className={cn(
              "flex items-center gap-2 rounded-xl border-2 p-2.5 transition-all duration-200",
              value === preset.value
                ? "border-foreground/30 bg-foreground/[0.08]"
                : "border-foreground/[0.06] hover:border-foreground/[0.14] hover:bg-foreground/[0.03]",
            )}
          >
            <div
              className="h-3.5 w-3.5 shrink-0 rounded-full"
              style={{ background: preset.dot, boxShadow: `0 0 6px ${preset.dot}60` }}
            />
            <span className="text-xs">{preset.label}</span>
          </button>
        ))}
        <button
          onClick={() => setCustomOpen((open) => !open)}
          className={cn(
            "flex items-center gap-2 rounded-xl border-2 p-2.5 transition-all duration-200",
            !isPreset && !customOpen
              ? "border-foreground/30 bg-foreground/[0.08]"
              : customOpen
                ? "selection-card-active"
                : "border-foreground/[0.06] hover:border-foreground/[0.14] hover:bg-foreground/[0.03]",
          )}
        >
          <div
            className="h-3.5 w-3.5 shrink-0 rounded-full"
            style={{ background: "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)" }}
          />
          <span className="text-xs">Custom</span>
        </button>
      </div>
      {customOpen ? (
        <div className="mt-3">
          <ColorPicker color={value} onChange={onChange} onClose={() => setCustomOpen(false)} />
        </div>
      ) : null}
    </div>
  );
}

function AboutTab() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-500">
      <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-[var(--workspace-radius-lg)] bg-gradient-to-br from-[var(--theme-accent)] to-[var(--theme-accent-alt)] text-white shadow-[var(--theme-accent-shadow)]">
        <div className="pointer-events-none absolute inset-0 rounded-[var(--workspace-radius-lg)] bg-[linear-gradient(to_bottom,white_0%,transparent_100%)] opacity-20" />
        <Bot className="relative z-10 h-10 w-10" />
      </div>
      <h2 className="title-font settings-display-title mb-3 font-bold tracking-tight">AgentHub</h2>
      <p className="mx-auto mb-6 max-w-md text-sm leading-relaxed text-foreground/80">
        Built with care by Omer Elbushra. This surface now focuses on the local runtime, theme, reading,
        and feedback preferences that shape how AgentHub feels day to day.
      </p>
      <div className="rounded-xl border border-[var(--panel-border-strong)] bg-foreground/[0.04] px-4 py-2">
        <p className="text-[var(--text-caption)] font-mono uppercase tracking-widest text-muted-foreground">
          Apache 2.0 License
        </p>
      </div>
    </div>
  );
}

function selectionCardClass(active: boolean, className?: string) {
  return cn(
    "selection-card relative overflow-hidden rounded-[var(--workspace-radius-md)] border p-3 transition-all duration-200",
    active && "selection-card-active",
    className,
  );
}

function selectionIndicatorClass(active: boolean) {
  return cn(
    "flex h-5 w-5 items-center justify-center rounded-full border text-white transition-all",
    active
      ? "border-[var(--theme-accent)] bg-[var(--theme-accent)] shadow-[var(--theme-accent-shadow)]"
      : "border-[var(--panel-border-strong)] bg-transparent",
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
