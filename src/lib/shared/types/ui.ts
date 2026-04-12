/**
 * UI preferences — theme, density, accent colour, onboarding progress.
 * These are per-install settings, not per-user settings.
 */

export interface ThemePreference {
  id: string;
  theme: string;
  accent_color: string;
  font_family: string;
  density: "compact" | "comfortable" | "spacious";
  border_radius: string;
  custom_css: string;
  created_at: string;
}

export interface OnboardingState {
  id: string;
  completed_steps: string;     // JSON string — string[]
  is_complete: boolean;
  current_step: number;
  created_at: string;
}
