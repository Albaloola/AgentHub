/**
 * Third-party integrations (GitHub, Slack, Jira, etc.) — stored config rows
 * that external webhooks/pollers use at runtime. This file only exposes the
 * CRUD the UI needs.
 */

"use client";

import { fetchJSON } from "./client";
import type { Integration } from "@/lib/shared/types";

export function getIntegrations(): Promise<Integration[]> {
  return fetchJSON("/api/integrations");
}

export function createIntegration(body: {
  type: string;
  name: string;
  config?: Record<string, unknown>;
  agent_id?: string;
}): Promise<{ id: string }> {
  return fetchJSON("/api/integrations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function updateIntegration(
  id: string,
  body: Partial<{ name: string; config: Record<string, unknown>; is_active: boolean }>,
): Promise<unknown> {
  return fetchJSON(`/api/integrations/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function deleteIntegration(id: string): Promise<unknown> {
  return fetchJSON(`/api/integrations/${id}`, { method: "DELETE" });
}
