/**
 * Legacy path — prefer `@/lib/frontend/api` in new code.
 *
 * The 1000-line api.ts file has been split into focused domain files under
 * `frontend/api/`. See the README there for the full list. Kept here as a
 * shim so existing `import { getAgents } from "@/lib/api"` calls keep working.
 */

export * from "./frontend/api";
