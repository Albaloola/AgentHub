/**
 * Conversation lifecycle — list, create, delete, reset, pin, branch, export,
 * summarise, move-to-folder, permissions, checkpoints, replay, smart-context.
 *
 * The reset/branch/export/whiteboard endpoints all hang off
 * `/api/conversations/[id]/...` so they're grouped here for cohesion.
 */

"use client";

import { fetchJSON } from "./client";
import type {
  ConversationWithDetails,
  Checkpoint,
  ReplaySnapshot,
  ConversationPermissionWithUser,
  PermissionLevel,
} from "@/lib/shared/types";

// --- CRUD ------------------------------------------------------------------

export function getConversations(): Promise<ConversationWithDetails[]> {
  return fetchJSON("/api/conversations");
}

export function createConversation(data: {
  channel_id?: string;
  agent_id?: string;
  agent_ids?: string[];
  name?: string;
  type?: "single" | "group";
  response_mode?: string;
}): Promise<{ id: string }> {
  return fetchJSON("/api/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export function deleteConversation(id: string): Promise<void> {
  return fetchJSON(`/api/conversations/${id}`, { method: "DELETE" });
}

export function resetConversation(id: string): Promise<{ message: string; agents: unknown[] }> {
  return fetchJSON(`/api/conversations/${id}/reset`, { method: "POST" });
}

export function toggleConversationPin(id: string): Promise<unknown> {
  return fetchJSON(`/api/conversations/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ action: "toggle_pin" }),
  });
}

export function moveConversationToFolder(conversationId: string, folderId: string | null): Promise<unknown> {
  return fetchJSON(`/api/conversations/${conversationId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "move_to_folder", folder_id: folderId }),
  });
}

export function setConversationChannel(conversationId: string, channelId: string | null): Promise<unknown> {
  return fetchJSON(`/api/conversations/${conversationId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channel_id: channelId }),
  });
}

// --- Branching & export ----------------------------------------------------

export function branchConversation(id: string, branchAtMessageId?: string): Promise<{ id: string }> {
  return fetchJSON(`/api/conversations/${id}/branch`, {
    method: "POST",
    body: JSON.stringify({ branch_at_message_id: branchAtMessageId }),
  });
}

export async function exportConversation(
  id: string,
  format: "markdown" | "json" | "html" = "markdown",
): Promise<string> {
  // Not JSON — the response body is the exported text itself.
  const res = await fetch(`/api/conversations/${id}/export?format=${format}`);
  if (!res.ok) throw new Error("Export failed");
  return res.text();
}

export function summarizeConversation(id: string): Promise<{ summary: string }> {
  return fetchJSON(`/api/conversations/${id}/summarize`, { method: "POST" });
}

// --- Whiteboard ------------------------------------------------------------

export function getWhiteboard(id: string): Promise<unknown> {
  return fetchJSON(`/api/conversations/${id}/whiteboard`);
}

export function saveWhiteboard(id: string, content: string): Promise<unknown> {
  return fetchJSON(`/api/conversations/${id}/whiteboard`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

// --- Smart context ---------------------------------------------------------

export function compactConversation(conversationId: string): Promise<{ summary: string; removed_count: number }> {
  return fetchJSON(`/api/conversations/${conversationId}/compact`, { method: "POST" });
}

// --- Checkpoints (save points) --------------------------------------------

export function getCheckpoints(conversationId: string): Promise<Checkpoint[]> {
  return fetchJSON(`/api/conversations/${conversationId}/checkpoints`);
}

export function createCheckpoint(conversationId: string, name?: string, description?: string): Promise<{ id: string }> {
  return fetchJSON(`/api/conversations/${conversationId}/checkpoints`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description }),
  });
}

export function revertCheckpoint(conversationId: string, checkpointId: string): Promise<unknown> {
  return fetchJSON(`/api/conversations/${conversationId}/checkpoints/${checkpointId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "revert" }),
  });
}

export function forkCheckpoint(conversationId: string, checkpointId: string): Promise<{ id: string }> {
  return fetchJSON(`/api/conversations/${conversationId}/checkpoints/${checkpointId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "fork" }),
  });
}

export function deleteCheckpoint(conversationId: string, checkpointId: string): Promise<unknown> {
  return fetchJSON(`/api/conversations/${conversationId}/checkpoints/${checkpointId}`, { method: "DELETE" });
}

// --- Replay ----------------------------------------------------------------

export function getReplaySnapshots(conversationId: string): Promise<ReplaySnapshot[]> {
  return fetchJSON(`/api/conversations/${conversationId}/replay`);
}

// --- Sharing / permissions ------------------------------------------------

export function getConversationPermissions(conversationId: string): Promise<ConversationPermissionWithUser[]> {
  return fetchJSON(`/api/conversations/${conversationId}/permissions`);
}

export function addConversationPermission(
  conversationId: string,
  userId: string,
  permission: PermissionLevel,
): Promise<ConversationPermissionWithUser> {
  return fetchJSON(`/api/conversations/${conversationId}/permissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, permission }),
  });
}

export function removeConversationPermission(conversationId: string, userId: string): Promise<unknown> {
  return fetchJSON(
    `/api/conversations/${conversationId}/permissions?user_id=${encodeURIComponent(userId)}`,
    { method: "DELETE" },
  );
}
