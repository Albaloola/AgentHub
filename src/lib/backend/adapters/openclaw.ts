import type { Agent, AgentMessage, AgentResponseChunk, HealthCheckResponse } from "@/lib/shared/types";
import type { GatewayAdapter, AdapterMeta } from "./base";
import { registerAdapter } from "./base";

/**
 * OpenClaw Adapter — connects to an OpenClaw autonomous agent gateway.
 *
 * OpenClaw is a flexible agent gateway. Since its API may vary by deployment,
 * this adapter supports configurable endpoint paths and response formats.
 *
 * Default expected endpoints:
 *   POST {base}/v1/chat     — send message, receive SSE stream
 *   GET  {base}/v1/status   — health/status check
 *
 * SSE stream format (AgentHub native):
 *   data: {"type":"content","content":"..."}
 *   data: {"type":"tool_call","tool_call_id":"...","tool_name":"...","tool_input":{...}}
 *   data: {"type":"tool_result","tool_call_id":"...","tool_name":"...","tool_output":{...}}
 *   data: {"type":"error","error":"..."}
 *   data: [DONE]
 *
 * Also supports OpenAI-compatible streaming format (auto-detected):
 *   data: {"choices":[{"delta":{"content":"..."}}]}
 *
 * Configuration via connection_config JSON:
 *   {
 *     "api_key": "oc-...",           // Optional API key
 *     "chat_endpoint": "/v1/chat",   // Configurable chat path
 *     "health_endpoint": "/v1/status", // Configurable health path
 *     "model": "default",            // Model identifier (sent to gateway)
 *     "system_prompt": "...",         // Optional system prompt
 *     "timeout_ms": 60000,           // Request timeout
 *     "extra_headers": {},            // Extra HTTP headers
 *     "request_format": "native"      // "native" or "openai" — how to format the request body
 *   }
 */

interface OpenClawConfig {
  api_key?: string;
  chat_endpoint?: string;
  health_endpoint?: string;
  model?: string;
  system_prompt?: string;
  timeout_ms?: number;
  extra_headers?: Record<string, string>;
  request_format?: "native" | "openai";
}

export class OpenClawAdapter implements GatewayAdapter {
  private parseConfig(agent: Agent): OpenClawConfig {
    try {
      return JSON.parse(agent.connection_config) as OpenClawConfig;
    } catch {
      return {};
    }
  }

