import type { Agent, AgentMessage, AgentResponseChunk, HealthCheckResponse } from "../types";
import type { GatewayAdapter, AdapterMeta } from "./base";
import { registerAdapter } from "./base";

/**
 * Hermes Adapter — connects to a Hermes agent gateway.
 *
 * Expected endpoints (all configurable via connection_config):
 *   POST {base}/api/chat   — send message, receive SSE stream
 *   GET  {base}/api/health — health check returning { status: "ok"|"error", agent_name?: string }
 *
 * SSE stream format:
 *   data: {"type":"content","content":"..."}
 *   data: {"type":"tool_call","tool_call_id":"...","tool_name":"...","tool_input":{...}}
 *   data: {"type":"tool_result","tool_call_id":"...","tool_name":"...","tool_output":{...}}
 *   data: {"type":"error","error":"..."}
 *   data: [DONE]
 *
 * If the gateway sends plain text chunks (no JSON), they're treated as content.
 */

interface HermesConfig {
  auth_token?: string;
  headers?: Record<string, string>;
  chat_endpoint?: string;   // default: "/api/chat"
  health_endpoint?: string; // default: "/api/health"
  timeout_ms?: number;      // default: 30000
}

export class HermesAdapter implements GatewayAdapter {
  private parseConfig(agent: Agent): HermesConfig {
    try {
      return JSON.parse(agent.connection_config) as HermesConfig;
    } catch {
      return {};
    }
  }

  async *sendMessage(
    agent: Agent,
    message: AgentMessage,
    signal?: AbortSignal,
  ): AsyncIterable<AgentResponseChunk> {
    const config = this.parseConfig(agent);
    const chatPath = config.chat_endpoint ?? "/api/chat";
    const url = `${agent.connection_url.replace(/\/+$/, "")}${chatPath}`;
    const timeoutMs = config.timeout_ms ?? 30000;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...config.headers,
    };
    if (config.auth_token) {
      headers["Authorization"] = `Bearer ${config.auth_token}`;
    }

    // Combine user signal with timeout
    const timeoutController = new AbortController();
    const timeout = setTimeout(() => timeoutController.abort(), timeoutMs);
    const combinedSignal = signal
      ? anySignal([signal, timeoutController.signal])
      : timeoutController.signal;

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(message),
        signal: combinedSignal,
      });
    } catch (err) {
      clearTimeout(timeout);
      const msg = classifyFetchError(err, url);
      yield { type: "error", error: msg };
      yield { type: "done" };
      return;
    }

    clearTimeout(timeout);

    if (!response.ok) {
      let detail = response.statusText;
      try {
        const body = await response.text();
        if (body) detail = body.slice(0, 200);
      } catch { /* ignore */ }
      yield { type: "error", error: `Hermes returned ${response.status}: ${detail}` };
      yield { type: "done" };
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield { type: "error", error: "Hermes returned an empty response body" };
      yield { type: "done" };
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(":")) continue; // skip empty lines and SSE comments

          if (!trimmed.startsWith("data: ") && !trimmed.startsWith("data:")) continue;
          const data = trimmed.startsWith("data: ") ? trimmed.slice(6) : trimmed.slice(5);
          const dataTrimmed = data.trim();

          if (dataTrimmed === "[DONE]") {
            yield { type: "done" };
            return;
          }

          if (!dataTrimmed) continue;

          try {
            const chunk = JSON.parse(dataTrimmed) as AgentResponseChunk;
            // Validate the type field
            if (chunk.type && ["content", "tool_call", "tool_result", "error", "done"].includes(chunk.type)) {
              yield chunk;
              if (chunk.type === "done") return;
            } else {
              // Unknown structure but valid JSON — treat content field if present
              const raw = chunk as unknown as Record<string, unknown>;
              if (typeof raw.content === "string") {
                yield { type: "content", content: raw.content };
              }
            }
          } catch {
            // Not valid JSON — treat as plain text content
            if (dataTrimmed.length > 0) {
              yield { type: "content", content: dataTrimmed };
            }
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        const remaining = buffer.trim();
        if (remaining.startsWith("data: ") || remaining.startsWith("data:")) {
          const data = remaining.startsWith("data: ") ? remaining.slice(6) : remaining.slice(5);
          if (data.trim() && data.trim() !== "[DONE]") {
            try {
              const chunk = JSON.parse(data.trim()) as AgentResponseChunk;
              yield chunk;
            } catch {
              yield { type: "content", content: data.trim() };
            }
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Stream read error";
      yield { type: "error", error: msg };
    } finally {
      reader.releaseLock();
    }

    yield { type: "done" };
  }

  async healthCheck(agent: Agent): Promise<HealthCheckResponse> {
    const config = this.parseConfig(agent);
    const healthPath = config.health_endpoint ?? "/api/health";
    const url = `${agent.connection_url.replace(/\/+$/, "")}${healthPath}`;
    const start = Date.now();

    try {
      const headers: Record<string, string> = {};
      if (config.auth_token) {
        headers["Authorization"] = `Bearer ${config.auth_token}`;
      }

      const res = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(5000),
      });

      const latency_ms = Date.now() - start;

      if (!res.ok) {
        return { status: "error", agent_name: agent.name, latency_ms };
      }

      // Try to parse JSON response, but don't require it
      try {
        const data = (await res.json()) as Record<string, unknown>;
        return {
          status: data.status === "ok" || data.status === "healthy" ? "ok" : "error",
          agent_name: (data.agent_name as string) ?? agent.name,
          latency_ms,
        };
      } catch {
        // Non-JSON 200 response — treat as healthy
        return { status: "ok", agent_name: agent.name, latency_ms };
      }
    } catch (err) {
      return {
        status: "error",
        agent_name: agent.name,
        latency_ms: Date.now() - start,
      };
    }
  }
}

