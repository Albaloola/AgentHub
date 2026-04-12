/**
 * Install-level preferences — theme, settings key/value store, onboarding,
 * and single-file uploads (for message attachments, not KB docs).
 */

"use client";

import { fetchJSON } from "./client";
import type { ThemePreference, OnboardingState } from "@/lib/shared/types";

// --- Theme preferences ----------------------------------------------------

export function getTheme(): Promise<ThemePreference> {
  return fetchJSON("/api/theme");
}

export function updateTheme(body: Partial<ThemePreference>): Promise<unknown> {
  return fetchJSON("/api/theme", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// --- Settings (string/string key-value store) -----------------------------

export function getSettings(): Promise<Record<string, string>> {
  return fetchJSON("/api/settings");
}

export function updateSettings(settings: Record<string, string>): Promise<Record<string, string>> {
  return fetchJSON("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
}

// --- Onboarding state -----------------------------------------------------

export function getOnboarding(): Promise<OnboardingState> {
  return fetchJSON("/api/onboarding");
}

export function completeOnboardingStep(step: number): Promise<unknown> {
  return fetchJSON("/api/onboarding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ step }),
  });
}

// --- File upload (message attachments) ------------------------------------

export function uploadFile(
  file: File,
): Promise<{ id: string; file_name: string; file_type: string; file_size: number }> {
  const formData = new FormData();
  formData.append("file", file);
  return fetchJSON("/api/upload", { method: "POST", body: formData });
}