  private buildHeaders(config: OpenClawConfig): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...config.extra_headers,
    };
    if (config.api_key) {
      headers["Authorization"] = `Bearer ${config.api_key}`;
    }
    return headers;
  }

  private buildRequestBody(
    config: OpenClawConfig,
    message: AgentMessage,
  ): string {
    if (config.request_format === "openai") {
      // Format as OpenAI-compatible request
      const messages: { role: string; content: string }[] = [];
      if (config.system_prompt) {
        messages.push({ role: "system", content: config.system_prompt });
      }
      for (const h of message.history) {
        messages.push({ role: h.role, content: h.content });
      }
      messages.push({ role: "user", content: message.content });
      return JSON.stringify({
        model: config.model ?? "default",
        messages,
        stream: true,
      });
    }

    // Native format — send the AgentMessage directly with optional extras
    return JSON.stringify({
      ...message,
      model: config.model,
      system_prompt: config.system_prompt,
    });
  }

  private normalizeEndpoint(path: string): string {
    const trimmed = path.trim();
    if (!trimmed) return "/v1/chat";
    return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  }

  private getChatPathCandidates(config: OpenClawConfig): string[] {
    const requested = this.normalizeEndpoint(config.chat_endpoint ?? "/v1/chat");
    const candidates = new Set<string>([requested]);

    if (config.request_format === "openai") {
      candidates.add("/v1/chat/completions");
      if (requested === "/v1/chat") {
        candidates.add("/v1/chat/completions");
      } else {
        candidates.add("/v1/chat");
      }
    }

    return Array.from(candidates);
  }

  async *sendMessage(
    agent: Agent,
    message: AgentMessage,
    signal?: AbortSignal,
  ): AsyncIterable<AgentResponseChunk> {
    const config = this.parseConfig(agent);
    const chatPaths = this.getChatPathCandidates(config);
    const baseUrl = agent.connection_url.replace(/\/+$/, "");
    const timeoutMs = config.timeout_ms ?? 60000;
    let response: Response | undefined;
    let errorInfo = "";

    const headers = this.buildHeaders(config);
    const body = this.buildRequestBody(config, message);

    let responseUrl = "";
    // Timeout handling
    const timeoutController = new AbortController();
    const timeout = setTimeout(() => timeoutController.abort(), timeoutMs);
    const combinedSignal = signal
      ? anySignal([signal, timeoutController.signal])
      : timeoutController.signal;

    for (const chatPath of chatPaths) {
      responseUrl = `${baseUrl}${this.normalizeEndpoint(chatPath)}`;
      try {
        response = await fetch(responseUrl, {
          method: "POST",
          headers,
          body,
          signal: combinedSignal,
        });
      } catch (err) {
        clearTimeout(timeout);
        yield { type: "error", error: classifyFetchError(err, responseUrl, "OpenClaw") };
        yield { type: "done" };
        return;
      }

      if (response.ok) break;

      // For endpoint-path mismatches (common with mixed OpenAI/OpenClaw deployments),
      // try alternatives before surfacing an error to the UI.
      if (response.status === 404 || response.status === 405) {
        try {
          const errBody = await response.text();
          if (errBody) errorInfo = errBody.slice(0, 300);
        } catch {}
        continue;
      }

      break;
    }

    if (!response) {
      clearTimeout(timeout);
      yield { type: "error", error: errorInfo || "OpenClaw did not return a response" };
      yield { type: "done" };
      return;
    }

    clearTimeout(timeout);

    if (!response.ok) {
      let detail = response.statusText;
      try {
        const errBody = await response.text();
        if (errBody) detail = errBody.slice(0, 300);
      } catch { /* ignore */ }
      yield {
        type: "error",
        error: `OpenClaw returned ${response.status} at ${responseUrl}: ${detail}`,
      };
      yield { type: "done" };
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield { type: "error", error: "OpenClaw returned an empty response body" };
      yield { type: "done" };
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let rawBody = "";
    // For OpenAI-format responses: accumulate streamed tool call fragments
    const toolCallBuffers = new Map<number, { id: string; name: string; args: string }>();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunkText = decoder.decode(value, { stream: true });
        rawBody += chunkText;
        buffer += chunkText;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const chunk = this.parseLine(line, toolCallBuffers);
          if (chunk) {
            yield chunk;
            if (chunk.type === "done") return;
          }
        }
      }

      if (rawBody.trim()) {
        const fallbackPayload = this.parseFallbackResponse(rawBody, toolCallBuffers);
        for (const chunk of fallbackPayload) {
          yield chunk;
          if (chunk.type === "done") return;
        }
      }

      // Flush any remaining tool call buffers
      for (const [, tc] of toolCallBuffers) {
        yield {
          type: "tool_call" as const,
          tool_call_id: tc.id,
          tool_name: tc.name,
          tool_input: safeParseJSON(tc.args),
        };
      }
    } catch (err) {
      yield { type: "error", error: err instanceof Error ? err.message : "Stream read error" };
    } finally {
      reader.releaseLock();
    }

    yield { type: "done" };
  }

  /**
   * Parse a single SSE line. Handles both native AgentHub format and
   * OpenAI-compatible format (auto-detected by presence of `choices` array).
   */
  private parseLine(
    line: string,
    toolCallBuffers: Map<number, { id: string; name: string; args: string }>,
  ): AgentResponseChunk | null {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(":")) return null;
    if (!trimmed.startsWith("data:")) return null;

    const data = trimmed.startsWith("data: ") ? trimmed.slice(6) : trimmed.slice(5);
    const dataTrimmed = data.trim();

    if (dataTrimmed === "[DONE]") return { type: "done" };
    if (!dataTrimmed) return null;

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(dataTrimmed);
    } catch {
      // Not JSON — treat as plain content
      return dataTrimmed.length > 0 ? { type: "content", content: dataTrimmed } : null;
    }

    // Check if it's OpenAI format (has choices array)
    if (Array.isArray(parsed.choices)) {
      return this.parseOpenAIChunk(parsed, toolCallBuffers);
    }

    // Native AgentHub format
    if (parsed.type && typeof parsed.type === "string") {
      const validTypes = ["content", "tool_call", "tool_result", "error", "done"];
      if (validTypes.includes(parsed.type)) {
        return parsed as unknown as AgentResponseChunk;
      }
    }

    // Unknown structure — look for content field
    if (typeof parsed.content === "string") {
      return { type: "content", content: parsed.content };
    }

    return null;
  }

  private parseFallbackResponse(
    payload: string,
    toolCallBuffers: Map<number, { id: string; name: string; args: string }>,
  ): AgentResponseChunk[] {
    const chunks: AgentResponseChunk[] = [];
    const raw = payload.trim();
    if (!raw) return chunks;

    const pushIfChunk = (parsed: Record<string, unknown> | unknown[]) => {
      if (!parsed) return;
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          const chunk = this.parsePayloadObject(item as Record<string, unknown>, toolCallBuffers);
          if (chunk) chunks.push(chunk);
        }
        return;
      }
      const chunk = this.parsePayloadObject(parsed as Record<string, unknown>, toolCallBuffers);
      if (chunk) chunks.push(chunk);
    };

    for (const rawLine of raw.split("\n")) {
      const line = rawLine.trim();
      if (!line) continue;
      if (line.startsWith("data:")) {
        const chunk = this.parseLine(line, toolCallBuffers);
        if (chunk) chunks.push(chunk);
        continue;
      }
      try {
        const parsed = JSON.parse(line) as Record<string, unknown> | unknown[];
        pushIfChunk(parsed);
        continue;
      } catch {
        chunks.push({ type: "content", content: line });
      }
    }

    return chunks;
  }

  private parsePayloadObject(
    parsed: Record<string, unknown>,
    toolCallBuffers: Map<number, { id: string; name: string; args: string }>,
  ): AgentResponseChunk | null {
    if (Array.isArray(parsed.choices)) {
      return this.parseOpenAIChunk(parsed, toolCallBuffers);
    }

    const validTypes = ["content", "tool_call", "tool_result", "error", "done", "thinking", "thinking_chunk", "thinking_end", "subagent_spawned", "subagent_progress", "subagent_completed", "subagent_failed", "handoff", "agent_start"];
    if (typeof parsed.type === "string" && validTypes.includes(parsed.type)) {
      return parsed as unknown as AgentResponseChunk;
    }

    if (typeof parsed.content === "string") {
      return { type: "content", content: parsed.content };
    }

    if (typeof parsed.error === "string") {
      return { type: "error", error: parsed.error };
    }

    const message = parsed.message as { content?: unknown } | undefined;
    if (message && typeof message.content === "string") {
      return { type: "content", content: message.content };
    }

    return null;
  }

  private parseOpenAIChunk(
    parsed: Record<string, unknown>,
    toolCallBuffers: Map<number, { id: string; name: string; args: string }>,
  ): AgentResponseChunk | null {
    const choices = parsed.choices as { delta?: Record<string, unknown>; finish_reason?: string | null }[];
    const choice = choices[0];
    if (!choice?.delta) return null;

    const delta = choice.delta;

    if (typeof delta.content === "string" && delta.content) {
      return { type: "content", content: delta.content };
    }

    if (Array.isArray(delta.tool_calls)) {
      for (const tc of delta.tool_calls as { index: number; id?: string; function?: { name?: string; arguments?: string } }[]) {
        if (!toolCallBuffers.has(tc.index)) {
          toolCallBuffers.set(tc.index, {
            id: tc.id ?? crypto.randomUUID(),
            name: tc.function?.name ?? "unknown",
            args: "",
          });
        }
        const buf = toolCallBuffers.get(tc.index)!;
        if (tc.function?.name) buf.name = tc.function.name;
        if (tc.function?.arguments) buf.args += tc.function.arguments;
      }
      return null; // Accumulating — will flush on [DONE] or stream end
    }

    if (choice.finish_reason === "stop") {
      return { type: "done" };
    }

    return null;
  }

  async healthCheck(agent: Agent): Promise<HealthCheckResponse> {
    const config = this.parseConfig(agent);
    const healthPath = config.health_endpoint ?? "/v1/status";
    const url = `${agent.connection_url.replace(/\/+$/, "")}${healthPath}`;
    const start = Date.now();

    try {
      const headers: Record<string, string> = {};
      if (config.api_key) {
        headers["Authorization"] = `Bearer ${config.api_key}`;
      }

      const res = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(5000),
      });

      const latency_ms = Date.now() - start;

      if (!res.ok) {
        return { status: "error", agent_name: agent.name, latency_ms };
      }

      try {
        const data = (await res.json()) as Record<string, unknown>;
        const isOk = data.status === "ok" || data.status === "healthy" || data.status === "running";
        return {
          status: isOk ? "ok" : "error",
          agent_name: (data.name as string) ?? (data.agent_name as string) ?? agent.name,
          latency_ms,
        };
      } catch {
        return { status: "ok", agent_name: agent.name, latency_ms };
      }
    } catch {
      return { status: "error", agent_name: agent.name, latency_ms: Date.now() - start };
    }
  }
}

