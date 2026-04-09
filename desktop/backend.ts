import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import http from "http";
import net from "net";
import path from "path";
import log from "electron-log/main";

export type BackendHandle = {
  port: number;
  url: string;
  stop: () => Promise<void>;
};

type StartBackendOptions = {
  appPath: string;
  dataDir: string;
  logsDir: string;
  preferredPort?: number;
};

async function canListen(port: number) {
  return new Promise<boolean>((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

async function findPort(preferredPort: number, attempts = 3) {
  const candidates = [preferredPort];

  for (let i = 0; i < attempts - 1; i += 1) {
    candidates.push(0);
  }

  for (const candidate of candidates) {
    if (candidate === 0) {
      const ephemeral = await new Promise<number>((resolve, reject) => {
        const server = net.createServer();
        server.once("error", reject);
        server.listen(0, "127.0.0.1", () => {
          const address = server.address();
          if (!address || typeof address === "string") {
            reject(new Error("Failed to resolve ephemeral port"));
            return;
          }
          server.close(() => resolve(address.port));
        });
      });

      return ephemeral;
    }

    if (await canListen(candidate)) {
      return candidate;
    }
  }

  throw new Error("Failed to find an available backend port");
}

function waitForServer(url: string, timeoutMs = 30000) {
  return new Promise<void>((resolve, reject) => {
    const start = Date.now();

    const probe = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if ((res.statusCode ?? 500) < 500) {
          resolve();
          return;
        }

        retry();
      });

      req.on("error", retry);
    };

    const retry = () => {
      if (Date.now() - start >= timeoutMs) {
        reject(new Error(`Timed out waiting for backend at ${url}`));
        return;
      }

      setTimeout(probe, 200);
    };

    probe();
  });
}

function resolveServerScript(appPath: string) {
  if (appPath.includes("app.asar")) {
    return path.join(process.resourcesPath, "app", "server.js");
  }

  // Unpackaged: appPath is typically <repo>/dist/desktop when the app is
  // launched as `electron dist/desktop/main.js`, or <repo> when launched as
  // `electron .`. Walk up until we find the repo root that contains
  // .next/standalone/server.js instead of hardcoding a fixed depth.
  let dir = appPath;
  for (let i = 0; i < 5; i += 1) {
    const candidate = path.join(dir, ".next", "standalone", "server.js");
    if (require("fs").existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  // Last-resort fallback so the error message is clearer than ENOENT on cwd.
  return path.join(appPath, ".next", "standalone", "server.js");
}

async function stopProcess(proc: ChildProcessWithoutNullStreams | null) {
  if (!proc || proc.killed || proc.exitCode !== null) return;

  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
    }, 5000);

    proc.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });

    proc.kill("SIGTERM");
  });
}

export async function startBackend(options: StartBackendOptions): Promise<BackendHandle> {
  const port = await findPort(options.preferredPort ?? 3000);
  const serverScript = resolveServerScript(options.appPath);
  const url = `http://127.0.0.1:${port}`;

  log.info("Starting AgentHub backend", { serverScript, port, dataDir: options.dataDir });

  const child = spawn(process.execPath, [serverScript], {
    cwd: path.dirname(serverScript),
    env: {
      ...process.env,
      AGENTHUB_DESKTOP: "1",
      AGENTHUB_DATA_DIR: options.dataDir,
      AGENTHUB_LOGS_DIR: options.logsDir,
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      ELECTRON_RUN_AS_NODE: "1",
    },
  });

  child.stdout.on("data", (data) => log.info(`[backend] ${data.toString().trimEnd()}`));
  child.stderr.on("data", (data) => log.error(`[backend] ${data.toString().trimEnd()}`));
  child.once("exit", (code, signal) => log.info("Backend exited", { code, signal }));
  child.once("error", (error) => log.error("Backend process error", error));

  try {
    await waitForServer(url);
  } catch (error) {
    await stopProcess(child);
    throw error;
  }

  return {
    port,
    url,
    stop: () => stopProcess(child),
  };
}
