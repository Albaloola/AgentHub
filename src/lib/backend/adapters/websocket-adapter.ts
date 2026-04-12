import type { Agent, AgentMessage, AgentResponseChunk, HealthCheckResponse } from "@/lib/shared/types";
import type { GatewayAdapter, AdapterMeta } from "./base";
import { registerAdapter } from "./base";

/**
 * WebSocket Adapter — connects to agents that communicate via bidirectional WebSocket.
 *
 * Expected protocol:
 *   Connect to ws(s)://...
 *   Send: JSON AgentMessage
 *   Receive: JSON AgentResponseChunk messages until type === "done"
 *
 * Health check: attempts to open a connection and immediately closes.
 */
export class WebSocketAdapter implements GatewayAdapter {
  async *sendMessage(
    agent: Agent,
    message: AgentMessage,
    signal?: AbortSignal,
  ): AsyncIterable<AgentResponseChunk> {
    const config = JSON.parse(agent.connection_config) as {
      auth_token?: string;
    };

    // Convert http(s) to ws(s) if needed
    let wsUrl = agent.connection_url;
    if (wsUrl.startsWith("http://")) wsUrl = wsUrl.replace("http://", "ws://");
    if (wsUrl.startsWith("https://")) wsUrl = wsUrl.replace("https://", "wss://");

    if (typeof WebSocket === "undefined") {
      yield { type: "error", error: "WebSocket not available in this runtime. Use the Hermes or OpenAI-compatible adapter instead." };
      yield { type: "done" };
      return;
    }

    const ws = new WebSocket(wsUrl);
    const chunks: AgentResponseChunk[] = [];
    let done = false;
    let error: string | null = null;

    const resolvers: (() => void)[] = [];

    ws.onopen = () => {
      const payload: Record<string, unknown> = { ...message };
      if (config.auth_token) {
        payload.auth_token = config.auth_token;
      }
      ws.send(JSON.stringify(payload));
    };

    ws.onmessage = (event) => {
      try {
        const chunk = JSON.parse(String(event.data)) as AgentResponseChunk;
        chunks.push(chunk);
        if (chunk.type === "done") done = true;
      } catch {
        chunks.push({ type: "content", content: String(event.data) });
      }
      resolvers.shift()?.();
    };

    ws.onerror = () => {
      error = "WebSocket connection error";
      resolvers.shift()?.();
    };

    ws.onclose = () => {
      done = true;
      resolvers.shift()?.();
    };

    signal?.addEventListener("abort", () => {
      ws.close();
      done = true;
      resolvers.shift()?.();
    }, { once: true });

    try {
      while (!done && !error) {
        if (chunks.length === 0) {
          await new Promise<void>((resolve) => {
            resolvers.push(resolve);
          });
        }

        while (chunks.length > 0) {
          yield chunks.shift()!;
        }
      }

      if (error) {
        yield { type: "error", error };
        yield { type: "done" };
      }
    } finally {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    }
  }

  async healthCheck(agent: Agent): Promise<HealthCheckResponse> {
    const start = Date.now();

    try {
      const httpUrl = agent.connection_url
        .replace("ws://", "http://")
        .replace("wss://", "https://");

      const res = await fetch(`${httpUrl}/health`, {
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

// === Registration ===

export const websocketMeta: AdapterMeta = {
  type: "websocket",
  displayName: "WebSocket",
  description: "Connect to agents via bidirectional WebSocket",
  defaultUrl: "ws://localhost:9090",
  configFields: [
    { key: "auth_token", label: "Auth Token", type: "password", required: false, placeholder: "Bearer token" },
  ],
  capabilities: { streaming: true, toolCalls: true, healthCheck: true },
  maxContextTokens: 4096,
  contextReset: true,
};

registerAdapter(websocketMeta, () => new WebSocketAdapter());
