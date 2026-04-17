import type { Agent, AgentMessage, AgentResponseChunk, HealthCheckResponse } from "@/lib/shared/types";
import type { GatewayAdapter, AdapterMeta } from "./base";
import { registerAdapter } from "./base";

/**
 * OpenAI-Compatible Adapter — connects to any gateway that speaks the OpenAI
 * chat completions API format (e.g. LiteLLM, vLLM, Ollama, LocalAI, etc.).
 *
 * POST {base}/v1/chat/completions  (streaming)
 * GET  {base}/v1/models            (health check)
 */

interface OpenAICompatConfig {
  api_key?: string;
  model?: string;
  system_prompt?: string;
  timeout_ms?: number;
}

export class OpenAICompatAdapter implements GatewayAdapter {
  private parseConfig(agent: Agent): OpenAICompatConfig {
    try {
      return JSON.parse(agent.connection_config) as OpenAICompatConfig;
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
    const url = `${agent.connection_url.replace(/\/+$/, "")}/v1/chat/completions`;
    const timeoutMs = config.timeout_ms ?? 60000;

    const messages: { role: string; content: string }[] = [];
    if (config.system_prompt) {
      messages.push({ role: "system", content: config.system_prompt });
    }
    for (const h of message.history) {
      messages.push({ role: h.role, content: h.content });
    }
    messages.push({ role: "user", content: message.content });

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    };
    if (config.api_key) {
      headers["Authorization"] = `Bearer ${config.api_key}`;
    }

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
        body: JSON.stringify({
          model: config.model ?? "default",
          messages,
          stream: true,
        }),
        signal: combinedSignal,
      });
    } catch (err) {
      clearTimeout(timeout);
      const msg = err instanceof Error ? err.message : String(err);
      yield { type: "error", error: `Cannot connect to ${url}: ${msg}` };
      yield { type: "done" };
      return;
    }

    clearTimeout(timeout);

    if (!response.ok) {
      let detail = response.statusText;
      try { const t = await response.text(); if (t) detail = t.slice(0, 300); } catch {}
      yield { type: "error", error: `OpenAI-compatible gateway returned ${response.status}: ${detail}` };
      yield { type: "done" };
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield { type: "error", error: "Empty response body" };
      yield { type: "done" };
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let rawBody = "";

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
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(":")) continue;
          if (!trimmed.startsWith("data:")) continue;

          const data = trimmed.startsWith("data: ") ? trimmed.slice(6) : trimmed.slice(5);
          if (data.trim() === "[DONE]") {
            yield { type: "done" };
            return;
          }

          try {
            const parsed = JSON.parse(data.trim());
            const delta = parsed?.choices?.[0]?.delta;
            if (delta?.content) {
              yield { type: "content", content: delta.content };
            }
            if (parsed?.choices?.[0]?.finish_reason === "stop") {
              yield { type: "done" };
              return;
            }
          } catch {
            // skip malformed lines
          }
        }
      }

      const fallback = this.parseFallbackResponse(rawBody);
      for (const chunk of fallback) {
        yield chunk;
        if (chunk.type === "done") return;
      }
    } catch (err) {
      yield { type: "error", error: err instanceof Error ? err.message : "Stream read error" };
    } finally {
      reader.releaseLock();
    }

    yield { type: "done" };
  }

  async healthCheck(agent: Agent): Promise<HealthCheckResponse> {
    const config = this.parseConfig(agent);
    const base = `${agent.connection_url.replace(/\/+$/, "")}`;
    const start = Date.now();
    const endpoints = ["/v1/models", "/v1/health", "/health", "/v1/status"];
    const headers: Record<string, string> = {};
    if (config.api_key) headers["Authorization"] = `Bearer ${config.api_key}`;

    for (const endpoint of endpoints) {
      try {
        const url = `${base}${endpoint}`;
        const res = await fetch(url, { headers, signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          return {
            status: "ok",
            agent_name: agent.name,
            latency_ms: Date.now() - start,
          };
        }

        if (res.status !== 404 && res.status !== 405) {
          return { status: "error", agent_name: agent.name, latency_ms: Date.now() - start };
        }
      } catch {
        // Try next endpoint on network/connectivity failures where fallback might still pass.
        continue;
      }
    }

    return { status: "error", agent_name: agent.name, latency_ms: Date.now() - start };
  }

  private parseFallbackResponse(payload: string): AgentResponseChunk[] {
    const chunks: AgentResponseChunk[] = [];
    const raw = payload.trim();
    if (!raw) return chunks;

    const pushParsed = (parsed: unknown) => {
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          const chunk = this.parsePayloadObject(item);
          if (chunk) chunks.push(chunk);
        }
        return;
      }
      const chunk = this.parsePayloadObject(parsed);
      if (chunk) chunks.push(chunk);
    };

    for (const rawLine of raw.split("\n")) {
      const line = rawLine.trim();
      if (!line) continue;
      const payloadLine = line.startsWith("data:") ? line.slice(line.indexOf(":") + 1).trim() : line;
      if (!payloadLine) continue;

      try {
        const parsed = JSON.parse(payloadLine) as unknown;
        pushParsed(parsed);
      } catch {
        chunks.push({ type: "content", content: line });
      }
    }

    return chunks;
  }

  private parsePayloadObject(parsed: unknown): AgentResponseChunk | null {
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const parsedObj = parsed as Record<string, unknown>;

    if (Array.isArray(parsedObj.choices)) {
      const first = (parsedObj.choices as { delta?: { content?: string }; message?: { content?: string }; finish_reason?: string }[])[0];
      if (first?.delta?.content && typeof first.delta.content === "string") {
        return { type: "content", content: first.delta.content };
      }
      if (first?.message?.content && typeof first.message.content === "string") {
        return { type: "content", content: first.message.content };
      }
      if (first?.finish_reason === "stop") {
        return { type: "done" };
      }
    }

    if (typeof parsedObj.error === "string") {
      return { type: "error", error: parsedObj.error };
    }

    if (typeof parsedObj.content === "string") {
      return { type: "content", content: parsedObj.content };
    }

    if (typeof parsedObj.type === "string") {
      const valid: AgentResponseChunk["type"][] = ["content", "error", "done"];
      if (!valid.includes(parsedObj.type as AgentResponseChunk["type"])) {
        return null;
      }

      const type = parsedObj.type as AgentResponseChunk["type"];
      switch (type) {
        case "content":
          if (typeof parsedObj.content === "string") return { type, content: parsedObj.content };
          return null;
        case "error":
          if (typeof parsedObj.error === "string") return { type, error: parsedObj.error };
          return null;
        case "done":
          return { type };
        default:
          return null;
      }
    }

    return null;
  }
}

function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) { controller.abort(signal.reason); return controller.signal; }
    signal.addEventListener("abort", () => controller.abort(signal.reason), { once: true });
  }
  return controller.signal;
}

const openaiCompatMeta: AdapterMeta = {
  type: "openai-compat",
  displayName: "OpenAI Compatible",
  description: "Connect to any OpenAI-compatible API (LiteLLM, vLLM, Ollama, LocalAI, etc.)",
  defaultUrl: "http://localhost:11434",
  configFields: [
    { key: "api_key", label: "API Key", type: "password", required: false, placeholder: "sk-..." },
    { key: "model", label: "Model", type: "string", required: false, placeholder: "gpt-4o" },
    { key: "system_prompt", label: "System Prompt", type: "string", required: false, placeholder: "Optional system prompt" },
    { key: "timeout_ms", label: "Timeout (ms)", type: "number", required: false, placeholder: "60000", default: 60000 },
  ],
  capabilities: { streaming: true, toolCalls: false, healthCheck: true },
};

registerAdapter(openaiCompatMeta, () => new OpenAICompatAdapter());
