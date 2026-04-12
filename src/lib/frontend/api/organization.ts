/**
 * UI organisation helpers — folders (hierarchy for the sidebar), tags,
 * templates (reusable conversation shapes).
 *
 * These exist together because they're all "ways to group conversations
 * / agents" rather than domain objects in their own right.
 */

"use client";

import { fetchJSON } from "./client";
import type { ConversationFolder } from "@/lib/shared/types";

// --- Folders ---------------------------------------------------------------

export function getFolders(): Promise<ConversationFolder[]> {
  return fetchJSON("/api/folders");
}

export function createFolder(name: string, parentId?: string, color?: string): Promise<{ id: string }> {
  return fetchJSON("/api/folders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, parent_id: parentId, color }),
  });
}

export function updateFolder(
  id: string,
  body: Partial<{ name: string; color: string; sort_order: number }>,
): Promise<unknown> {
  return fetchJSON(`/api/folders/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function deleteFolder(id: string): Promise<unknown> {
  return fetchJSON(`/api/folders/${id}`, { method: "DELETE" });
}

// --- Tags ------------------------------------------------------------------

export function getTags(): Promise<unknown[]> {
  return fetchJSON("/api/tags");
}

export function createTag(name: string, color: string): Promise<unknown> {
  return fetchJSON("/api/tags", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, color }),
  });
}

export function addTagToConversation(convId: string, tagId: string): Promise<unknown> {
  return fetchJSON(`/api/conversations/${convId}/tags/${tagId}`, { method: "POST" });
}

export function removeTagFromConversation(convId: string, tagId: string): Promise<unknown> {
  return fetchJSON(`/api/conversations/${convId}/tags/${tagId}`, { method: "DELETE" });
}

// --- Templates -------------------------------------------------------------

export interface CreateTemplateBody {
  name: string;
  description?: string;
  response_mode?: string;
  system_prompt?: string;
  max_responses_per_turn?: number;
  stop_on_completion?: boolean;
  agent_ids?: string[];
  agent_roles?: string[];
}

export function getTemplates(): Promise<unknown[]> {
  return fetchJSON("/api/templates");
}

export function createTemplate(body: CreateTemplateBody): Promise<{ id: string }> {
  return fetchJSON("/api/templates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function deleteTemplate(id: string): Promise<unknown> {
  return fetchJSON(`/api/templates/${id}`, { method: "DELETE" });
}
