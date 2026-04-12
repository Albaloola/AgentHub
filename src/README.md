Source map for AgentHub.

```
src/
├── app/              ← Next.js App Router. Pages + API routes live here.
│   ├── (dashboard)/  ← All user-facing pages (route group; the parens hide
│   │                   the segment from the URL). One folder per page.
│   ├── api/          ← HTTP API endpoints. One folder per resource.
│   ├── layout.tsx    ← Root layout — fonts, providers, global CSS.
│   ├── globals.css   ← Tailwind + base styles + CSS variables.
│   ├── fonts/        ← Self-hosted fonts.
│   └── not-found.tsx
│
├── components/       ← React components, organised by feature area.
│   ├── ui/           ← shadcn primitives (button, dialog, tooltip, …).
│   ├── layout/       ← App shell — sidebar, topbar, tabs.
│   ├── chat/         ← Chat view — message list, composer, artifacts, traces.
│   ├── agents/       ← Agent management UI.
│   ├── workflows/    ← Visual workflow builder.
│   ├── analytics/    ← Charts and stat cards.
│   └── … one folder per feature (settings, search, whiteboard, etc.)
│
└── lib/              ← Non-component code. Split by layer:
    ├── frontend/     ← Runs in the browser. API client, store, hooks, themes.
    ├── backend/      ← Runs on the server. SQLite, adapters, runtime paths.
    ├── shared/       ← Safe for both sides. Types + constants, no side effects.
    └── README.md     ← Detailed layer-level navigation guide.
```

## How requests flow

```
User action                                     Data layer
───────────                                     ──────────
     ▼
React component ─(a)→ @/lib/frontend/api ─(b)→ /api/<route>/route.ts ─(c)→ @/lib/backend/db
     ▲                     (typed fetch)          (HTTP handler)              (SQLite)
     │                                                  │
     └────────────── JSON / SSE response  ◄─────────────┘

(a) Components call api functions directly — never fetch from components.
(b) API functions hit the Next.js API route handlers (server side).
(c) Handlers query SQLite via the `db` proxy; for agent calls they use
    `@/lib/backend/adapters`.
```

## Adding a new feature — where do the pieces go?

| Piece                                                          | Where                                   |
|----------------------------------------------------------------|-----------------------------------------|
| A new database table or column                                 | `lib/backend/db/schema.ts` + `migrations.ts` |
| A new REST endpoint                                            | `app/api/<resource>/route.ts`          |
| A typed client to call that endpoint from the UI               | `lib/frontend/api/<domain>.ts`          |
| A shared TypeScript type for request/response/row shape        | `lib/shared/types/<domain>.ts`          |
| A dashboard page                                               | `app/(dashboard)/<slug>/page.tsx`       |
| React components used by that page                             | `components/<feature>/<name>.tsx`       |
| A new left-rail link                                           | `components/layout/sidebar.tsx` → `NAV_CATEGORIES` |
| A new agent gateway protocol                                   | `lib/backend/adapters/<name>.ts` + register in `index.ts` |
| A theme or colour tweak                                        | `lib/frontend/themes.ts` + `app/globals.css` |

## Rules of the road

- **Never import `@/lib/backend/*` from a component or page.** It pulls
  `better-sqlite3` and other Node APIs and will break the browser bundle.
- **Never import `@/lib/frontend/*` from a backend route handler.** Those
  files start with `"use client"` and the React/Zustand runtime has no place
  on the server.
- `@/lib/shared/*` is always safe.
- Components use absolute imports (`@/components/...`, `@/lib/...`). Reserve
  relative imports for same-folder siblings.
