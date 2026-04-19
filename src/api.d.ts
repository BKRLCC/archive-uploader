// Type declarations for window.api (exposed via preload contextBridge)
export interface DirEntry {
  name: string;
  isDirectory: boolean;
  ext: string;
}

export interface FileInfo {
  size: number;
  birthtime: string;
  mtime: string;
  isDirectory: boolean;
}

export interface SheetData {
  headers: string[];
  rows: string[][];
}

export interface Api {
  getRootFolder: () => Promise<string | null>;
  chooseRootFolder: () => Promise<string | null>;
  listFolder: (folderPath: string) => Promise<DirEntry[]>;
  getFileInfo: (filePath: string) => Promise<FileInfo>;
  getSheetNames: (xlsxPath: string) => Promise<string[]>;
  readSheet: (xlsxPath: string, sheetName: string) => Promise<SheetData | null>;
  updateSheetRow: (
    xlsxPath: string,
    sheetName: string,
    rowIndex: number,
    updatedValues: Record<string, string>,
  ) => Promise<string[]>;
  populateFilesTab: (
    folder: string,
    rootFolder: string,
  ) => Promise<{ count: number }>;
  createArchive: (
    folderPath: string,
    meta: { name: string; description: string },
  ) => Promise<{ path: string }>;
  addSheetRow: (
    xlsxPath: string,
    sheetName: string,
    values: Record<string, string>,
  ) => Promise<string[]>;
  updateRootDataset: (
    xlsxPath: string,
    updates: Record<string, string>,
  ) => Promise<SheetData>;
  createPeopleOrgsFolder: (rootFolder: string) => Promise<{ path: string }>;
  createPlacesFolder: (rootFolder: string) => Promise<{ path: string }>;
  createLicensesFolder: (rootFolder: string) => Promise<{ path: string }>;
  openFile: (filePath: string) => Promise<string>;
  showInFinder: (filePath: string) => Promise<void>;
  deleteFile: (filePath: string) => Promise<void>;
}

declare global {
  interface Window {
    api: Api;
  }
}
