# AgentHub — developer map

This file is the starting point for anyone (human or AI) joining the codebase.
Read this first; then follow the links to the relevant README.

## What this app is

Self-hosted multi-agent dashboard. It is a **pure presentation and routing layer**
— it does not run models. It connects to external agent gateways (Hermes,
OpenClaw, OpenAI-compatible APIs, WebSocket endpoints, custom adapters) and
gives you a unified UI to manage them, chat with them, orchestrate them,
observe their traces, and govern their behaviour.

Stack: Next.js 16 App Router, TypeScript (strict), SQLite via `better-sqlite3`
(WAL mode), Tailwind 4 + shadcn/base-ui, Zustand, SSE streaming, Electron 35.

## Where to start

The tree is organised into three layers so you can work on the UI without
touching the backend and vice versa:

```
src/
├── app/          ← Next.js pages (in (dashboard)/) and API routes (in api/).
├── components/   ← Pure frontend — shadcn primitives + feature components.
└── lib/
    ├── frontend/ ← Runs in the browser. API client, Zustand store, themes.
    ├── backend/  ← Runs on the server. SQLite, adapters, runtime paths.
    └── shared/   ← Safe for both sides. Pure types + constants.
```

Every one of those folders has a `README.md` inside that explains what's in it
and how to add things. The full map is at [`src/README.md`](src/README.md).

## How one request flows

```
┌──────────────────┐   1   ┌────────────────────────┐   2   ┌──────────────────┐
│ React component  │ ───→  │ @/lib/frontend/api/*   │ ───→  │ /api/<route>     │
│ (e.g. chat view) │       │ (typed fetch wrappers) │       │ (route.ts)       │
└──────────────────┘       └────────────────────────┘       └────────┬─────────┘
         ▲                                                           │
         │ 6. render                             3. db query          ▼
         │                                    ┌──────────────────┐   4   ┌──────────────────┐
         │                              ←──── │ @/lib/backend/db │ ←──── │  SQLite (WAL)    │
         │                                    └──────────────────┘       └──────────────────┘
         │
         │ 5. JSON / SSE
         │    callbacks
         │
         └──────────────────────────────── Returned by route.ts
```

For streaming chat, step 5 uses Server-Sent Events — see
[`@/lib/frontend/api/chat.ts`](src/lib/frontend/api/chat.ts) for the parser.

## Key conventions

| Rule                                                       | Why                                                |
|------------------------------------------------------------|----------------------------------------------------|
| Never import `@/lib/backend/*` from a component or page    | Pulls `better-sqlite3` into the browser bundle     |
| Never import `@/lib/frontend/*` from a server route        | Those files are `"use client"` + browser APIs      |
| `@/lib/shared/*` is always safe                            | Pure types, no runtime                             |
| `params` is a `Promise` in Next.js 16 — always `await` it  | App Router v16 change                              |
| Select `onValueChange` receives `string \| null`           | base-ui behaviour; check for null                  |
| base-ui components: no `asChild` prop                      | base-ui doesn't use it                             |
| **Don't leave multiple dev servers running**               | RAM pressure — past incident took down this PC     |
| Don't `npm install` from `$HOME` — cd into the project    | Same past incident                                 |

## Adding things — quick reference

| Add a…                              | Location                                                |
|--------------------------------------|---------------------------------------------------------|
| New database column                  | `src/lib/backend/db/schema.ts` + `migrations.ts`        |
| New API endpoint                     | `src/app/api/<resource>/route.ts`                       |
| Typed client for that endpoint       | `src/lib/frontend/api/<domain>.ts`                      |
| New shared type                      | `src/lib/shared/types/<domain>.ts`                      |
| New dashboard page                   | `src/app/(dashboard)/<slug>/page.tsx`                   |
| New components for that page         | `src/components/<feature>/<name>.tsx`                   |
| New left-rail nav link               | `src/components/layout/sidebar.tsx → NAV_CATEGORIES`    |
| New agent gateway protocol           | `src/lib/backend/adapters/<name>.ts`                    |
| New theme                            | `src/lib/frontend/themes.ts`                            |
| New Zustand slice                    | `src/lib/frontend/store.ts` (has a TOC banner at top)   |

## The file layout used to be flat

`src/lib/` used to be a single-level directory with a 1000-line `api.ts`, an
860-line `db.ts`, a 683-line `types.ts`, and 7 other files with no separation
between browser and server code. Those files are now **shims** that re-export
from the new layered structure — so every existing import like
`import { getAgents } from "@/lib/api"` still works. New code should use the
new paths (`@/lib/frontend/api`, `@/lib/backend/db`, `@/lib/shared/types`).

See [`src/lib/README.md`](src/lib/README.md) for the full layer layout.

## Verify your changes

```bash
npx tsc --noEmit    # must be clean
npx eslint src      # must be clean
npm run build       # for production builds
```

**Do not** run `npm run dev` if another dev server is already running.
