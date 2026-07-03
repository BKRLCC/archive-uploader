// Type declarations for window.api (exposed via preload contextBridge)
export interface SavedFolder {
  name: string
  path: string
}

export interface DirEntry {
  name: string
  isDirectory: boolean
  ext: string
}

export interface FileInfo {
  size: number
  birthtime: string
  mtime: string
  isDirectory: boolean
}

export interface SheetData {
  headers: string[]
  rows: string[][]
}

export interface UpdateStatus {
  state:
    | 'checking'
    | 'available'
    | 'not-available'
    | 'downloaded'
    | 'error'
    | 'unsupported'
  message?: string
}

export interface Api {
  getMapboxToken: () => Promise<string | null>
  getRootFolder: () => Promise<string | null>
  chooseRootFolder: () => Promise<string | null>
  setRootFolder: (path: string) => Promise<string>
  getSavedFolders: () => Promise<SavedFolder[]>
  saveFolder: (name: string, path: string) => Promise<SavedFolder[]>
  removeSavedFolder: (path: string) => Promise<SavedFolder[]>
  reloadApp: () => Promise<void>
  checkForUpdates: () => Promise<UpdateStatus>
  quitAndInstallUpdate: () => Promise<void>
  onUpdateStatus: (callback: (status: UpdateStatus) => void) => () => void
  pickDepictionFile: (archiveFolderPath: string) => Promise<string | null>
  pickFiles: (archiveFolderPath: string) => Promise<string[] | null>
  pickLinkedFiles: (archiveFolderPath: string) => Promise<string[] | null>
  generateVideoDepiction: (
    archiveFolderPath: string,
    videoRelativePath: string,
  ) => Promise<{ depictionPath: string }>
  getVideoPreviewPath: (
    filePath: string,
  ) => Promise<{ previewPath: string; isProxy: boolean }>
  validateDepictionPath: (
    archiveFolderPath: string,
    depictionPath: string,
  ) => Promise<{ ok: boolean; normalizedPath?: string; error?: string }>
  listFolder: (folderPath: string) => Promise<DirEntry[]>
  getFileInfo: (filePath: string) => Promise<FileInfo>
  getSheetNames: (xlsxPath: string) => Promise<string[]>
  readSheet: (xlsxPath: string, sheetName: string) => Promise<SheetData | null>
  updateSheetRow: (
    xlsxPath: string,
    sheetName: string,
    rowIndex: number,
    updatedValues: Record<string, string>,
  ) => Promise<string[]>
  deleteSheetRows: (
    xlsxPath: string,
    sheetName: string,
    rowIndices: number[],
  ) => Promise<{ deletedCount: number }>
  populateFilesTab: (
    folder: string,
    rootFolder: string,
  ) => Promise<{ count: number }>
  createArchive: (
    folderPath: string,
    meta: { name: string; description: string },
  ) => Promise<{ path: string }>
  addSheetRow: (
    xlsxPath: string,
    sheetName: string,
    values: Record<string, string>,
  ) => Promise<string[]>
  updateRootDataset: (
    xlsxPath: string,
    updates: Record<string, string>,
  ) => Promise<SheetData>
  getDerivedFileRows: (
    xlsxPath: string,
    sheetName?: string,
  ) => Promise<SheetData>
  createPeopleFolder: (rootFolder: string) => Promise<{ path: string }>
  createLanguagesFolder: (rootFolder: string) => Promise<{ path: string }>
  createPlacesFolder: (rootFolder: string) => Promise<{ path: string }>
  createLocalitiesFolder: (rootFolder: string) => Promise<{ path: string }>
  createLicensesFolder: (rootFolder: string) => Promise<{ path: string }>
  openFile: (filePath: string) => Promise<string>
  showInFinder: (filePath: string) => Promise<void>
  deleteFile: (filePath: string) => Promise<void>
}

declare global {
  interface Window {
    api: Api
  }
}
