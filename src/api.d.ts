// Type declarations for window.api (exposed via preload contextBridge)
import type { PublishPlan } from './helpers/publish-planner'

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

// Publish/deposit settings surfaced to the renderer. The bearer token is never
// returned; `hasToken` only reports whether one is stored.
export interface PublishSettings {
  depositBaseUrl: string
  archiveId: string
  hasToken: boolean
}

// Result of locally building the .publish derivatives (no upload performed).
export interface PublishBuildResult {
  plan: PublishPlan
  derivativesWritten: number
  failures: { path: string; error: string }[]
  derivativesDir: string
  publicCratePath: string
  hasDepositUrl: boolean
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
  pickLicenseFile: (archiveFolderPath: string) => Promise<string | null>
  scanFolderForNewFiles: (archiveFolderPath: string) => Promise<string[] | null>
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
  ensureFilesTab: (folder: string) => Promise<{ created: boolean }>
  reconcileFilesTabs: (
    rootFolder: string,
  ) => Promise<{ collections: number; files: number }>
  uploadArchive: (rootFolder: string) => Promise<{
    fileCount: number
    entityCount: number
    warningCount: number
    cratePath: string
    warningsPath: string
  }>
  createArchive: (
    folderPath: string,
    meta: {
      name: string
      description: string
      identifier?: string
      isRef_license?: string
      isRef_author?: string
      isRef_publisher?: string
      datePublished?: string
      isRef_inLanguage?: string
      'isRef_ldac:subjectLanguage'?: string
      'ldac:metadataIsPublic'?: string
      'custom:isPublishable'?: string
    },
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
  createOrganisationsFolder: (rootFolder: string) => Promise<{ path: string }>
  createLanguagesFolder: (rootFolder: string) => Promise<{ path: string }>
  createPlacesFolder: (rootFolder: string) => Promise<{ path: string }>
  createLicensesFolder: (rootFolder: string) => Promise<{ path: string }>
  openFile: (filePath: string) => Promise<string>
  showInFinder: (filePath: string) => Promise<void>
  deleteFile: (filePath: string) => Promise<void>
  planPublish: (rootFolder: string, archiveId: string) => Promise<PublishPlan>
  getPublishSettings: () => Promise<PublishSettings>
  setPublishSettings: (settings: {
    depositBaseUrl: string
    archiveId: string
  }) => Promise<PublishSettings>
  setPublishToken: (token: string) => Promise<{ hasToken: boolean }>
  buildPublishDerivatives: (
    rootFolder: string,
    archiveId: string,
  ) => Promise<PublishBuildResult>
}

declare global {
  interface Window {
    api: Api
  }
}
