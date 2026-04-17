// Type declarations for window.api (exposed via preload contextBridge)
export interface Api {
  getRootFolder: () => Promise<string | null>;
  chooseRootFolder: () => Promise<string | null>;
}

declare global {
  interface Window {
    api: Api;
  }
}