// === Helpers ===

function classifyFetchError(err: unknown, url: string, name: string): string {
  if (err instanceof DOMException && err.name === "AbortError") {
    return `Request to ${url} was aborted (timeout or cancellation)`;
  }
  if (err instanceof TypeError) {
    const msg = (err as Error).message ?? "";
    if (msg.includes("fetch failed") || msg.includes("ECONNREFUSED")) {
      return `Cannot connect to ${name} at ${url} — is the gateway running?`;
    }
    if (msg.includes("ENOTFOUND") || msg.includes("getaddrinfo")) {
      return `Cannot resolve hostname for ${url} — check the connection URL`;
    }
    return `Network error connecting to ${url}: ${msg}`;
  }
  return `Failed to connect to ${name} at ${url}: ${err instanceof Error ? err.message : String(err)}`;
}

function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }
    signal.addEventListener("abort", () => controller.abort(signal.reason), { once: true });
  }
  return controller.signal;
}

function safeParseJSON(str: string): Record<string, unknown> {
  try {
    return JSON.parse(str || "{}") as Record<string, unknown>;
  } catch {
    return { raw: str };
  }
}

// === Registration ===

export const openclawMeta: AdapterMeta = {
  type: "openclaw",
  displayName: "OpenClaw",
  description: "Connect to an OpenClaw autonomous agent gateway",
  defaultUrl: "http://localhost:8090",
  configFields: [
    { key: "api_key", label: "API Key", type: "password", required: false, placeholder: "oc-..." },
    { key: "model", label: "Model", type: "string", required: false, placeholder: "default" },
    { key: "system_prompt", label: "System Prompt", type: "string", required: false, placeholder: "Optional system prompt" },
    { key: "chat_endpoint", label: "Chat Endpoint", type: "string", required: false, placeholder: "/v1/chat", default: "/v1/chat" },
    { key: "health_endpoint", label: "Health Endpoint", type: "string", required: false, placeholder: "/v1/status", default: "/v1/status" },
    { key: "request_format", label: "Request Format", type: "string", required: false, placeholder: "native", default: "native", description: '"native" (AgentHub format) or "openai" (OpenAI-compatible)' },
    { key: "timeout_ms", label: "Timeout (ms)", type: "number", required: false, placeholder: "60000", default: 60000 },
  ],
  capabilities: { streaming: true, toolCalls: true, healthCheck: true, thinking: true, subagents: true },
  maxContextTokens: 16384,
  contextReset: true,
};

registerAdapter(openclawMeta, () => new OpenClawAdapter());
