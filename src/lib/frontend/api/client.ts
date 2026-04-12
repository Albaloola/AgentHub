/**
 * Low-level HTTP helper used by every other file in this folder.
 *
 * Exists so the domain files stay focused on the endpoint shape — they don't
 * have to re-implement error handling. Throws `Error` with the HTTP status and
 * the response body when the server returns a non-2xx, so callers can display
 * meaningful toasts.
 */

"use client";

const BASE = "";  // Relative paths — same-origin, no CORS config needed.

export async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, init);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${res.status}: ${body || res.statusText}`);
  }
  return res.json() as Promise<T>;
}
