// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
  getRootFolder: (): Promise<string | null> =>
    ipcRenderer.invoke("get-root-folder"),
  chooseRootFolder: (): Promise<string | null> =>
    ipcRenderer.invoke("choose-root-folder"),
  listFolder: (folderPath: string): Promise<import("./api").DirEntry[]> =>
    ipcRenderer.invoke("list-folder", folderPath),
  getFileInfo: (filePath: string): Promise<import("./api").FileInfo> =>
    ipcRenderer.invoke("get-file-info", filePath),
});
