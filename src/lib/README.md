Library code for AgentHub, organised by **layer**.

```
src/lib/
├── frontend/      ← Runs in the browser. Safe to import from React components.
│   ├── api/       ← Typed fetch wrappers that call /api/* endpoints.
│   ├── store.ts   ← Global Zustand store.
│   ├── hooks.ts   ← Shared React hooks.
│   ├── themes.ts  ← Theme definitions + CSS variable application.
│   ├── animation.ts / status-colors.ts / use-canvas-bg.ts / utils.ts
│
├── backend/       ← Runs on the server only. Never import from components/pages.
│   ├── db/        ← SQLite connection, schema, migrations, seed data.
│   ├── adapters/  ← Gateway adapters (Hermes, OpenClaw, OpenAI-compat, etc.).
│   └── runtime-paths.ts
│
└── shared/        ← Safe for both sides. Pure types + constants only — no runtime
    └── types/        side effects, no imports from frontend or backend.
```

## How to navigate

| I want to…                                        | Go here                              |
|---------------------------------------------------|--------------------------------------|
| Add a new API endpoint the client can call        | `frontend/api/<domain>.ts`           |
| Change how the browser talks to the server        | `frontend/api/client.ts`             |
| Add a new React hook                              | `frontend/hooks.ts`                  |
| Add a theme or tweak colours                      | `frontend/themes.ts`                 |
| Add a new database table or column                | `backend/db/schema.ts` + `migrations.ts` |
| Change SQLite pragmas or connection behaviour     | `backend/db/connection.ts`           |
| Change default seed data                          | `backend/db/seed.ts`                 |
| Add a new gateway adapter (e.g. a new LLM API)    | `backend/adapters/<name>.ts` + register in `index.ts` |
| Add / rename a shared type                        | `shared/types/<domain>.ts`           |

## Legacy shim files (kept for backwards compatibility)

The old flat files (`api.ts`, `db.ts`, `types.ts`, `store.ts`, etc.) still exist
at this level — but they are now **one-line re-exports** from the new locations.
Prefer the new `@/lib/frontend/*` / `@/lib/backend/*` / `@/lib/shared/*` imports
in new code. The shims exist so that the ~190 existing `@/lib/...` imports keep
working during the transition.
