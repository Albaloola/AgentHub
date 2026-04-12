/**
 * Individual message operations — list, vote, pin, edit, thread replies.
 *
 * For sending a NEW message and streaming the response, see `chat.ts`.
 */

"use client";

import { fetchJSON } from "./client";
import type { MessageWithToolCalls } from "@/lib/shared/types";

export function getMessages(conversationId: string): Promise<MessageWithToolCalls[]> {
  return fetchJSON(`/api/messages?conversation_id=${conversationId}`);
}

export function voteMessage(messageId: string, voteType: "up" | "down"): Promise<{ up: number; down: number }> {
  return fetchJSON(`/api/messages/${messageId}/vote`, {
    method: "POST",
    body: JSON.stringify({ vote_type: voteType }),
  });
}

export function pinMessage(messageId: string): Promise<{ is_pinned: boolean }> {
  return fetchJSON(`/api/messages/${messageId}/pin`, { method: "POST" });
}

export function editMessage(id: string, content: string): Promise<unknown> {
  return fetchJSON(`/api/messages/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });
}

// --- Threads (side-conversations anchored to a message) --------------------

export function getThreadReplies(threadId: string): Promise<MessageWithToolCalls[]> {
  return fetchJSON(`/api/threads/${threadId}/replies`);
}

export function replyToThread(parentMessageId: string, content: string): Promise<{ id: string }> {
  return fetchJSON("/api/threads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ parent_message_id: parentMessageId, content }),
  });
}
