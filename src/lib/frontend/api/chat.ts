/**
 * The streaming chat bridge.
 *
 * `streamChat` POSTs to `/api/chat`, reads the Server-Sent Events response
 * one `data: {...}` frame at a time, parses each frame as a JSON event, and
 * dispatches the right callback.
 *
 * This is the single most complex client-side piece in the app — everything
 * you see animating in the chat view comes through here.
 */

"use client";

import { fetchJSON } from "./client";

// --- Public types ----------------------------------------------------------

/**
 * Subscribe to one of these for each streaming event from the agent.
 * All but the required ones are optional — the stream will just skip
 * events you don't care about.
 */
export interface ChatStreamCallbacks {
  onContent: (content: string) => void;
  onToolCall: (data: {
    tool_call_id: string;
    tool_name: string;
    tool_input: Record<string, unknown>;
  }) => void;
  onToolResult: (data: {
    tool_call_id: string;
    tool_name: string;
    tool_output: Record<string, unknown>;
  }) => void;
  onError: (error: string) => void;
  onDone: (data: { message_id: string; agent_id: string }) => void;
  onAgentStart?: (data: { agent_id: string; agent_name: string; message_id: string }) => void;
  onThinking?: (content: string) => void;
  onThinkingEnd?: () => void;
  onSubagentSpawned?: (data: { subagent_id: string; goal: string; agent_id?: string }) => void;
  onSubagentProgress?: (data: { subagent_id: string; agent_id?: string }) => void;
  onSubagentCompleted?: (data: { subagent_id: string; result: string }) => void;
  onSubagentFailed?: (data: { subagent_id: string; error: string }) => void;
  onHandoff?: (data: {
    from_agent_id: string;
    from_agent_name: string;
    to_agent_id: string;
    to_agent_name: string;
    context: string;
  }) => void;
}

// --- Main entry point ------------------------------------------------------

/**
 * Fire-and-forget — returns void. Cancellation is via `options.signal`
 * (pass an `AbortController`'s signal and call `.abort()`).
 */
export function streamChat(
  conversationId: string,
  content: string,
  callbacks: ChatStreamCallbacks,
  options?: { target_agent_id?: string; signal?: AbortSignal },
): void {
  const body = JSON.stringify({
    conversation_id: conversationId,
    content,
    target_agent_id: options?.target_agent_id,
  });

  fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    signal: options?.signal,
  })
    .then(async (res) => {
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        callbacks.onError(`${res.status}: ${text || res.statusText}`);
        return;
      }
      const reader = res.body?.getReader();
      if (!reader) { callbacks.onError("No response body"); return; }

      await readSseStream(reader, callbacks);
    })
    .catch((err: Error) => {
      if (err.name !== "AbortError") callbacks.onError(err.message);
    });
}

/** Regenerate the assistant response after a given message. */
export function regenerateMessage(
  conversationId: string,
  afterMessageId: string,
  agentId?: string,
): Promise<unknown> {
  return fetchJSON("/api/chat/regenerate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conversation_id: conversationId,
      after_message_id: afterMessageId,
      agent_id: agentId,
    }),
  });
}

// --- SSE parsing (private) -------------------------------------------------

/** Drain the SSE stream, dispatching each JSON frame to the right callback. */
async function readSseStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  callbacks: ChatStreamCallbacks,
): Promise<void> {
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    // Last line might be a partial frame — put it back in the buffer.
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (!data) continue;
      try {
        dispatchEvent(JSON.parse(data), callbacks);
      } catch {
        // Skip malformed events — don't kill the stream for one bad frame.
      }
    }
  }
}

interface SseEvent {
  type: string;
  content?: string;
  tool_call_id?: string;
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_output?: Record<string, unknown>;
  error?: string;
  message_id?: string;
  agent_id?: string;
  agent_name?: string;
  thinking?: string;
  subagent_id?: string;
  subagent_goal?: string;
  subagent_result?: string;
  subagent_error?: string;
}

/** Route one SSE event to the appropriate callback. */
function dispatchEvent(event: SseEvent, cb: ChatStreamCallbacks): void {
  switch (event.type) {
    case "content":
      if (event.content) cb.onContent(event.content);
      break;
    case "tool_call":
      cb.onToolCall({
        tool_call_id: event.tool_call_id ?? "",
        tool_name: event.tool_name ?? "",
        tool_input: event.tool_input ?? {},
      });
      break;
    case "tool_result":
      cb.onToolResult({
        tool_call_id: event.tool_call_id ?? "",
        tool_name: event.tool_name ?? "",
        tool_output: event.tool_output ?? {},
      });
      break;
    case "error":
      cb.onError(event.error ?? "Unknown error");
      break;
    case "done":
      cb.onDone({
        message_id: event.message_id ?? "",
        agent_id: event.agent_id ?? "",
      });
      break;
    case "agent_start":
      cb.onAgentStart?.({
        agent_id: event.agent_id ?? "",
        agent_name: event.agent_name ?? "",
        message_id: event.message_id ?? "",
      });
      break;
    case "thinking":
    case "thinking_chunk":
      if (event.thinking) cb.onThinking?.(event.thinking);
      break;
    case "thinking_end":
      cb.onThinkingEnd?.();
      break;
    case "subagent_spawned":
      cb.onSubagentSpawned?.({
        subagent_id: event.subagent_id ?? "",
        goal: event.subagent_goal ?? "",
        agent_id: event.agent_id,
      });
      break;
    case "subagent_progress":
      cb.onSubagentProgress?.({
        subagent_id: event.subagent_id ?? "",
        agent_id: event.agent_id,
      });
      break;
    case "subagent_completed":
      cb.onSubagentCompleted?.({
        subagent_id: event.subagent_id ?? "",
        result: event.subagent_result ?? "",
      });
      break;
    case "subagent_failed":
      cb.onSubagentFailed?.({
        subagent_id: event.subagent_id ?? "",
        error: event.subagent_error ?? "",
      });
      break;
    case "handoff": {
      const hev = event as unknown as Record<string, string>;
      cb.onHandoff?.({
        from_agent_id: hev.from_agent_id ?? "",
        from_agent_name: hev.from_agent_name ?? "",
        to_agent_id: hev.to_agent_id ?? "",
        to_agent_name: hev.to_agent_name ?? "",
        context: hev.context ?? "",
      });
      break;
    }
  }
}
