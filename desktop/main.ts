import { app, BrowserWindow, Menu, ipcMain, shell } from "electron";
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
