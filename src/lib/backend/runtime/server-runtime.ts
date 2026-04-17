import { ensureSchedulerStarted } from "./scheduler";

let runtimeStarted = false;

/**
 * Boots long-lived backend runtime services on the first real server request.
 *
 * We intentionally avoid starting these at build time; route handlers call this
 * lazily so the scheduler only exists in the running Node server.
 */
export function ensureServerRuntime() {
  if (runtimeStarted) {
    return;
  }
  runtimeStarted = true;
  ensureSchedulerStarted();
}