// === Helpers ===

function classifyFetchError(err: unknown, url: string): string {
  if (err instanceof DOMException && err.name === "AbortError") {
    return `Request to ${url} was aborted (timeout or cancellation)`;
  }
  if (err instanceof TypeError) {
    // fetch throws TypeError for network errors
    const msg = (err as Error).message ?? "";
    if (msg.includes("fetch failed") || msg.includes("ECONNREFUSED")) {
      return `Cannot connect to Hermes at ${url} — is the gateway running?`;
    }
    if (msg.includes("ENOTFOUND") || msg.includes("getaddrinfo")) {
      return `Cannot resolve hostname for ${url} — check the connection URL`;
    }
    if (msg.includes("ETIMEDOUT") || msg.includes("ETIME")) {
      return `Connection to ${url} timed out`;
    }
    return `Network error connecting to ${url}: ${msg}`;
  }
  return `Failed to connect to Hermes at ${url}: ${err instanceof Error ? err.message : String(err)}`;
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

// === Registration ===

export const hermesMeta: AdapterMeta = {
  type: "hermes",
  displayName: "Hermes",
  description: "Connect to a Hermes agent gateway via SSE streaming",
  defaultUrl: "http://localhost:8080",
  configFields: [
    { key: "auth_token", label: "Auth Token", type: "password", required: false, placeholder: "Bearer token for authentication" },
    { key: "chat_endpoint", label: "Chat Endpoint", type: "string", required: false, placeholder: "/api/chat", default: "/api/chat", description: "POST endpoint for sending messages" },
    { key: "health_endpoint", label: "Health Endpoint", type: "string", required: false, placeholder: "/api/health", default: "/api/health", description: "GET endpoint for health checks" },
    { key: "timeout_ms", label: "Timeout (ms)", type: "number", required: false, placeholder: "30000", default: 30000 },
  ],
  capabilities: { streaming: true, toolCalls: true, healthCheck: true },
  maxContextTokens: 8192,
  contextReset: true,
};

registerAdapter(hermesMeta, () => new HermesAdapter());
