import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("desktop", {
  show: () => ipcRenderer.invoke("desktop:show"),
  hide: () => ipcRenderer.invoke("desktop:hide"),
  quit: () => ipcRenderer.invoke("desktop:quit"),
  openLogsDir: () => ipcRenderer.invoke("desktop:open-logs-dir"),
  getBackendUrl: () => ipcRenderer.invoke("desktop:get-backend-url"),
  isDesktop: true,
});
