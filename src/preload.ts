// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  getMapboxToken: (): Promise<string | null> =>
    ipcRenderer.invoke('get-mapbox-token'),
  getRootFolder: (): Promise<string | null> =>
    ipcRenderer.invoke('get-root-folder'),
  chooseRootFolder: (): Promise<string | null> =>
    ipcRenderer.invoke('choose-root-folder'),
  pickDepictionFile: (archiveFolderPath: string): Promise<string | null> =>
    ipcRenderer.invoke('pick-depiction-file', archiveFolderPath),
  pickFiles: (archiveFolderPath: string): Promise<string[] | null> =>
    ipcRenderer.invoke('pick-files', archiveFolderPath),
  pickLinkedFiles: (archiveFolderPath: string): Promise<string[] | null> =>
    ipcRenderer.invoke('pick-linked-files', archiveFolderPath),
  generateVideoDepiction: (
    archiveFolderPath: string,
    videoRelativePath: string,
  ): Promise<{ depictionPath: string }> =>
    ipcRenderer.invoke(
      'generate-video-depiction',
      archiveFolderPath,
      videoRelativePath,
    ),
  getVideoPreviewPath: (
    filePath: string,
  ): Promise<{ previewPath: string; isProxy: boolean }> =>
    ipcRenderer.invoke('get-video-preview-path', filePath),
  validateDepictionPath: (
    archiveFolderPath: string,
    depictionPath: string,
  ): Promise<{ ok: boolean; normalizedPath?: string; error?: string }> =>
    ipcRenderer.invoke(
      'validate-depiction-path',
      archiveFolderPath,
      depictionPath,
    ),
  listFolder: (folderPath: string): Promise<import('./api').DirEntry[]> =>
    ipcRenderer.invoke('list-folder', folderPath),
  getFileInfo: (filePath: string): Promise<import('./api').FileInfo> =>
    ipcRenderer.invoke('get-file-info', filePath),
  getSheetNames: (xlsxPath: string): Promise<string[]> =>
    ipcRenderer.invoke('get-sheet-names', xlsxPath),
  readSheet: (
    xlsxPath: string,
    sheetName: string,
  ): Promise<import('./api').SheetData | null> =>
    ipcRenderer.invoke('read-sheet', xlsxPath, sheetName),
  updateSheetRow: (
    xlsxPath: string,
    sheetName: string,
    rowIndex: number,
    updatedValues: Record<string, string>,
  ): Promise<string[]> =>
    ipcRenderer.invoke(
      'update-sheet-row',
      xlsxPath,
      sheetName,
      rowIndex,
      updatedValues,
    ),
  deleteSheetRows: (
    xlsxPath: string,
    sheetName: string,
    rowIndices: number[],
  ): Promise<{ deletedCount: number }> =>
    ipcRenderer.invoke('delete-sheet-rows', xlsxPath, sheetName, rowIndices),
  populateFilesTab: (
    folder: string,
    rootFolder: string,
  ): Promise<{ count: number }> =>
    ipcRenderer.invoke('populate-files-tab', folder, rootFolder),
  createArchive: (
    folderPath: string,
    meta: { name: string; description: string },
  ): Promise<{ path: string }> =>
    ipcRenderer.invoke('create-archive', folderPath, meta),
  addSheetRow: (
    xlsxPath: string,
    sheetName: string,
    values: Record<string, string>,
  ): Promise<string[]> =>
    ipcRenderer.invoke('add-sheet-row', xlsxPath, sheetName, values),
  updateRootDataset: (
    xlsxPath: string,
    updates: Record<string, string>,
  ): Promise<import('./api').SheetData> =>
    ipcRenderer.invoke('update-root-dataset', xlsxPath, updates),
  getDerivedFileRows: (
    xlsxPath: string,
    sheetName?: string,
  ): Promise<import('./api').SheetData> =>
    ipcRenderer.invoke('get-derived-file-rows', xlsxPath, sheetName),
  createPeopleFolder: (rootFolder: string): Promise<{ path: string }> =>
    ipcRenderer.invoke('create-people-folder', rootFolder),
  createLanguagesFolder: (rootFolder: string): Promise<{ path: string }> =>
    ipcRenderer.invoke('create-languages-folder', rootFolder),
  createPlacesFolder: (rootFolder: string): Promise<{ path: string }> =>
    ipcRenderer.invoke('create-places-folder', rootFolder),
  createLocalitiesFolder: (rootFolder: string): Promise<{ path: string }> =>
    ipcRenderer.invoke('create-localities-folder', rootFolder),
  createLicensesFolder: (rootFolder: string): Promise<{ path: string }> =>
    ipcRenderer.invoke('create-licenses-folder', rootFolder),
  openFile: (filePath: string): Promise<string> =>
    ipcRenderer.invoke('open-file', filePath),
  showInFinder: (filePath: string): Promise<void> =>
    ipcRenderer.invoke('show-in-finder', filePath),
  deleteFile: (filePath: string): Promise<void> =>
    ipcRenderer.invoke('delete-file', filePath),
})
