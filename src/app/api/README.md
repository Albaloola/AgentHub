HTTP API routes.

Every folder here is a path segment. Every folder contains a `route.ts` that
exports one or more HTTP method handlers (`GET`, `POST`, `PATCH`, `DELETE`).

`[id]` folders are dynamic segments — their handler receives the URL value as
`params.id`. In Next.js 16, **`params` is a Promise** — always `await` it:

```typescript
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // …
}
```

## Route map

| Resource / URL                            | Methods       | What it does                                    |
|-------------------------------------------|---------------|--------------------------------------------------|
| `/api/health`                             | GET           | Liveness probe.                                  |
| `/api/adapters`                           | GET           | List registered adapter types + config schemas.  |
| `/api/capabilities`                       | GET           | Per-agent capability snapshot.                   |
| `/api/chat`                               | POST          | **Streaming SSE chat** — the hot path.           |
| `/api/chat/regenerate`                    | POST          | Regenerate assistant response.                   |
| `/api/agents`                             | GET, POST     | List / create agents.                            |
| `/api/agents/[id]`                        | GET,PATCH,DEL | Agent CRUD.                                      |
| `/api/agents/[id]/health`                 | GET           | One-shot health check.                           |
| `/api/agents/[id]/availability`           | POST          | Toggle `is_available`.                           |
| `/api/agents/[id]/behavior`               | POST          | Set behaviour mode.                              |
| `/api/agents/[id]/routing`                | POST, PATCH   | Score a prompt / update capability weights.      |
| `/api/agents/[id]/performance`            | GET           | Performance trend data.                          |
| `/api/agents/[id]/persona`                | POST          | Apply a persona to the agent.                    |
| `/api/agents/[id]/versions[/vid]`         | CRUD          | Canary version management.                       |
| `/api/conversations`                      | GET, POST     | List / create conversations.                     |
| `/api/conversations/[id]`                 | GET,PATCH,DEL | Conversation CRUD.                               |
| `/api/conversations/[id]/branch`          | POST          | Fork a conversation at a message.                |
| `/api/conversations/[id]/checkpoints[/cid]` | CRUD        | Save points.                                     |
| `/api/conversations/[id]/compact`         | POST          | Smart-context compaction.                        |
| `/api/conversations/[id]/export`          | GET           | Download as markdown/json/html.                  |
| `/api/conversations/[id]/permissions`     | GET,POST,DEL  | Share with other users.                          |
| `/api/conversations/[id]/replay`          | GET           | Replay snapshots.                                |
| `/api/conversations/[id]/reset`           | POST          | Reset agent context.                             |
| `/api/conversations/[id]/summarize`       | POST          | Generate summary.                                |
| `/api/conversations/[id]/tags[/tagId]`    | POST, DEL     | Attach/detach tags.                              |
| `/api/conversations/[id]/whiteboard`      | GET, POST     | Conversation whiteboard.                         |
| `/api/messages`                           | GET           | List messages (filter by conversation).          |
| `/api/messages/[id]`                      | PATCH         | Edit message content.                            |
| `/api/messages/[id]/pin`                  | POST          | Toggle pin.                                      |
| `/api/messages/[id]/vote`                 | POST          | Up/down vote.                                    |
| `/api/threads`                            | POST          | Create thread reply.                             |
| `/api/threads/[id]/replies`               | GET           | Read thread.                                     |
| `/api/templates[/id]`                     | CRUD          | Conversation templates.                          |
| `/api/tags`                               | GET, POST     | Tag CRUD.                                        |
| `/api/folders[/id]`                       | CRUD          | Conversation folders.                            |
| `/api/workflows[/id]`                     | CRUD          | Workflow builder.                                |
| `/api/workflows/[id]/run`                 | POST          | Execute a workflow.                              |
| `/api/knowledge[/id]`                     | CRUD          | Knowledge bases.                                 |
| `/api/knowledge/[id]/documents[/docId]`   | CRUD          | KB documents (multipart upload on POST).         |
| `/api/memory[/id]`                        | CRUD          | Shared memory.                                   |
| `/api/personas[/id]`                      | CRUD          | Personas.                                        |
| `/api/prompts[/id]`                       | CRUD          | Prompt version history.                          |
| `/api/prompts/test`                       | POST          | Test a prompt.                                   |
| `/api/webhooks[/id]`                      | CRUD          | Webhook config.                                  |
| `/api/webhooks/[id]/events`               | GET           | Event log.                                       |
| `/api/webhooks/[id]/trigger`              | POST          | Manually fire a webhook.                         |
| `/api/scheduled-tasks[/id]`               | CRUD + run    | Cron-scheduled agent prompts.                    |
| `/api/integrations[/id]`                  | CRUD          | Third-party connectors.                          |
| `/api/external/keys[/id]`                 | CRUD          | External API keys.                               |
| `/api/external/agents[/id]/message`       | POST          | Public-API message endpoint (API-key auth).      |
| `/api/guardrails[/id]`                    | CRUD          | Guardrail rules.                                 |
| `/api/policies[/id]`                      | CRUD          | Policy rules.                                    |
| `/api/users[/id]`                         | CRUD          | User accounts.                                   |
| `/api/audit`                              | GET           | Audit log.                                       |
| `/api/traces[/id]`                        | GET           | Execution traces.                                |
| `/api/anomalies[/id]`                     | GET, PATCH    | Anomaly events.                                  |
| `/api/feedback`                           | GET           | Aggregated feedback insights.                    |
| `/api/topics`                             | GET           | Topic clusters.                                  |
| `/api/arena[/id]`                         | CRUD          | Arena rounds.                                    |
| `/api/arena/leaderboard`                  | GET           | Agent win rates.                                 |
| `/api/cache`                              | GET, DELETE   | Response cache stats & clear.                    |
| `/api/settings`                           | GET, PUT      | String/string setting store.                     |
| `/api/theme`                              | GET, PATCH    | Theme preferences.                               |
| `/api/onboarding`                         | GET, POST     | Onboarding state.                                |
| `/api/a2a[/id]`                           | CRUD          | A2A agent cards.                                 |
| `/api/upload`                             | POST          | Message attachment upload.                       |
| `/api/uploads/[filename]`                 | GET           | Serve uploaded file.                             |
| `/api/notifications[/id]`                 | CRUD + bulk   | Notifications.                                   |

## Conventions

- Use `NextResponse.json(...)` (or `Response`) to return — not `res.send`.
- Grab the DB with `import { db } from "@/lib/backend/db";` — no local handles.
- Convert SQLite integer booleans with `toBooleans(row)` from the same barrel.
- For agent calls, use `createAdapter(agent.gateway_type)` from
  `@/lib/backend/adapters`.
- Handler functions must be exported by HTTP-method name (`GET`, `POST`, …).
