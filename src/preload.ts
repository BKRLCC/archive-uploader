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
  readSheet: (
    xlsxPath: string,
    sheetName: string,
  ): Promise<import("./api").SheetData | null> =>
    ipcRenderer.invoke("read-sheet", xlsxPath, sheetName),
  updateSheetRow: (
    xlsxPath: string,
    rowIndex: number,
    updatedValues: Record<string, string>,
  ): Promise<string[]> =>
    ipcRenderer.invoke("update-sheet-row", xlsxPath, rowIndex, updatedValues),
  populateFilesTab: (
    folder: string,
    rootFolder: string,
  ): Promise<{ count: number }> =>
    ipcRenderer.invoke("populate-files-tab", folder, rootFolder),
  createArchive: (
    folderPath: string,
    meta: { name: string; description: string },
  ): Promise<{ path: string }> =>
    ipcRenderer.invoke("create-archive", folderPath, meta),
  addSheetRow: (
    xlsxPath: string,
    values: Record<string, string>,
  ): Promise<string[]> => ipcRenderer.invoke("add-sheet-row", xlsxPath, values),
});
