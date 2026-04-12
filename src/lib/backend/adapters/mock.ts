import type { Agent, AgentMessage, AgentResponseChunk, HealthCheckResponse } from "@/lib/shared/types";
import type { GatewayAdapter, AdapterMeta } from "./base";
import { registerAdapter } from "./base";

export class MockAdapter implements GatewayAdapter {
  async *sendMessage(
    agent: Agent,
    message: AgentMessage,
    signal?: AbortSignal,
  ): AsyncIterable<AgentResponseChunk> {
    const config = JSON.parse(agent.connection_config) as {
      delay_ms?: number;
      echo?: boolean;
    };
    const delay = config.delay_ms ?? 50;
    const echo = config.echo ?? true;

    // Simulate a tool call
    const toolCallId = crypto.randomUUID();
    yield {
      type: "tool_call",
      tool_call_id: toolCallId,
      tool_name: "echo_processor",
      tool_input: { message: message.content, mode: echo ? "echo" : "generate" },
    };

    await sleep(delay * 2, signal);

    yield {
      type: "tool_result",
      tool_call_id: toolCallId,
      tool_name: "echo_processor",
      tool_output: { processed: true, length: message.content.length },
    };

    // Stream the response word by word
    const responseText = echo
      ? `${message.content}\n\n*(Echoed by ${agent.name} — a mock agent for testing AgentHub connections.)*`
      : generateMockResponse(message.content, agent.name);

    const words = responseText.split(" ");
    for (const word of words) {
      if (signal?.aborted) return;
      await sleep(delay, signal);
      yield { type: "content", content: word + " " };
    }

    yield { type: "done" };
  }

  async healthCheck(agent: Agent): Promise<HealthCheckResponse> {
    return {
      status: "ok",
      agent_name: agent.name,
      latency_ms: Math.floor(Math.random() * 20) + 5,
    };
  }
}

function generateMockResponse(input: string, agentName: string): string {
  const responses = [
    `I'm **${agentName}**, a mock agent. You said: "${input.slice(0, 60)}${input.length > 60 ? "..." : ""}"\n\nI'm here to test the AgentHub connection pipeline. In production, I'd be replaced by a real agent gateway.`,
    `**Mock response from ${agentName}**\n\nReceived your message (${input.length} characters). Here's a code sample to test rendering:\n\n\`\`\`typescript\nconst response = await agent.process({\n  input: "${input.slice(0, 30)}...",\n  timestamp: new Date().toISOString()\n});\n\`\`\`\n\nEverything is working correctly!`,
    `Hello from **${agentName}**!\n\nI processed your request through the mock adapter pipeline:\n\n1. Message received\n2. Tool call simulated\n3. Response generated\n\nThe AgentHub routing layer is functioning as expected.`,
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    }, { once: true });
  });
}

// === Registration ===

export const mockMeta: AdapterMeta = {
  type: "mock",
  displayName: "Mock",
  description: "Built-in mock adapter for testing — always online, echoes messages",
  defaultUrl: "mock://echo",
  configFields: [
    { key: "delay_ms", label: "Response Delay (ms)", type: "number", required: false, placeholder: "50", default: 50 },
    { key: "echo", label: "Echo Mode", type: "boolean", required: false, default: true, description: "Echo back the user message, or generate a random response" },
  ],
  capabilities: { streaming: true, toolCalls: true, healthCheck: true, thinking: true, subagents: true, commands: true },
  commands: [
    { name: "/help", description: "Show available commands" },
    { name: "/clear", description: "Clear conversation context" },
  ],
  maxContextTokens: 4096,
  contextReset: true,
};

registerAdapter(mockMeta, () => new MockAdapter());
