"use client";

export type ThemeMode = "dark" | "light";

export interface ThemeDefinition {
  id: "midnight" | "emerald-terminal" | "obsidian" | "daylight" | "paper" | "arctic";
  label: string;
  mode: ThemeMode;
  description: string;
  accentLabel: string;
  preview: {
    canvas: string;
    surface: string;
    surfaceAlt: string;
    border: string;
    accent: string;
    accentAlt: string;
  };
}

export const THEMES: ThemeDefinition[] = [
  {
    id: "midnight",
    label: "Midnight",
    mode: "dark",
    description: "Abyss black, warm charcoal borders, blue-violet signal energy.",
    accentLabel: "Blue Violet",
    preview: {
      canvas: "#050507",
      surface: "#101012",
      surfaceAlt: "#16161b",
      border: "#3d3a39",
      accent: "#6c7dff",
      accentAlt: "#8b5cf6",
    },
  },
  {
    id: "emerald-terminal",
    label: "Emerald Terminal",
    mode: "dark",
    description: "VoltAgent-faithful terminal green on carbon-black surfaces.",
    accentLabel: "Signal Green",
    preview: {
      canvas: "#050507",
      surface: "#101010",
      surfaceAlt: "#121612",
      border: "#3d3a39",
      accent: "#00d992",
      accentAlt: "#2fd6a1",
    },
  },
  {
    id: "obsidian",
    label: "Obsidian",
    mode: "dark",
    description: "Monochrome command room with restrained, neutral emphasis.",
    accentLabel: "Graphite",
    preview: {
      canvas: "#000000",
      surface: "#090909",
      surfaceAlt: "#111111",
      border: "#27272a",
      accent: "#d6d3d1",
      accentAlt: "#8d8b87",
    },
  },
  {
    id: "daylight",
    label: "Daylight",
    mode: "light",
    description: "Warm off-white canvas with crisp blue-violet accents.",
    accentLabel: "Blue Violet",
    preview: {
      canvas: "#fafaf9",
      surface: "#ffffff",
      surfaceAlt: "#f5f5f4",
      border: "#d6d3d1",
      accent: "#5b6bff",
      accentAlt: "#7c56ff",
    },
  },
  {
    id: "paper",
    label: "Paper",
    mode: "light",
    description: "Cream notebook surfaces with amber-gold editorial warmth.",
    accentLabel: "Amber Gold",
    preview: {
      canvas: "#f5f0e8",
      surface: "#faf6ee",
      surfaceAlt: "#f0e7d8",
      border: "#d4c9b5",
      accent: "#b98336",
      accentAlt: "#d8a85e",
    },
  },
  {
    id: "arctic",
    label: "Arctic",
    mode: "light",
    description: "Crisp white instrumentation with cyan-blue precision.",
    accentLabel: "Ice Blue",
    preview: {
      canvas: "#ffffff",
      surface: "#f8fbff",
      surfaceAlt: "#edf5fe",
      border: "#cfdeee",
      accent: "#1f9df4",
      accentAlt: "#38bdf8",
    },
  },
];

export const SYSTEM_THEME_FALLBACK = {
  dark: "midnight",
  light: "daylight",
} as const;

export type ThemeId = ThemeDefinition["id"];
export type ThemePreference = ThemeId | "system";

export const THEME_CLASS_NAMES = THEMES.map((theme) => `theme-${theme.id}`);
export const DARK_THEMES = THEMES.filter((theme) => theme.mode === "dark");
export const LIGHT_THEMES = THEMES.filter((theme) => theme.mode === "light");

const THEME_LOOKUP = new Map(THEMES.map((theme) => [theme.id, theme]));

export function getTheme(themeId: ThemeId): ThemeDefinition {
  const theme = THEME_LOOKUP.get(themeId);
  if (!theme) {
    throw new Error(`Unknown theme: ${themeId}`);
  }
  return theme;
}

export function resolveThemePreference(theme: ThemePreference, prefersDark: boolean) {
  const resolvedId =
    theme === "system"
      ? SYSTEM_THEME_FALLBACK[prefersDark ? "dark" : "light"]
      : theme;
  const resolvedTheme = getTheme(resolvedId);

  return {
    id: resolvedTheme.id,
    mode: resolvedTheme.mode,
    className: `theme-${resolvedTheme.id}`,
    resolvedTheme,
  };
}
