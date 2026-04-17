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

export interface Api {
  getRootFolder: () => Promise<string | null>;
  chooseRootFolder: () => Promise<string | null>;
  listFolder: (folderPath: string) => Promise<DirEntry[]>;
  getFileInfo: (filePath: string) => Promise<FileInfo>;
}

declare global {
  interface Window {
    api: Api;
  }
}
