# Adding a New Adapter to AgentHub

This guide walks through creating a new adapter to connect AgentHub to a custom agent gateway.

## Overview

AgentHub uses an **adapter registry** pattern. Each adapter:
1. Implements the `GatewayAdapter` interface (two methods: `sendMessage` + `healthCheck`)
2. Defines metadata describing its configuration fields and capabilities
3. Registers itself on import via `registerAdapter()`

When the adapter file is imported in `src/lib/adapters/index.ts`, it auto-registers and becomes available in the UI.

## Step-by-Step

### 1. Create the adapter file

Create `src/lib/adapters/my-adapter.ts`:

```typescript
import type { Agent, AgentMessage, AgentResponseChunk, HealthCheckResponse } from "../types";
import type { GatewayAdapter, AdapterMeta } from "./base";
import { registerAdapter } from "./base";

export class MyAdapter implements GatewayAdapter {
  async *sendMessage(
    agent: Agent,
    message: AgentMessage,
    signal?: AbortSignal,
  ): AsyncIterable<AgentResponseChunk> {
    // 1. Parse config from agent.connection_config (JSON string)
    const config = JSON.parse(agent.connection_config) as { api_key?: string };

    // 2. Send the message to the gateway
    const response = await fetch(`${agent.connection_url}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message.content, history: message.history }),
      signal,
    });

    // 3. Handle errors
    if (!response.ok) {
      yield { type: "error", error: `Gateway returned ${response.status}` };
      yield { type: "done" };
      return;
    }

    // 4. Stream the response
    const reader = response.body?.getReader();
    if (!reader) {
      yield { type: "error", error: "Empty response body" };
      yield { type: "done" };
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") { yield { type: "done" }; return; }

        const chunk = JSON.parse(data) as AgentResponseChunk;
        yield chunk;
      }
    }

    yield { type: "done" };
  }

  async healthCheck(agent: Agent): Promise<HealthCheckResponse> {
    const start = Date.now();
    try {
      const res = await fetch(`${agent.connection_url}/health`, {
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

// Register the adapter with metadata
registerAdapter(
  {
    type: "my-adapter",                    // Unique key stored in DB
    displayName: "My Custom Adapter",      // Shown in the UI dropdown
    description: "Connects to my agent",   // Description below the dropdown
    defaultUrl: "http://localhost:9000",    // Pre-filled when selected
    configFields: [
      { key: "api_key", label: "API Key", type: "password", required: false, placeholder: "key-..." },
    ],
    capabilities: { streaming: true, toolCalls: true, healthCheck: true },
  },
  () => new MyAdapter(),
);
```

### 2. Register in the index

Add one line to `src/lib/adapters/index.ts`:

```typescript
import "./my-adapter";
```

That's it. The import triggers the `registerAdapter()` call, and the adapter is now:
- Available in the agent creation dropdown
- Its config fields render dynamically in the dialog
- `createAdapter("my-adapter")` returns an instance when routing messages

### 3. No other files to change

The system is designed so that adding an adapter only requires:
1. The adapter file itself
2. One import line in `index.ts`

No changes to types, DB schema, API routes, or UI components.

## The GatewayAdapter Interface

```typescript
interface GatewayAdapter {
  sendMessage(agent: Agent, message: AgentMessage, signal?: AbortSignal): AsyncIterable<AgentResponseChunk>;
  healthCheck(agent: Agent): Promise<HealthCheckResponse>;
}
```

### sendMessage

An async generator that yields `AgentResponseChunk` objects:

| Chunk type    | Fields                                     | When to yield                              |
|---------------|--------------------------------------------|--------------------------------------------|
| `content`     | `content: string`                          | Each piece of streamed text                |
| `tool_call`   | `tool_call_id`, `tool_name`, `tool_input`  | When the agent invokes a tool              |
| `tool_result` | `tool_call_id`, `tool_name`, `tool_output` | When a tool returns results                |
| `error`       | `error: string`                            | On any error (always follow with `done`)   |
| `done`        | *(none)*                                   | Stream is complete                         |

**Key rules:**
- Always yield `{ type: "done" }` as the final chunk (even after errors)
- Respect `signal?.aborted` for cancellation
- Wrap fetch errors with useful messages (is the gateway running? wrong URL?)
- Handle malformed JSON gracefully — skip or treat as content

### healthCheck

Returns `{ status: "ok" | "error", agent_name: string, latency_ms?: number }`.

- Use `AbortSignal.timeout(5000)` to avoid hanging
- A 200 response (even non-JSON) should return `"ok"`
- Any network error should return `"error"` with latency

## Adapter Metadata

```typescript
interface AdapterMeta {
  type: string;           // DB key, must be unique
  displayName: string;    // UI label
  description: string;    // Help text
  defaultUrl: string;     // Pre-filled URL
  configFields: AdapterConfigField[];
  capabilities: { streaming: boolean; toolCalls: boolean; healthCheck: boolean };
}

interface AdapterConfigField {
  key: string;            // JSON key in connection_config
  label: string;          // UI label
  type: "string" | "number" | "boolean" | "password" | "url";
  required: boolean;
  placeholder?: string;
  description?: string;   // Help text below the field
  default?: string | number | boolean;
}
```

Config fields are rendered dynamically in the agent creation/edit dialog. The values are stored as a JSON object in `agent.connection_config`.

## Handling Different Response Formats

If your gateway uses OpenAI-compatible streaming format, you can look at `openai-compat.ts` for how to:
- Buffer incremental `tool_calls` arguments
- Map `choices[0].delta.content` to content chunks
- Handle `finish_reason: "stop"`

If your gateway uses a completely custom format, just parse it in your `sendMessage` generator and yield the appropriate `AgentResponseChunk` objects.

## Example: Discord Bot Adapter

A hypothetical adapter for a Discord bot agent:

```typescript
registerAdapter(
  {
    type: "discord-bot",
    displayName: "Discord Bot",
    description: "Send messages to a Discord bot agent via its HTTP API",
    defaultUrl: "http://localhost:7000",
    configFields: [
      { key: "bot_token", label: "Bot Token", type: "password", required: true },
      { key: "channel_id", label: "Channel ID", type: "string", required: true, placeholder: "123456789" },
      { key: "timeout_ms", label: "Timeout (ms)", type: "number", required: false, default: 30000 },
    ],
    capabilities: { streaming: false, toolCalls: false, healthCheck: true },
  },
  () => new DiscordBotAdapter(),
);
```

This adapter might not support streaming (the bot sends a single response), so it would yield the full content as one chunk followed by `done`.
