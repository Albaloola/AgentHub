import { app, BrowserWindow, Menu, ipcMain, session, shell } from "electron";
import path from "path";
import log from "electron-log/main";
import { startBackend, type BackendHandle } from "./backend";
import { connectToDevServer } from "./dev-launcher";
import { createAgentHubTray } from "./tray";

let mainWindow: BrowserWindow | null = null;
let tray: ReturnType<typeof createAgentHubTray> = null;
let backend: BackendHandle | null = null;
let isQuitting = false;

function getPreloadPath() {
  return path.join(__dirname, "preload.js");
}

function getWindowIconPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "app", "public", "globe.svg")
    : path.join(app.getAppPath(), "public", "globe.svg");
}

function createMainWindow(backendUrl: string) {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 720,
    show: false,
    icon: getWindowIconPath(),
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on("close", (event) => {
    if (!isQuitting && tray) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  void mainWindow.loadURL(backendUrl);
}

function createAppMenu() {
  const template = [
    {
      label: "AgentHub",
      submenu: [
        { label: "Show", click: () => mainWindow?.show() },
        { label: "Hide", click: () => mainWindow?.hide() },
        { type: "separator" as const },
        {
          label: "Quit AgentHub",
          click: () => {
            isQuitting = true;
            void app.quit();
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function registerIpc(logsDir: string) {
  ipcMain.handle("desktop:show", async () => mainWindow?.show());
  ipcMain.handle("desktop:hide", async () => mainWindow?.hide());
  ipcMain.handle("desktop:quit", async () => {
    isQuitting = true;
    app.quit();
  });
  ipcMain.handle("desktop:get-backend-url", async () => backend?.url ?? null);
  ipcMain.handle("desktop:open-logs-dir", async () => shell.openPath(logsDir));
}

/**
 * Inject a Content-Security-Policy header on every response handled by the
 * renderer's session. We only ever load the local backend, so restrict
 * everything to http://127.0.0.1:* plus the inline styles / blob URLs that
 * Next.js emits for hot module chunks and streaming.
 *
 * If this ever breaks a renderer feature it will show up as a blocked
 * resource in devtools — loosen a single directive at a time rather than
 * reverting wholesale.
 */
function installContentSecurityPolicy() {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const headers = { ...details.responseHeaders };
    const policy = [
      "default-src 'self' http://127.0.0.1:* ws://127.0.0.1:*",
      "script-src 'self' http://127.0.0.1:* 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' http://127.0.0.1:* 'unsafe-inline'",
      "img-src 'self' http://127.0.0.1:* data: blob:",
      "font-src 'self' http://127.0.0.1:* data:",
      "connect-src 'self' http://127.0.0.1:* ws://127.0.0.1:*",
      "media-src 'self' http://127.0.0.1:* blob:",
      "worker-src 'self' http://127.0.0.1:* blob:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self' http://127.0.0.1:*",
    ].join("; ");

    // Strip any CSP the Next server may have set so ours is authoritative.
    for (const key of Object.keys(headers)) {
      if (key.toLowerCase() === "content-security-policy") {
        delete headers[key];
      }
    }
    headers["Content-Security-Policy"] = [policy];

    callback({ responseHeaders: headers });
  });
}

async function bootstrap() {
  const lock = app.requestSingleInstanceLock();
  if (!lock) {
    app.quit();
    return;
  }

  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  await app.whenReady();

  log.initialize();
  log.transports.file.resolvePathFn = () => path.join(app.getPath("logs"), "main.log");

  const dataDir = app.getPath("userData");
  const logsDir = app.getPath("logs");
  const devUrl = process.env.AGENTHUB_DEV_URL;

  backend = devUrl
    ? await connectToDevServer(devUrl)
    : await startBackend({
        appPath: app.getAppPath(),
        dataDir,
        logsDir,
      });

  installContentSecurityPolicy();
  createMainWindow(backend.url);
  createAppMenu();
  registerIpc(logsDir);

  tray = createAgentHubTray({
    onShow: () => mainWindow?.show(),
    onHide: () => mainWindow?.hide(),
    onQuit: () => {
      isQuitting = true;
      app.quit();
    },
  });

  app.on("activate", () => {
    if (!mainWindow) {
      createMainWindow(backend?.url ?? "http://127.0.0.1:3000");
      return;
    }

    mainWindow.show();
  });

  app.on("before-quit", async () => {
    isQuitting = true;
    tray?.destroy();
    tray = null;
    if (backend) {
      await backend.stop();
      backend = null;
    }
  });

  app.on("window-all-closed", () => {
    if (tray && !isQuitting) {
      return;
    }

    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}

void bootstrap().catch((error) => {
  log.error("Failed to start desktop app", error);
  app.quit();
});
