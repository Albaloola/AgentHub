import { Menu, Tray, app, nativeImage } from "electron";
import path from "path";

type TrayHandlers = {
  onShow: () => void;
  onHide: () => void;
  onQuit: () => void;
};

function resolveTrayIcon() {
  const devIcon = path.join(app.getAppPath(), "public", "globe.svg");
  const prodIcon = path.join(process.resourcesPath, "app", "public", "globe.svg");
  const iconPath = app.isPackaged ? prodIcon : devIcon;
  const image = nativeImage.createFromPath(iconPath);

  return image.isEmpty() ? undefined : image;
}

export function createAgentHubTray(handlers: TrayHandlers) {
  try {
    const trayIcon = resolveTrayIcon();
    if (!trayIcon) return null;

    const tray = new Tray(trayIcon);
    tray.setToolTip("AgentHub");
    tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: "Show AgentHub", click: handlers.onShow },
        { label: "Hide", click: handlers.onHide },
        { type: "separator" },
        { label: "Quit AgentHub", click: handlers.onQuit },
      ]),
    );
    tray.on("click", handlers.onShow);

    return tray;
  } catch {
    return null;
  }
}
