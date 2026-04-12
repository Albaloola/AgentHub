/**
 * Workflow builder — visual pipelines that chain agents together.
 */

"use client";

import { fetchJSON } from "./client";

export function getWorkflows(): Promise<unknown[]> {
  return fetchJSON("/api/workflows");
}

export function createWorkflow(body: {
  name: string;
  description?: string;
  nodes?: unknown[];
  edges?: unknown[];
}): Promise<{ id: string }> {
  return fetchJSON("/api/workflows", { method: "POST", body: JSON.stringify(body) });
}

export function updateWorkflow(
  id: string,
  body: Partial<{ name: string; description: string; nodes: unknown[]; edges: unknown[]; is_active: boolean }>,
): Promise<unknown> {
  return fetchJSON(`/api/workflows/${id}`, { method: "POST", body: JSON.stringify(body) });
}

export function deleteWorkflow(id: string): Promise<unknown> {
  return fetchJSON(`/api/workflows/${id}`, { method: "DELETE" });
}
