/**
 * Legacy path — kept so the ~190 existing `@/lib/types` imports keep working.
 *
 * The actual types live in `@/lib/shared/types/`, split by domain. See the
 * README in `src/lib/` for the layer layout, or `src/lib/shared/types/index.ts`
 * for the barrel that lists each domain file.
 *
 * Prefer `@/lib/shared/types` in new code.
 */

export * from "./shared/types";
