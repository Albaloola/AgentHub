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

  const dataDir = process.env.AGENTHUB_DATA_DIR || path.join(process.cwd(), "data");
  const uploadsDir = path.join(dataDir, "uploads");
  const knowledgeDir = path.join(dataDir, "knowledge");
  const logsDir = path.join(dataDir, "logs");
  const dbPath = process.env.DATABASE_PATH || path.join(dataDir, "agenthub.db");

  ensureDir(dataDir);
  ensureDir(path.dirname(dbPath));
  ensureDir(uploadsDir);
  ensureDir(knowledgeDir);
  ensureDir(logsDir);

  cachedPaths = {
    dataDir,
    dbPath,
    uploadsDir,
    knowledgeDir,
    logsDir,
  };

  return cachedPaths;
}

export function getDataDir() {
  return resolvePaths().dataDir;
}

export function getDbPath() {
  return resolvePaths().dbPath;
}

export function getUploadsDir() {
  return resolvePaths().uploadsDir;
}

export function getKnowledgeDir() {
  return resolvePaths().knowledgeDir;
}

export function getLogsDir() {
  return resolvePaths().logsDir;
}

export function isDesktopMode() {
  return process.env.AGENTHUB_DESKTOP === "1";
}

export function getChildProcessEnv(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  const nextEnv: NodeJS.ProcessEnv = {
    ...process.env,
    ...extra,
  };

  delete nextEnv.ELECTRON_RUN_AS_NODE;
  delete nextEnv.ELECTRON_NO_ATTACH_CONSOLE;

  return nextEnv;
}
