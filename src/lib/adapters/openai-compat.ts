import type { Agent, AgentMessage, AgentResponseChunk, HealthCheckResponse } from "../types";
import type { GatewayAdapter, AdapterMeta } from "./base";
import { registerAdapter } from "./base";

interface OpenAIDelta {
  role?: string;
  content?: string;
  tool_calls?: {
    index: number;
    id?: string;
    function?: { name?: string; arguments?: string };
  }[];
}

interface OpenAIStreamChunk {
  choices: { delta: OpenAIDelta; finish_reason: string | null }[];
}

/**
 * OpenAI-Compatible Adapter — connects to any gateway that implements the
 * OpenAI Chat Completions streaming format.
 *
 * Expected API:
 *   POST /v1/chat/completions   — send messages, receive SSE stream
 *   GET  /v1/models             — health/capability check
 */
export class OpenAICompatAdapter implements GatewayAdapter {
  async *sendMessage(
    agent: Agent,
    message: AgentMessage,
    signal?: AbortSignal,
  ): AsyncIterable<AgentResponseChunk> {
    const config = JSON.parse(agent.connection_config) as {
      api_key?: string;
      model?: string;
      system_prompt?: string;
    };

    const url = `${agent.connection_url}/v1/chat/completions`;
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
    };
    if (config.api_key) {
      headers["Authorization"] = `Bearer ${config.api_key}`;
    }

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
        signal,
      });
    } catch (err) {
      yield { type: "error", error: classifyFetchError(err, url) };
      yield { type: "done" };
      return;
    }

    if (!response.ok) {
      let detail = response.statusText;
      try {
        const body = await response.text();
        if (body) detail = body.slice(0, 200);
      } catch { /* ignore */ }
      yield { type: "error", error: `Gateway returned ${response.status}: ${detail}` };
      yield { type: "done" };
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield { type: "error", error: "No response body" };
      yield { type: "done" };
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";
    const toolCallBuffers = new Map<number, { id: string; name: string; args: string }>();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") {
            // Flush any pending tool calls
            for (const [, tc] of toolCallBuffers) {
              try {
                yield {
                  type: "tool_call",
                  tool_call_id: tc.id,
                  tool_name: tc.name,
                  tool_input: JSON.parse(tc.args || "{}"),
                };
              } catch {
                yield {
                  type: "tool_call",
                  tool_call_id: tc.id,
                  tool_name: tc.name,
                  tool_input: { raw: tc.args },
                };
              }
            }
            yield { type: "done" };
            return;
          }

          try {
            const chunk = JSON.parse(data) as OpenAIStreamChunk;
            const choice = chunk.choices[0];
            if (!choice) continue;

            const delta = choice.delta;

            if (delta.content) {
              yield { type: "content", content: delta.content };
            }

            if (delta.tool_calls) {
              for (const tc of delta.tool_calls) {
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
            }

            if (choice.finish_reason === "stop") {
              yield { type: "done" };
              return;
            }
          } catch {
            // Skip malformed chunks
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    yield { type: "done" };
  }

  async healthCheck(agent: Agent): Promise<HealthCheckResponse> {
    const config = JSON.parse(agent.connection_config) as { api_key?: string };
    const start = Date.now();

    try {
      const headers: Record<string, string> = {};
      if (config.api_key) {
        headers["Authorization"] = `Bearer ${config.api_key}`;
      }

      const res = await fetch(`${agent.connection_url}/v1/models`, {
        headers,
        signal: AbortSignal.timeout(5000),
      });

      return {
        status: res.ok ? "ok" : "error",
        agent_name: agent.name,
        latency_ms: Date.now() - start,
      };
    } catch {
      return { status: "error", agent_name: agent.name, latency_ms: Date.now() - start };
    }
  }
}

function classifyFetchError(err: unknown, url: string): string {
  if (err instanceof TypeError) {
    const msg = (err as Error).message ?? "";
    if (msg.includes("fetch failed") || msg.includes("ECONNREFUSED")) {
      return `Cannot connect to gateway at ${url} — is it running?`;
    }
    return `Network error connecting to ${url}: ${msg}`;
  }
  return `Failed to connect to ${url}: ${err instanceof Error ? err.message : String(err)}`;
}

// === Registration ===

export const openaiCompatMeta: AdapterMeta = {
  type: "openai-compat",
  displayName: "OpenAI Compatible",
  description: "Connect to any gateway implementing the OpenAI Chat Completions streaming format",
  defaultUrl: "http://localhost:11434",
  configFields: [
    { key: "api_key", label: "API Key", type: "password", required: false, placeholder: "sk-..." },
    { key: "model", label: "Model", type: "string", required: false, placeholder: "gpt-4" },
    { key: "system_prompt", label: "System Prompt", type: "string", required: false, placeholder: "You are a helpful assistant" },
  ],
  capabilities: { streaming: true, toolCalls: true, healthCheck: true, thinking: false },
  maxContextTokens: 8192,
  contextReset: true,
};

registerAdapter(openaiCompatMeta, () => new OpenAICompatAdapter());
