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
  readSheet: (xlsxPath: string, sheetName: string) => Promise<SheetData | null>;
  updateSheetRow: (
    xlsxPath: string,
    rowIndex: number,
    updatedValues: Record<string, string>,
  ) => Promise<string[]>;
  populateFilesTab: (
    folder: string,
    rootFolder: string,
  ) => Promise<{ count: number }>;
  createArchive: (folderPath: string) => Promise<{ path: string }>;
}

declare global {
  interface Window {
    api: Api;
  }
}
