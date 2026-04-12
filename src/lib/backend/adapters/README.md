Gateway adapters — the plug-in layer that translates AgentHub's internal
`AgentMessage` / `AgentResponseChunk` protocol (see
`@/lib/shared/types/adapter-protocol.ts`) into whatever a specific external
agent gateway understands.

## How adapters are wired up

Each adapter file calls `registerAdapter("<gateway_type>", { ... })` at module
load. `index.ts` imports every adapter file eagerly, which triggers those
registrations. After that, `createAdapter(agent.gateway_type)` returns the
right adapter for any agent.

```
base.ts              — registry (register / create / getMeta)
hermes.ts            — local CLI agent (spawns a python venv process)
openclaw.ts          — OpenClaw (OpenAI-compatible, token auth, localhost)
openai-compat.ts     — generic OpenAI-compatible endpoints
websocket-adapter.ts — WebSocket-streaming gateways
mock.ts              — in-process echo bot for testing
index.ts             — imports each file for side-effect registration
```

## Adding a new adapter

1. Create `my-gateway.ts` in this folder.
2. Implement `sendMessage(msg: AgentMessage): AsyncGenerator<AgentResponseChunk>`
   and `healthCheck(agent: Agent): Promise<HealthCheckResponse>`.
3. Call `registerAdapter("my-gateway", { displayName, description, … })` at
   module scope.
4. Add `import "./my-gateway";` to `index.ts`.
5. Add `"my-gateway": "My Gateway"` to `GATEWAY_LABELS` in
   `@/lib/shared/types/core.ts`.

See `docs/ADDING_AN_ADAPTER.md` in the project root for a longer walkthrough
with code snippets.
