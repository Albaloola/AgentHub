/**
 * Governance — guardrails (content rules), policies (action rules),
 * users/RBAC, audit log, A2A agent cards.
 */

"use client";

import { fetchJSON } from "./client";
import type {
  GuardrailRule,
  PolicyRule,
  UserAccount,
  AuditLogEntry,
  A2AAgentCard,
} from "@/lib/shared/types";

// --- Guardrails (content-level rules) -------------------------------------

export function getGuardrails(): Promise<GuardrailRule[]> {
  return fetchJSON("/api/guardrails");
}

export function createGuardrail(body: {
  name: string;
  type: string;
  pattern: string;
  action: string;
  scope?: string;
  agent_id?: string;
  description?: string;
}): Promise<{ id: string }> {
  return fetchJSON("/api/guardrails", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function updateGuardrail(
  id: string,
  body: Partial<{ name: string; pattern: string; action: string; is_active: boolean }>,
): Promise<unknown> {
  return fetchJSON(`/api/guardrails/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function deleteGuardrail(id: string): Promise<unknown> {
  return fetchJSON(`/api/guardrails/${id}`, { method: "DELETE" });
}

// --- Policies (runtime action-level rules) --------------------------------

export function getPolicies(): Promise<PolicyRule[]> {
  return fetchJSON("/api/policies");
}

export function createPolicy(body: {
  name: string;
  type: string;
  rule_json: Record<string, unknown>;
  severity?: string;
  scope?: string;
  agent_id?: string;
  description?: string;
}): Promise<{ id: string }> {
  return fetchJSON("/api/policies", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function updatePolicy(
  id: string,
  body: Partial<{ name: string; rule_json: Record<string, unknown>; is_active: boolean }>,
): Promise<unknown> {
  return fetchJSON(`/api/policies/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function deletePolicy(id: string): Promise<unknown> {
  return fetchJSON(`/api/policies/${id}`, { method: "DELETE" });
}

// --- Users & RBAC ---------------------------------------------------------

export function getUsers(): Promise<UserAccount[]> {
  return fetchJSON("/api/users");
}

export function createUser(body: { display_name: string; email?: string; role?: string }): Promise<{ id: string }> {
  return fetchJSON("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function updateUser(id: string, body: Partial<{ display_name: string; role: string }>): Promise<unknown> {
  return fetchJSON(`/api/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function deleteUser(id: string): Promise<unknown> {
  return fetchJSON(`/api/users/${id}`, { method: "DELETE" });
}

// --- Audit log ------------------------------------------------------------

export function getAuditLog(limit?: number, actorId?: string): Promise<AuditLogEntry[]> {
  const p = new URLSearchParams();
  if (limit) p.set("limit", limit.toString());
  if (actorId) p.set("actor_id", actorId);
  const q = p.toString();
  return fetchJSON(`/api/audit${q ? `?${q}` : ""}`);
}

// --- A2A agent cards ------------------------------------------------------

export function getA2ACards(): Promise<(A2AAgentCard & { agent_name?: string })[]> {
  return fetchJSON("/api/a2a");
}

export function publishA2ACard(agentId: string, cardJson: Record<string, unknown>): Promise<{ id: string }> {
  return fetchJSON("/api/a2a", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agent_id: agentId, card_json: cardJson }),
  });
}

export function updateA2ACard(
  id: string,
  body: Partial<{ card_json: string; is_published: boolean }>,
): Promise<unknown> {
  return fetchJSON(`/api/a2a/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function deleteA2ACard(id: string): Promise<unknown> {
  return fetchJSON(`/api/a2a/${id}`, { method: "DELETE" });
}
