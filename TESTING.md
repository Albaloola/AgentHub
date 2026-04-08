# AgentHub Testing Guide

## Quick Start — Mock Adapter (No Setup Required)

The Mock adapter works immediately with no external services. Start the dev server:

```bash
npm run dev
```

1. Open http://localhost:3000
2. The **Echo Bot** agent is pre-seeded and always online
3. Click the Echo Bot conversation (or create a new one from the Dashboard)
4. Send any message — you'll see:
   - A `echo_processor` tool call appear as an expandable pill
   - The response stream in word-by-word
   - Click the **Tools** button in the chat header to open the inspection panel

### What to verify with Mock:
- [x] Agent shows green "online" status on Agents page
- [x] Health check button returns OK with <20ms latency
- [x] Sending a message streams content word-by-word
- [x] Tool call pill appears with "success" badge
- [x] Expanding the tool call shows input/output JSON
- [x] Tool panel (sidebar) shows all tool calls
- [x] Cancel button (red square) stops the stream mid-response
- [x] Multiple messages maintain conversation history

## Testing with a Real Hermes Instance

### Prerequisites
You need a running Hermes agent gateway accessible via HTTP.

### Setup
1. Go to **Agents** page → click **Register Agent** (or edit the pre-seeded Hermes agent)
2. Fill in:
   - **Name**: Your Hermes agent name
   - **Gateway Type**: Hermes
   - **Connection URL**: e.g., `http://localhost:8080`
   - **Auth Token**: If your Hermes instance requires authentication
3. Click the health check button (refresh icon) — should turn green

### Expected Hermes API endpoints:
- `POST /api/chat` — Accepts AgentMessage JSON, returns SSE stream
- `GET /api/health` — Returns `{ "status": "ok" }` (or 200 with any body)

### What to verify:
- [ ] Health check shows "online" with latency measurement
- [ ] Sending a message receives a streamed response
- [ ] Tool calls (if the agent uses tools) appear as expandable pills
- [ ] Error message is shown if the gateway is down (not a blank/hanging state)
- [ ] The connection URL in the agent card shows correctly

### Troubleshooting:
- **"Cannot connect to Hermes"** → Check the URL, ensure the gateway is running
- **"Hermes returned 401"** → Set the auth_token in the adapter config
- **No response** → Check if Hermes responds to `curl -X POST http://localhost:8080/api/chat`
- **Garbled output** → Hermes may not be returning SSE format; the adapter will try to treat non-JSON as plain text

## Testing with a Real OpenClaw Instance

### Setup
1. Go to **Agents** page → edit the pre-seeded OpenClaw agent (or register a new one)
2. Fill in:
   - **Gateway Type**: OpenClaw
   - **Connection URL**: e.g., `http://localhost:8090`
   - **API Key**: If required
   - **Request Format**: "native" (AgentHub format) or "openai" (OpenAI-compatible)
3. Run health check

### Expected OpenClaw API endpoints:
- `POST /v1/chat` — Accepts messages, returns SSE stream
- `GET /v1/status` — Returns status JSON (or 200)

### Request Format options:
- **native**: Sends `AgentMessage` directly (conversation_id, content, history)
- **openai**: Sends OpenAI-compatible `{ model, messages, stream: true }`

The response format is auto-detected:
- If the SSE chunks contain `{"choices":[{"delta":...}]}` → parsed as OpenAI format
- If the SSE chunks contain `{"type":"content","content":"..."}` → parsed as native format

### What to verify:
- [ ] Health check shows "online"
- [ ] Messages stream correctly in either format
- [ ] Tool calls display if the agent reports them
- [ ] The auto-format detection picks up the right format

## Testing Group Chats

1. Ensure at least 2 agents are registered and active
2. Go to **Group Chats** page
3. Select agents and choose a response mode:
   - **Discussion**: Agents respond sequentially, each seeing previous responses
   - **Parallel**: All agents respond simultaneously
   - **Targeted**: Use the dropdown in the chat input to address specific agents

### What to verify:
- [ ] All selected agents appear in the chat header
- [ ] In Discussion mode, agents respond one after another
- [ ] In Parallel mode, multiple agents respond (order may vary)
- [ ] In Targeted mode, the dropdown selector works and only the targeted agent responds
- [ ] Each agent's messages show with their avatar/name
- [ ] Tool calls from different agents are distinguishable in the panel

## Testing the Adapter Registry

### API Test
```bash
# List all registered adapters with their metadata
curl -s http://localhost:3000/api/adapters | python3 -m json.tool
```

Expected: Array of adapter metadata objects with type, displayName, configFields, etc.

### UI Test
1. Click **Register Agent**
2. Change the **Gateway Type** dropdown
3. Verify:
   - The connection URL pre-fills with the adapter's default
   - The config section shows fields specific to that adapter type
   - The description text updates below the dropdown

## Testing Error Handling

### Connection refused
1. Set an agent's URL to a port with nothing running (e.g., `http://localhost:19999`)
2. Try to chat → should see an error like "Cannot connect to ... — is the gateway running?"
3. Health check should show red "error" status

### Timeout
1. Set an agent's timeout_ms config to 1 (1ms)
2. Try to chat → should see a timeout error
3. Reset to a reasonable value (30000)

### Invalid auth
1. Set a wrong auth_token for an agent that requires it
2. Health check should report the error status
3. Chat should show the HTTP status code in the error message

## Testing the Settings Page

1. Go to **Settings**
2. **Export Agent Configs** → downloads `agenthub-agents.json`
3. Delete all agents, then **Import Agent Configs** → re-creates them
4. **Export Conversation History** → downloads all messages with tool calls

## API Smoke Tests

Quick verification via curl:

```bash
# Agents
curl -s http://localhost:3000/api/agents | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'{len(d)} agents')"

# Adapters
curl -s http://localhost:3000/api/adapters | python3 -c "import sys,json; d=json.load(sys.stdin); [print(f'  {a[\"type\"]}: {a[\"displayName\"]}') for a in d]"

# Conversations
curl -s http://localhost:3000/api/conversations | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'{len(d)} conversations')"

# Chat with mock (get a conversation ID first)
CONV_ID=$(curl -s http://localhost:3000/api/conversations | python3 -c "import sys,json; d=json.load(sys.stdin); print([c['id'] for c in d if c.get('name')=='Echo Bot'][0])")
curl -s -N -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d "{\"conversation_id\": \"$CONV_ID\", \"content\": \"test\"}" \
  --max-time 10 | head -10
```
