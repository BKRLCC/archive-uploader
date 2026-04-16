// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  getRootFolder: () => ipcRenderer.invoke("get-root-folder"),
  chooseRootFolder: () => ipcRenderer.invoke("choose-root-folder"),
  listFolder: (folderPath) => ipcRenderer.invoke("list-folder", folderPath),
  getFileInfo: (filePath) => ipcRenderer.invoke("get-file-info", filePath),
  populateFilesTab: (folderPath, rootFolder) =>
    ipcRenderer.invoke("populate-files-tab", folderPath, rootFolder),
  readSheet: (xlsxPath, sheetName) =>
    ipcRenderer.invoke("read-sheet", xlsxPath, sheetName),
  updateSheetRow: (xlsxPath, rowIndex, updatedValues) =>
    ipcRenderer.invoke("update-sheet-row", xlsxPath, rowIndex, updatedValues),
});
