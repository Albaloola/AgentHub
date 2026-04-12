Backend-only library code.

Everything in this folder runs **on the server** (inside Next.js API route
handlers, during SSR, or inside the Electron main process). It depends on
Node APIs like `fs`, `path`, and native modules (`better-sqlite3`).

**Never import this folder from React components or client pages** — doing
so would try to bundle native modules for the browser and break the build.

## Files

| File              | Responsibility                                                 |
|-------------------|----------------------------------------------------------------|
| `db/`             | SQLite connection, schema, migrations, seed data.             |
| `adapters/`       | Gateway adapters — one file per protocol + a registry.        |
| `runtime-paths.ts`| Locates the data directory at runtime (dev vs packaged app).  |

## How requests flow

```
HTTP request → src/app/api/<route>/route.ts
            ↓
            imports from backend/db to query SQLite
            imports from backend/adapters to talk to the agent gateway
            ↓
            returns JSON (or streams SSE)
```
