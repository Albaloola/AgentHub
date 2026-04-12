/**
 * Automation — webhooks, scheduled tasks, external API keys, notifications.
 *
 * Anything that can trigger an agent from outside the UI is grouped here.
 */

"use client";

import { fetchJSON } from "./client";
import type {
  Webhook,
  WebhookEvent,
  ScheduledTask,
  Notification,
} from "@/lib/shared/types";

// --- Webhooks --------------------------------------------------------------

export function getWebhooks(): Promise<(Webhook & { agent_name?: string })[]> {
  return fetchJSON("/api/webhooks");
}

export function createWebhook(body: {
  name: string;
  agent_id: string;
  system_prompt?: string;
  body_transform?: string;
  rate_limit_per_min?: number;
}): Promise<Webhook> {
  return fetchJSON("/api/webhooks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function updateWebhook(
  id: string,
  body: Partial<{ name: string; agent_id: string; system_prompt: string; is_active: boolean }>,
): Promise<unknown> {
  return fetchJSON(`/api/webhooks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function deleteWebhook(id: string): Promise<unknown> {
  return fetchJSON(`/api/webhooks/${id}`, { method: "DELETE" });
}

export function getWebhookEvents(id: string, limit?: number): Promise<WebhookEvent[]> {
  return fetchJSON(`/api/webhooks/${id}/events?limit=${limit || 20}`);
}

// --- External API keys ----------------------------------------------------

export function getApiKeys(): Promise<
  {
    id: string;
    name: string;
    key_preview: string;
    permissions: string;
    rate_limit_rpm: number;
    last_used_at: string | null;
    created_at: string;
  }[]
> {
  return fetchJSON("/api/external/keys");
}

export function createApiKey(name: string, permissions?: string[]): Promise<{ id: string; raw_key: string }> {
  return fetchJSON("/api/external/keys", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, permissions }),
  });
}

export function deleteApiKey(id: string): Promise<unknown> {
  return fetchJSON(`/api/external/keys/${id}`, { method: "DELETE" });
}

// --- Scheduled tasks ------------------------------------------------------

export function getScheduledTasks(): Promise<(ScheduledTask & { agent_name?: string })[]> {
  return fetchJSON("/api/scheduled-tasks");
}

export function createScheduledTask(body: {
  name: string;
  agent_id: string;
  prompt: string;
  cron_expression?: string;
}): Promise<{ id: string }> {
  return fetchJSON("/api/scheduled-tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function updateScheduledTask(
  id: string,
  body: Partial<{ name: string; prompt: string; cron_expression: string; is_active: boolean }>,
): Promise<unknown> {
  return fetchJSON(`/api/scheduled-tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function runScheduledTask(id: string): Promise<unknown> {
  return fetchJSON(`/api/scheduled-tasks/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "run" }),
  });
}

export function deleteScheduledTask(id: string): Promise<unknown> {
  return fetchJSON(`/api/scheduled-tasks/${id}`, { method: "DELETE" });
}

// --- Notifications --------------------------------------------------------

export function getNotifications(unreadOnly?: boolean, limit?: number): Promise<Notification[]> {
  const params = new URLSearchParams();
  if (unreadOnly) params.set("unread", "true");
  if (limit) params.set("limit", limit.toString());
  const qs = params.toString();
  return fetchJSON(`/api/notifications${qs ? `?${qs}` : ""}`);
}

export function markNotificationRead(id: string): Promise<unknown> {
  return fetchJSON(`/api/notifications/${id}`, { method: "PATCH" });
}

export function markAllNotificationsRead(): Promise<unknown> {
  return fetchJSON("/api/notifications", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "mark_all_read" }),
  });
}

export function deleteNotification(id: string): Promise<unknown> {
  return fetchJSON(`/api/notifications/${id}`, { method: "DELETE" });
}
