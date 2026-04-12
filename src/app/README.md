Next.js App Router — pages and HTTP endpoints.

```
app/
├── (dashboard)/       ← Route group: every URL under this folder (e.g. /chat,
│                        /agents, /settings) uses the layout.tsx in this folder.
│                        The "(dashboard)" segment is NOT part of the URL.
├── api/               ← HTTP API routes. See api/README.md for the full map.
├── layout.tsx         ← Root layout — <html>, <body>, fonts, <Toaster />, …
├── globals.css        ← Tailwind import + CSS variables + animations.
├── fonts/             ← Self-hosted fonts (@font-face).
└── not-found.tsx      ← 404 page.
```

## Pages (under `(dashboard)/`)

Each folder is a URL segment. The `page.tsx` inside it is what renders at that
URL. If you see a `[id]` folder, that's a dynamic route parameter.

| Folder               | URL                    | What it is                              |
|----------------------|------------------------|------------------------------------------|
| (root)               | `/`                    | Mission control / home.                  |
| `chat/[id]`          | `/chat/<id>`           | A single conversation view.              |
| `agents`             | `/agents`              | Agent list + create.                     |
| `agents/[id]`        | `/agents/<id>`         | Agent detail / edit.                     |
| `arena`              | `/arena`               | Head-to-head evaluation.                 |
| `knowledge`          | `/knowledge`           | Knowledge bases + documents.             |
| `memory`             | `/memory`              | Shared cross-agent memory.               |
| `personas`           | `/personas`            | Persona library.                         |
| `playground`         | `/playground`          | Prompt test bed.                         |
| `templates`          | `/templates`           | Conversation templates.                  |
| `workflows`          | `/workflows`           | Visual workflow builder.                 |
| `fleet`              | `/fleet`               | Fleet health dashboard.                  |
| `analytics`          | `/analytics`           | Charts & usage stats.                    |
| `insights`           | `/insights`            | Feedback insights.                       |
| `monitoring`         | `/monitoring`          | Live status.                             |
| `traces`             | `/traces`              | Execution trace viewer.                  |
| `webhooks`           | `/webhooks`            | Webhook config.                          |
| `integrations`       | `/integrations`        | Third-party connectors.                  |
| `scheduled-tasks`    | `/scheduled-tasks`     | Cron-like scheduled agent runs.          |
| `api-keys`           | `/api-keys`            | External API keys.                       |
| `a2a`                | `/a2a`                 | A2A agent card publishing.               |
| `guardrails`         | `/guardrails`          | Content filtering rules.                 |
| `policies`           | `/policies`            | Runtime action policies.                 |
| `groups`             | `/groups`              | Group conversation management.           |
| `search`             | `/search`              | Global search.                           |
| `settings`           | `/settings`            | User & app settings.                     |
| `admin`              | `/admin`               | Admin panel (RBAC).                      |

## A page consists of…

- `page.tsx` — the React component that renders at this URL.
- `loading.tsx` — shown while `page.tsx`'s suspense boundary waits.
- `error.tsx` — catches thrown errors inside the segment.
- `layout.tsx` — wraps all routes inside this segment (inherits from parent).

## Conventions

- Pages are client components by default in this app — they open with
  `"use client"`. Data is fetched through `@/lib/frontend/api` rather than
  in server components, so that the live Zustand store stays authoritative.
- `params` is a `Promise` in Next.js 16 — always `await params` before using it.
- Keep page files lean: extract the rendering into `@/components/<feature>/`
  and have the `page.tsx` be mostly a thin composition.
