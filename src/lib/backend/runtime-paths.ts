/**
 * Filesystem paths the server writes to at runtime.
 *
 * In development, paths are relative to `process.cwd()` (the project root).
 * In a packaged desktop build, `AGENTHUB_DATA_DIR` is set by the Electron
 * main process so writes land in the OS-specific user data directory
 * (`~/.config/AgentHub` on Linux, `~/Library/Application Support/AgentHub`
 * on macOS, `%APPDATA%\AgentHub` on Windows) instead of the read-only
 * app bundle.
 *
 * All getters call `resolvePaths()`, which is memoised — dirs are only
 * created the first time it runs.
 */

import fs from "fs";
import path from "path";

type RuntimePaths = {
  dataDir: string;
  dbPath: string;
  uploadsDir: string;
  knowledgeDir: string;
  logsDir: string;
};

let cachedPaths: RuntimePaths | null = null;

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function resolvePaths(): RuntimePaths {
  if (cachedPaths) return cachedPaths;

  // AGENTHUB_DATA_DIR is set by the Electron main process for packaged builds.
  const dataDir = process.env.AGENTHUB_DATA_DIR || path.join(process.cwd(), "data");
  const uploadsDir = path.join(dataDir, "uploads");
  const knowledgeDir = path.join(dataDir, "knowledge");
  const logsDir = path.join(dataDir, "logs");
  // DATABASE_PATH lets the user override the DB file independently of dataDir.
  const dbPath = process.env.DATABASE_PATH || path.join(dataDir, "agenthub.db");

  ensureDir(dataDir);
  ensureDir(path.dirname(dbPath));
  ensureDir(uploadsDir);
  ensureDir(knowledgeDir);
  ensureDir(logsDir);

  cachedPaths = { dataDir, dbPath, uploadsDir, knowledgeDir, logsDir };
  return cachedPaths;
}

export function getDataDir()     { return resolvePaths().dataDir; }
export function getDbPath()      { return resolvePaths().dbPath; }
export function getUploadsDir()  { return resolvePaths().uploadsDir; }
export function getKnowledgeDir(){ return resolvePaths().knowledgeDir; }
export function getLogsDir()     { return resolvePaths().logsDir; }

/** True when running inside the Electron desktop shell (not `next dev`). */
export function isDesktopMode() {
  return process.env.AGENTHUB_DESKTOP === "1";
}

/**
 * Build an env dict suitable for spawning child processes, stripping Electron-
 * specific variables that would confuse a child `node` / `python` process.
 */
export function getChildProcessEnv(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  const nextEnv: NodeJS.ProcessEnv = { ...process.env, ...extra };
  delete nextEnv.ELECTRON_RUN_AS_NODE;
  delete nextEnv.ELECTRON_NO_ATTACH_CONSOLE;
  return nextEnv;
}
