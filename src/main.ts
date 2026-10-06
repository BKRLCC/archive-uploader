import {
  app,
  autoUpdater,
  BrowserWindow,
  dialog,
  ipcMain,
  net,
  protocol,
  shell,
} from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { createHash, randomUUID } from 'node:crypto'
import * as XLSX from 'xlsx'
import started from 'electron-squirrel-startup'
import {
  CONTEXT_SHEET,
  spreadsheets,
  TypeColumns,
  resolveEditableEntityType,
} from './types/types'
import { buildWorkbook } from './helpers/workbook-builder'
import { deriveFileRowsFromItems } from './helpers/file-linkage'
import { isMultiSelectField } from './config/field-vocabularies'
import { applyFieldRules } from './config/field-rules'
import {
  DEPICTION_IMAGE_EXTENSIONS,
  DEPICTION_FIELD_NAME,
  GENERATED_DEPICTIONS_FOLDER_NAME,
  getDepictionThumbnailRelativePath,
  hasAllowedDepictionExtension,
  normalizeDepictionRelativePath,
  THUMBNAIL_SIZE_PX,
} from './config/depiction-config'
import {
  isVideoPreviewExtension,
  PREVIEWABLE_VIDEO_EXTENSIONS,
} from './config/previewable-file-types'
import { updateElectronApp } from 'update-electron-app'
import contextMenu from 'electron-context-menu'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from 'ffmpeg-static'
import sharp from 'sharp'
import dotenv from 'dotenv'

// Must be called before app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'localfile', privileges: { secure: true, supportFetchAPI: true } },
])
import Store from 'electron-store'

const store = new Store()

// Stable, location-independent identifier (RO-Crate arcp scheme) for a crate
// with no registered PID.
function newArcpIdentifier(): string {
  return `arcp://uuid,${randomUUID()}/`
}

// Folder names reserved for archive-wide entity vocabularies, so they are never
// treated as content collections.
function reservedFolderNames(): Set<string> {
  const names = new Set<string>()
  for (const schema of Object.values(spreadsheets)) {
    if (schema.folderName) names.add(schema.folderName)
  }
  names.add('Tags')
  return names
}

// True when folderPath is a content collection under the archive root (not the
// root itself and not an entity-vocabulary folder). Folder depth is irrelevant:
// every such collection is a direct child of the root, keeping membership flat.
function isChildCollectionFolder(
  folderPath: string,
  rootFolder: string,
): boolean {
  const resolvedRoot = path.resolve(rootFolder)
  const resolved = path.resolve(folderPath)
  if (resolved === resolvedRoot) return false
  const relative = path.relative(resolvedRoot, resolved)
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    return false
  }
  const topSegment = relative.split(path.sep)[0]
  return !reservedFolderNames().has(topSegment)
}

async function readRootDatasetValue(
  xlsxPath: string,
  key: string,
): Promise<string> {
  const buf = await fs.promises.readFile(xlsxPath)
  const workbook = XLSX.read(buf)
  const actualName = workbook.SheetNames.find(
    (n) => n.toLowerCase() === 'rootdataset',
  )
  if (!actualName) return ''
  const rows: string[][] = XLSX.utils.sheet_to_json(
    workbook.Sheets[actualName],
    { header: 1, defval: '' },
  )
  const match = rows.find((row) => String(row[0] ?? '') === key)
  return match ? String(match[1] ?? '') : ''
}

async function setRootDatasetValue(
  xlsxPath: string,
  key: string,
  value: string,
): Promise<void> {
  const buf = await fs.promises.readFile(xlsxPath)
  const workbook = XLSX.read(buf)
  const actualName = workbook.SheetNames.find(
    (n) => n.toLowerCase() === 'rootdataset',
  )
  if (!actualName) throw new Error('No RootDataset sheet found')
  const rows: string[][] = XLSX.utils.sheet_to_json(
    workbook.Sheets[actualName],
    { header: 1, defval: '' },
  )
  const existing = rows.find((row) => String(row[0] ?? '') === key)
  if (existing) {
    existing[1] = value
  } else {
    rows.push([key, value])
  }
  workbook.Sheets[actualName] = XLSX.utils.aoa_to_sheet(rows)
  await fs.promises.writeFile(
    xlsxPath,
    XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }),
  )
}

// Guarantees the archive root has a top-level collection carrying a stable
// identifier, returning it. Scaffolds a blank collection when none exists and
// backfills a missing identifier onto an existing one; never overwrites other
// fields.
async function ensureTopLevelCollection(rootFolder: string): Promise<string> {
  const rootMetaPath = path.join(rootFolder, 'metadata.xlsx')
  if (!fs.existsSync(rootMetaPath)) {
    const identifier = newArcpIdentifier()
    const workbook = buildWorkbook('RepositoryObject', {
      name: '',
      description: '',
      identifier,
    })
    await fs.promises.writeFile(
      rootMetaPath,
      XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }),
    )
    return identifier
  }
  const existing = await readRootDatasetValue(rootMetaPath, 'identifier')
  if (existing.trim()) return existing
  const identifier = newArcpIdentifier()
  await setRootDatasetValue(rootMetaPath, 'identifier', identifier)
  return identifier
}

// Load local env files in development so runtime-only keys (e.g. MAPBOX_ACCESS_TOKEN)
// are available to the Electron main process.
dotenv.config({ path: path.join(process.cwd(), '.env') })
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const isDev = !app.isPackaged

// Injected at build time by Vite (see vite.main.config.ts) so the token ships
// with the packaged app, where no .env is available at runtime.
declare const __MAPBOX_ACCESS_TOKEN__: string

function resolveMapboxToken(): string | null {
  const candidates = [
    process.env.MAPBOX_ACCESS_TOKEN,
    process.env.VITE_MAPBOX_ACCESS_TOKEN,
    process.env.MAPBOX_TOKEN,
    typeof __MAPBOX_ACCESS_TOKEN__ !== 'undefined'
      ? __MAPBOX_ACCESS_TOKEN__
      : '',
  ]

  for (const candidate of candidates) {
    const token = String(candidate ?? '').trim()
    if (token) return token
  }

  return null
}

const FFMPEG_BINARY_NAME =
  process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'

function resolveFfmpegPath(): string | null {
  const candidates: string[] = []

  if (process.env.FFMPEG_PATH) {
    candidates.push(path.resolve(process.env.FFMPEG_PATH))
  }

  if (typeof ffmpegPath === 'string' && ffmpegPath.trim()) {
    candidates.push(path.resolve(ffmpegPath))
  }

  if (app.isPackaged) {
    candidates.push(
      path.join(
        process.resourcesPath,
        'app.asar.unpacked',
        'node_modules',
        'ffmpeg-static',
        FFMPEG_BINARY_NAME,
      ),
    )
  } else {
    candidates.push(
      path.join(
        process.cwd(),
        'node_modules',
        'ffmpeg-static',
        FFMPEG_BINARY_NAME,
      ),
    )
  }

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        return candidate
      }
    } catch {
      // Ignore candidate path errors and continue to next fallback.
    }
  }

  return null
}

const resolvedFfmpegPath = resolveFfmpegPath()
if (resolvedFfmpegPath) {
  ffmpeg.setFfmpegPath(resolvedFfmpegPath)
} else {
  console.warn(
    'ffmpeg binary was not found; video depiction generation will be unavailable.',
  )
}

const VIDEO_PREVIEW_PROXY_EXTENSIONS = new Set(['mov', 'avi', 'mkv'])

function toCacheKey(filePath: string, mtimeMs: number): string {
  return createHash('sha1').update(`${filePath}:${mtimeMs}`).digest('hex')
}

contextMenu({
  showInspectElement: isDev,
})

function isPathWithin(parentPath: string, targetPath: string): boolean {
  const rel = path.relative(parentPath, targetPath)
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel)
}

async function writeDepictionThumbnail(
  archiveFolderAbsolute: string,
  depictionPath: string,
): Promise<string | null> {
  const normalizedDepictionPath = normalizeDepictionRelativePath(depictionPath)
  if (!normalizedDepictionPath) return null

  const sourceAbsolute = path.resolve(
    archiveFolderAbsolute,
    normalizedDepictionPath,
  )
  if (!isPathWithin(archiveFolderAbsolute, sourceAbsolute)) {
    return null
  }
  if (!hasAllowedDepictionExtension(sourceAbsolute)) {
    return null
  }

  let sourceStat: fs.Stats
  try {
    sourceStat = await fs.promises.stat(sourceAbsolute)
  } catch {
    return null
  }
  if (!sourceStat.isFile()) {
    return null
  }

  const thumbnailRelativePath = getDepictionThumbnailRelativePath(
    normalizedDepictionPath,
  )
  if (!thumbnailRelativePath) {
    return null
  }

  const thumbnailAbsolute = path.resolve(
    archiveFolderAbsolute,
    thumbnailRelativePath,
  )
  if (!isPathWithin(archiveFolderAbsolute, thumbnailAbsolute)) {
    return null
  }

  try {
    const existingThumbStat = await fs.promises.stat(thumbnailAbsolute)
    if (
      existingThumbStat.isFile() &&
      existingThumbStat.mtimeMs >= sourceStat.mtimeMs
    ) {
      return thumbnailRelativePath
    }
  } catch {
    // Thumbnail does not exist or is unreadable; regenerate.
  }

  await fs.promises.mkdir(path.dirname(thumbnailAbsolute), { recursive: true })
  await sharp(sourceAbsolute)
    .rotate()
    .resize(THUMBNAIL_SIZE_PX, THUMBNAIL_SIZE_PX, {
      fit: 'cover',
      position: 'attention',
    })
    .jpeg({ quality: 72, mozjpeg: true })
    .toFile(thumbnailAbsolute)

  return thumbnailRelativePath
}

// Holds the primary window so background events (e.g. auto-update status) can
// be forwarded to the renderer.
let mainWindow: BrowserWindow | null = null

type UpdateStatus = {
  state:
    | 'checking'
    | 'available'
    | 'not-available'
    | 'downloaded'
    | 'error'
    | 'unsupported'
  message?: string
}

function sendUpdateStatus(status: UpdateStatus) {
  mainWindow?.webContents.send('update-status', status)
}

// Auto-update from GitHub Releases (only in production)
if (!isDev) {
  updateElectronApp({ repo: 'BKRLCC/archive-uploader' })

  autoUpdater.on('checking-for-update', () => {
    sendUpdateStatus({ state: 'checking' })
  })
  autoUpdater.on('update-available', () => {
    sendUpdateStatus({ state: 'available' })
  })
  autoUpdater.on('update-not-available', () => {
    sendUpdateStatus({ state: 'not-available' })
  })
  autoUpdater.on('update-downloaded', () => {
    sendUpdateStatus({ state: 'downloaded' })
  })
  autoUpdater.on('error', (error) => {
    sendUpdateStatus({
      state: 'error',
      message: error?.message ?? 'Update error',
    })
  })
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit()
}

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    )
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  protocol.handle('localfile', (request) => {
    return net.fetch(request.url.replace(/^localfile:/, 'file:'))
  })
  if (process.platform === 'darwin' && isDev) {
    app.dock!.setIcon(path.join(process.cwd(), 'src/icons/logo.png'))
  }
  createWindow()
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// ── Workbook builder ─────────────────────────────────────────────────────────

function trimTrailingEmptyRows(rows: string[][]): string[][] {
  if (rows.length === 0) return rows

  let lastNonEmptyRowIndex = -1
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const hasValue = (rows[index] ?? []).some(
      (cell) => String(cell ?? '').trim() !== '',
    )
    if (hasValue) {
      lastNonEmptyRowIndex = index
      break
    }
  }

  if (lastNonEmptyRowIndex < 0) {
    return []
  }

  return rows.slice(0, lastNonEmptyRowIndex + 1)
}

function isEmptyRow(row: string[]): boolean {
  return !(row ?? []).some((cell) => String(cell ?? '').trim() !== '')
}

// ── IPC handlers ─────────────────────────────────────────────────────────────

ipcMain.handle('list-folder', async (_event, folderPath: string) => {
  const dirents = await fs.promises.readdir(folderPath, {
    withFileTypes: true,
  })
  const entries = dirents
    .filter((d) => !d.name.startsWith('.') && !d.name.startsWith('~$'))
    .map((d) => {
      const isDirectory = d.isDirectory()
      const ext = isDirectory ? '' : path.extname(d.name).slice(1).toLowerCase()
      return { name: d.name, isDirectory, ext }
    })
  entries.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  return entries
})

ipcMain.handle('get-file-info', async (_event, filePath: string) => {
  const stat = await fs.promises.stat(filePath)
  return {
    size: stat.size,
    birthtime: stat.birthtime.toISOString(),
    mtime: stat.mtime.toISOString(),
    isDirectory: stat.isDirectory(),
  }
})

ipcMain.handle('get-mapbox-token', async () => {
  return resolveMapboxToken()
})

ipcMain.handle(
  'read-sheet',
  async (_event, xlsxPath: string, sheetName: string) => {
    try {
      const buf = await fs.promises.readFile(xlsxPath)
      const workbook = XLSX.read(buf)
      const actualName = workbook.SheetNames.find(
        (n) => n.toLowerCase() === sheetName.toLowerCase(),
      )
      if (!actualName) return null
      const sheet = workbook.Sheets[actualName]
      const rows: string[][] = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: '',
      })
      if (rows.length === 0) return { headers: [], rows: [] }
      const [headerRow, ...dataRows] = rows
      const headers = headerRow.map((h) => String(h ?? ''))
      const data = dataRows.map((r) =>
        headers.map((_, i) => String(r[i] ?? '')),
      )
      return { headers, rows: data }
    } catch (err) {
      const maybeErr = err as NodeJS.ErrnoException
      if (maybeErr?.code !== 'ENOENT') {
        console.error('read-sheet error:', err)
      }
      return null
    }
  },
)

ipcMain.handle('get-sheet-names', async (_event, xlsxPath: string) => {
  const buf = await fs.promises.readFile(xlsxPath)
  const workbook = XLSX.read(buf)
  return workbook.SheetNames
})

ipcMain.handle(
  'update-sheet-row',
  async (
    _event,
    xlsxPath: string,
    sheetName: string,
    rowIndex: number,
    updatedValues: Record<string, string>,
  ) => {
    const buf = await fs.promises.readFile(xlsxPath)
    const workbook = XLSX.read(buf)
    const actualName = workbook.SheetNames.find(
      (n) => n.toLowerCase() === sheetName.toLowerCase(),
    )
    if (!actualName) throw new Error(`No ${sheetName} sheet found`)
    const sheet = workbook.Sheets[actualName]
    const rows: string[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
    })
    const headers = (rows[0] ?? []).map((h) => String(h ?? ''))

    const missingHeaders = Object.keys(updatedValues).filter(
      (key) => !headers.includes(key),
    )
    if (missingHeaders.length > 0) {
      headers.push(...missingHeaders)
      rows[0] = headers
      for (let i = 1; i < rows.length; i += 1) {
        if (!rows[i]) rows[i] = []
        while (rows[i].length < headers.length) rows[i].push('')
      }
    }

    const dataRowIndex = rowIndex + 1 // +1 for header
    if (!rows[dataRowIndex]) rows[dataRowIndex] = headers.map(() => '')
    while (rows[dataRowIndex].length < headers.length) {
      rows[dataRowIndex].push('')
    }

    for (const [key, value] of Object.entries(updatedValues)) {
      const col = headers.indexOf(key)
      if (col !== -1) rows[dataRowIndex][col] = value
    }

    applyFieldRules(headers, rows[dataRowIndex], 'update')

    const depictionColumn = headers.indexOf(DEPICTION_FIELD_NAME)
    if (depictionColumn >= 0) {
      const archiveFolderAbsolute = path.resolve(path.dirname(xlsxPath))
      await writeDepictionThumbnail(
        archiveFolderAbsolute,
        String(rows[dataRowIndex][depictionColumn] ?? ''),
      )
    }

    const normalizedRows = trimTrailingEmptyRows(rows)
    const newSheet = XLSX.utils.aoa_to_sheet(normalizedRows)
    workbook.Sheets[actualName] = newSheet
    await fs.promises.writeFile(
      xlsxPath,
      XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }),
    )
    return rows[dataRowIndex].map((v) => String(v ?? ''))
  },
)

ipcMain.handle(
  'delete-sheet-rows',
  async (_event, xlsxPath: string, sheetName: string, rowIndices: number[]) => {
    const buf = await fs.promises.readFile(xlsxPath)
    const workbook = XLSX.read(buf)
    const actualName = workbook.SheetNames.find(
      (n) => n.toLowerCase() === sheetName.toLowerCase(),
    )
    if (!actualName) throw new Error(`No ${sheetName} sheet found`)
    const sheet = workbook.Sheets[actualName]
    const rows: string[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
    })
    if (rows.length <= 1 || rowIndices.length === 0) {
      return { deletedCount: 0 }
    }

    const indices = Array.from(new Set(rowIndices))
      .filter((index) => Number.isInteger(index) && index >= 0)
      .sort((a, b) => b - a)

    let deletedCount = 0
    for (const rowIndex of indices) {
      const dataRowIndex = rowIndex + 1 // +1 for header
      if (dataRowIndex >= 1 && dataRowIndex < rows.length) {
        rows.splice(dataRowIndex, 1)
        deletedCount += 1
      }
    }

    const normalizedRows = trimTrailingEmptyRows(rows)
    workbook.Sheets[actualName] = XLSX.utils.aoa_to_sheet(normalizedRows)
    await fs.promises.writeFile(
      xlsxPath,
      XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }),
    )
    return { deletedCount }
  },
)

const FILES_SHEET_NAME = 'Files'

// Ensures the workbook carries the fixed @context prefix map: adds the sheet when
// absent, and appends any canonical prefix rows missing from an existing sheet
// (existing rows are preserved, never overwritten). Returns true if changed.
function ensureContextSheet(workbook: XLSX.WorkBook): boolean {
  const actualName = workbook.SheetNames.find(
    (n) => n.toLowerCase() === CONTEXT_SHEET.name.toLowerCase(),
  )
  if (!actualName) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet(CONTEXT_SHEET.rows),
      CONTEXT_SHEET.name,
    )
    return true
  }

  const rows: string[][] = XLSX.utils.sheet_to_json(
    workbook.Sheets[actualName],
    {
      header: 1,
      defval: '',
    },
  )
  const existingPrefixes = new Set(
    rows.map((row) =>
      String(row[0] ?? '')
        .trim()
        .toLowerCase(),
    ),
  )
  // Skip the canonical header row; append only prefixes not already present.
  const missing = CONTEXT_SHEET.rows.slice(1).filter(
    (row) =>
      !existingPrefixes.has(
        String(row[0] ?? '')
          .trim()
          .toLowerCase(),
      ),
  )
  if (missing.length === 0) return false

  workbook.Sheets[actualName] = XLSX.utils.aoa_to_sheet([...rows, ...missing])
  return true
}

// Every RepositoryObject must declare membership in its collection root for the
// RO-Crate converter; the column is hidden from the UI and enforced at upload.
const MEMBER_OF_COLUMN = 'isRef_pcdm:memberOf'
const MEMBER_OF_VALUE = './'

// Ensures the items sheet carries the isRef_pcdm:memberOf column and fills "./"
// for each RepositoryObject row (blank cells only). Mutates `rows` in place and
// returns true if anything changed.
function ensureMemberOfColumn(rows: string[][]): boolean {
  const headers = (rows[0] ?? []).map((h) => String(h ?? ''))
  const typeIndex = headers.indexOf('@type')
  let changed = false

  let memberIndex = headers.indexOf(MEMBER_OF_COLUMN)
  if (memberIndex < 0) {
    headers.push(MEMBER_OF_COLUMN)
    rows[0] = headers
    memberIndex = headers.length - 1
    changed = true
  }

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i]
    if (!row || row.every((cell) => String(cell ?? '').trim() === '')) continue
    const rowType = typeIndex >= 0 ? String(row[typeIndex] ?? '') : ''
    if (resolveEditableEntityType(rowType) !== 'RepositoryObject') continue
    while (row.length <= memberIndex) row.push('')
    if (String(row[memberIndex] ?? '').trim() === '') {
      row[memberIndex] = MEMBER_OF_VALUE
      changed = true
    }
  }

  return changed
}

// Locates the sheet describing entities that own files — any sheet with @id and
// at least one file-linking column (isRef_hasPart or isRef_image). Content
// collections link via hasPart; entity-vocabulary workbooks link their depiction
// via isRef_image. Skips RootDataset/@context/Files.
function findItemsSheetName(workbook: XLSX.WorkBook): string | null {
  for (const name of workbook.SheetNames) {
    const lower = name.toLowerCase()
    if (
      lower === 'rootdataset' ||
      lower === '@context' ||
      lower === FILES_SHEET_NAME.toLowerCase()
    ) {
      continue
    }
    const rows: string[][] = XLSX.utils.sheet_to_json(workbook.Sheets[name], {
      header: 1,
      defval: '',
    })
    const headers = (rows[0] ?? []).map((h) => String(h ?? ''))
    if (
      headers.includes('@id') &&
      (headers.includes('isRef_hasPart') ||
        headers.includes(DEPICTION_FIELD_NAME))
    ) {
      return name
    }
  }
  return null
}

// Regenerates a workbook's Files sheet from its entities' file links — item
// hasPart paths and/or depiction images. Fully derived: existing rows are
// overwritten. A workbook with no file-bearing entity sheet (no isRef_hasPart
// and no isRef_image) is left untouched and `written` is false.
async function reconcileFilesTab(
  xlsxPath: string,
): Promise<{ written: boolean; files: number }> {
  const buf = await fs.promises.readFile(xlsxPath)
  const workbook = XLSX.read(buf)

  const itemsSheetName = findItemsSheetName(workbook)
  if (!itemsSheetName) return { written: false, files: 0 }

  const headers = [...TypeColumns.File] as string[]
  const rows: string[][] = XLSX.utils.sheet_to_json(
    workbook.Sheets[itemsSheetName],
    { header: 1, defval: '' },
  )
  const itemHeaders = (rows[0] ?? []).map((h) => String(h ?? ''))
  const idIndex = itemHeaders.indexOf('@id')
  const hasPartIndex = itemHeaders.indexOf('isRef_hasPart')
  const imageIndex = itemHeaders.indexOf(DEPICTION_FIELD_NAME)
  const derived = deriveFileRowsFromItems(
    rows.slice(1).map((row) => ({
      itemId: String(row[idIndex] ?? ''),
      hasPart: String(row[hasPartIndex] ?? ''),
      image: imageIndex >= 0 ? String(row[imageIndex] ?? '') : '',
    })),
  )
  const derivedRows = derived.map((row) =>
    headers.map((header) =>
      String((row as Record<string, string>)[header] ?? ''),
    ),
  )

  // Enforce the collection-membership invariant on the source items sheet too.
  if (ensureMemberOfColumn(rows)) {
    workbook.Sheets[itemsSheetName] = XLSX.utils.aoa_to_sheet(
      trimTrailingEmptyRows(rows),
    )
  }

  const filesSheet = XLSX.utils.aoa_to_sheet([headers, ...derivedRows])
  const actualFilesName = workbook.SheetNames.find(
    (n) => n.toLowerCase() === FILES_SHEET_NAME.toLowerCase(),
  )
  if (actualFilesName) {
    workbook.Sheets[actualFilesName] = filesSheet
  } else {
    XLSX.utils.book_append_sheet(workbook, filesSheet, FILES_SHEET_NAME)
  }

  ensureContextSheet(workbook)

  await fs.promises.writeFile(
    xlsxPath,
    XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }),
  )
  return { written: true, files: derivedRows.length }
}

// Ensures a content collection carries an empty Files sheet (header row only)
// without deriving any rows. Non-content workbooks (no isRef_hasPart items
// sheet) and workbooks that already have a Files sheet are left untouched.
async function ensureFilesTab(xlsxPath: string): Promise<boolean> {
  const buf = await fs.promises.readFile(xlsxPath)
  const workbook = XLSX.read(buf)

  const alreadyPresent = workbook.SheetNames.some(
    (n) => n.toLowerCase() === FILES_SHEET_NAME.toLowerCase(),
  )
  if (alreadyPresent) return false
  if (!findItemsSheetName(workbook)) return false

  const headers = [...TypeColumns.File] as string[]
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([headers]),
    FILES_SHEET_NAME,
  )
  await fs.promises.writeFile(
    xlsxPath,
    XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }),
  )
  return true
}

// Base URL of the RO-Crate excel conversion service.
const RO_CRATE_API_BASE = 'https://ro-crate-excel-api.light.garden'

// Recursively collects every metadata.xlsx under a folder. A collection is any
// folder holding a metadata.xlsx at any depth (the app browses folders freely),
// so a flat scan is not enough. Non-content workbooks are filtered downstream by
// reconcileFilesTab, not here.
async function collectMetadataFiles(rootFolder: string): Promise<string[]> {
  const found: string[] = []
  const walk = async (dir: string): Promise<void> => {
    const dirents = await fs.promises.readdir(dir, { withFileTypes: true })
    for (const dirent of dirents) {
      if (dirent.name.startsWith('.') || dirent.name.startsWith('~$')) continue
      const entryPath = path.join(dir, dirent.name)
      if (dirent.isDirectory()) {
        await walk(entryPath)
      } else if (dirent.name.toLowerCase() === 'metadata.xlsx') {
        found.push(entryPath)
      }
    }
  }
  await walk(rootFolder)
  return found
}

ipcMain.handle('populate-files-tab', async (_event, folder: string) => {
  const { files } = await reconcileFilesTab(path.join(folder, 'metadata.xlsx'))
  return { count: files }
})

ipcMain.handle('ensure-files-tab', async (_event, folder: string) => {
  const created = await ensureFilesTab(path.join(folder, 'metadata.xlsx'))
  return { created }
})

// Regenerates the Files sheet for every content collection under the archive
// root. Used by the upload flow. `collections` counts only content collections
// that received a Files sheet; entity-vocabulary workbooks self-exclude.
ipcMain.handle('reconcile-files-tabs', async (_event, rootFolder: string) => {
  const metadataFiles = await collectMetadataFiles(rootFolder)

  let collections = 0
  let files = 0
  for (const xlsxPath of metadataFiles) {
    const result = await reconcileFilesTab(xlsxPath)
    if (result.written) {
      collections += 1
      files += result.files
    }
  }
  return { collections, files }
})

// Converts the archive into an RO-Crate via the external excel API. Every
// metadata.xlsx is uploaded with its archive-root-relative path as the part
// filename, which the server uses to rebase File @ids. The returned crate and
// warnings are written to the archive root. This is the convert step; hosting
// the result comes later but is presented to the user as part of "upload".
ipcMain.handle('upload-archive', async (_event, rootFolder: string) => {
  const metadataFiles = await collectMetadataFiles(rootFolder)
  if (metadataFiles.length === 0) {
    throw new Error('No metadata.xlsx files found in this archive.')
  }

  const form = new FormData()
  for (const xlsxPath of metadataFiles) {
    const relativePath = path
      .relative(rootFolder, xlsxPath)
      .split(path.sep)
      .join('/')
    const buffer = await fs.promises.readFile(xlsxPath)
    form.append('file', new Blob([buffer]), relativePath)
  }

  const response = await fetch(`${RO_CRATE_API_BASE}/convert?report=1`, {
    method: 'POST',
    body: form,
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Convert failed (HTTP ${response.status}): ${body}`)
  }

  const { crate, warnings } = (await response.json()) as {
    crate: unknown
    warnings?: unknown[]
  }

  const cratePath = path.join(rootFolder, 'ro-crate-metadata.json')
  const warningsPath = path.join(rootFolder, 'ro-crate-warnings.json')
  await fs.promises.writeFile(cratePath, JSON.stringify(crate, null, 2))
  await fs.promises.writeFile(
    warningsPath,
    JSON.stringify(warnings ?? [], null, 2),
  )

  const graph = (crate as { '@graph'?: unknown[] })['@graph']
  const entityCount = Array.isArray(graph) ? graph.length : 0
  const warningCount = Array.isArray(warnings) ? warnings.length : 0

  return {
    fileCount: metadataFiles.length,
    entityCount,
    warningCount,
    cratePath,
    warningsPath,
  }
})

ipcMain.handle(
  'create-archive',
  async (
    _event,
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
  ) => {
    const identifier = meta.identifier?.trim()
      ? meta.identifier
      : newArcpIdentifier()
    const rootFolder = store.get('rootFolder', null) as string | null
    const isChild = rootFolder
      ? isChildCollectionFolder(folderPath, rootFolder)
      : false
    const isPartOf =
      isChild && rootFolder ? await ensureTopLevelCollection(rootFolder) : ''
    const xlsxPath = folderPath + '/metadata.xlsx'
    const workbook = buildWorkbook('RepositoryObject', { ...meta, identifier })
    await fs.promises.writeFile(
      xlsxPath,
      XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }),
    )
    // Child collections carry a system-managed link to the top-level collection.
    if (isPartOf) {
      await setRootDatasetValue(xlsxPath, 'isRef_pcdm:memberOf', isPartOf)
    }
    return { path: xlsxPath }
  },
)

ipcMain.handle(
  'add-sheet-row',
  async (
    _event,
    xlsxPath: string,
    sheetName: string,
    values: Record<string, string>,
  ) => {
    const buf = await fs.promises.readFile(xlsxPath)
    const workbook = XLSX.read(buf)
    const actualName = workbook.SheetNames.find(
      (n) => n.toLowerCase() === sheetName.toLowerCase(),
    )
    if (!actualName) throw new Error(`No ${sheetName} sheet found`)
    const sheet = workbook.Sheets[actualName]
    const rows: string[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
    })
    const headers = (rows[0] ?? []).map((h) => String(h ?? ''))
    const missingHeaders = Object.keys(values).filter(
      (key) => !headers.includes(key),
    )
    if (missingHeaders.length > 0) {
      headers.push(...missingHeaders)
      rows[0] = headers
      for (let i = 1; i < rows.length; i += 1) {
        if (!rows[i]) rows[i] = []
        while (rows[i].length < headers.length) rows[i].push('')
      }
    }
    const newRow = headers.map((h) => values[h] ?? '')

    applyFieldRules(headers, newRow, 'create')

    const depictionColumn = headers.indexOf(DEPICTION_FIELD_NAME)
    if (depictionColumn >= 0) {
      const archiveFolderAbsolute = path.resolve(path.dirname(xlsxPath))
      await writeDepictionThumbnail(
        archiveFolderAbsolute,
        String(newRow[depictionColumn] ?? ''),
      )
    }

    // Trim trailing empty rows BEFORE appending so the new row lands
    // immediately after the last meaningful data row, not deep in an
    // inflated sheet range left over from prior edits.
    const compactedRows = trimTrailingEmptyRows(rows)
    compactedRows.push(newRow)
    workbook.Sheets[actualName] = XLSX.utils.aoa_to_sheet(compactedRows)
    await fs.promises.writeFile(
      xlsxPath,
      XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }),
    )
    return newRow
  },
)

ipcMain.handle(
  'update-root-dataset',
  async (_event, xlsxPath: string, updates: Record<string, string>) => {
    const buf = await fs.promises.readFile(xlsxPath)
    const workbook = XLSX.read(buf)
    const actualName = workbook.SheetNames.find(
      (n) => n.toLowerCase() === 'rootdataset',
    )
    if (!actualName) throw new Error('No RootDataset sheet found')
    const sheet = workbook.Sheets[actualName]
    const rawRows: string[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
    })
    // Drop fully-empty rows so appended fields never land after a blank gap
    // (external editors can pad the sheet's range with blank rows).
    const filtered = rawRows.filter((row) => !isEmptyRow(row))
    // isRef_ values serialise as one row per @id (ro-crate-excel reads repeats
    // as multiple refs); only multi-select fields split on comma, so single
    // references keep commas that are part of the id itself (e.g. arcp URIs).
    const expandRows = (key: string, value: string): string[][] => {
      if (!isMultiSelectField(key)) return [[key, value]]
      const ids = value
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
      return ids.length > 0 ? ids.map((id) => [key, id]) : [[key, '']]
    }
    const emitted = new Set<string>()
    const rows: string[][] = []
    for (const row of filtered) {
      const key = String(row[0] ?? '')
      if (Object.prototype.hasOwnProperty.call(updates, key)) {
        // Replace the whole key at its first row; drop later duplicate rows.
        if (!emitted.has(key)) {
          rows.push(...expandRows(key, updates[key]))
          emitted.add(key)
        }
      } else {
        rows.push(row)
      }
    }
    // Append any update keys that don't yet have a row (e.g. older archives
    // created before a field like isRef_license existed).
    for (const [key, value] of Object.entries(updates)) {
      if (!emitted.has(key)) {
        rows.push(...expandRows(key, value))
        emitted.add(key)
      }
    }
    workbook.Sheets[actualName] = XLSX.utils.aoa_to_sheet(rows)
    await fs.promises.writeFile(
      xlsxPath,
      XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }),
    )
    const updated: string[][] = XLSX.utils.sheet_to_json(
      workbook.Sheets[actualName],
      { header: 1, defval: '' },
    )
    const [headerRow, ...dataRows] = updated
    const headers = (headerRow ?? []).map((h) => String(h ?? ''))
    return {
      headers,
      rows: dataRows.map((r) => headers.map((_, i) => String(r[i] ?? ''))),
    }
  },
)

ipcMain.handle(
  'get-derived-file-rows',
  async (_event, xlsxPath: string, sheetName = 'Items') => {
    const buf = await fs.promises.readFile(xlsxPath)
    const workbook = XLSX.read(buf)
    const actualName = workbook.SheetNames.find(
      (name) => name.toLowerCase() === sheetName.toLowerCase(),
    )
    if (!actualName) {
      throw new Error(`No ${sheetName} sheet found`)
    }

    const sheet = workbook.Sheets[actualName]
    const rows: string[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
    })
    if (rows.length === 0) {
      return {
        headers: ['@id', '@type', '.folder', '.filename', 'isRef_isPartOf'],
        rows: [] as string[][],
      }
    }

    const headers = (rows[0] ?? []).map((header) => String(header ?? ''))
    const idIndex = headers.findIndex((header) => header === '@id')
    const hasPartIndex = headers.findIndex(
      (header) => header === 'isRef_hasPart',
    )
    const imageIndex = headers.findIndex(
      (header) => header === DEPICTION_FIELD_NAME,
    )

    if (idIndex < 0 || (hasPartIndex < 0 && imageIndex < 0)) {
      return {
        headers: ['@id', '@type', '.folder', '.filename', 'isRef_isPartOf'],
        rows: [] as string[][],
      }
    }

    const derivedRows = deriveFileRowsFromItems(
      rows.slice(1).map((row) => ({
        itemId: String(row[idIndex] ?? ''),
        hasPart: String(row[hasPartIndex] ?? ''),
        image: imageIndex >= 0 ? String(row[imageIndex] ?? '') : '',
      })),
    )

    return {
      headers: ['@id', '@type', '.folder', '.filename', 'isRef_isPartOf'],
      rows: derivedRows.map((row) => [
        row['@id'],
        row['@type'],
        row['.folder'],
        row['.filename'],
        row.isRef_isPartOf,
      ]),
    }
  },
)

ipcMain.handle('get-root-folder', async () => {
  const rootFolder = store.get('rootFolder', null) as string | null
  // Guarantee a top-level collection for archives whose root was set in a
  // previous session (set/choose-root-folder only fire on active selection).
  if (rootFolder) {
    await ensureTopLevelCollection(rootFolder)
  }
  return rootFolder
})

ipcMain.handle('choose-root-folder', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  win.focus()
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    properties: ['openDirectory'],
    title: 'Choose root folder',
  })
  if (canceled || filePaths.length === 0) return null
  store.set('rootFolder', filePaths[0])
  await ensureTopLevelCollection(filePaths[0])
  return filePaths[0]
})

ipcMain.handle('set-root-folder', async (_, folderPath: string) => {
  store.set('rootFolder', folderPath)
  await ensureTopLevelCollection(folderPath)
  return folderPath
})

ipcMain.handle('get-saved-folders', () => {
  return store.get('savedFolders', [])
})

ipcMain.handle('save-folder', (_, name: string, folderPath: string) => {
  const saved = store.get('savedFolders', []) as Array<{
    name: string
    path: string
  }>
  const idx = saved.findIndex((f) => f.path === folderPath)
  if (idx >= 0) {
    saved[idx] = { name, path: folderPath }
  } else {
    saved.push({ name, path: folderPath })
  }
  store.set('savedFolders', saved)
  return saved
})

ipcMain.handle('remove-saved-folder', (_, folderPath: string) => {
  const saved = store.get('savedFolders', []) as Array<{
    name: string
    path: string
  }>
  const filtered = saved.filter((f) => f.path !== folderPath)
  store.set('savedFolders', filtered)
  return filtered
})

ipcMain.handle('reload-app', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) win.webContents.reload()
})

ipcMain.handle('check-for-updates', () => {
  if (isDev) {
    return {
      state: 'unsupported',
      message: 'Updates are only available in the installed app.',
    }
  }
  try {
    autoUpdater.checkForUpdates()
    return { state: 'checking' }
  } catch (error) {
    return {
      state: 'error',
      message:
        error instanceof Error ? error.message : 'Could not check for updates.',
    }
  }
})

ipcMain.handle('quit-and-install-update', () => {
  if (isDev) return
  autoUpdater.quitAndInstall()
})

ipcMain.handle(
  'pick-depiction-file',
  async (event, archiveFolderPath: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win.focus()
    const archiveFolderAbsolute = path.resolve(archiveFolderPath)
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      defaultPath: archiveFolderAbsolute,
      title: 'Choose depiction image',
      filters: [
        {
          name: 'Images',
          extensions: [...DEPICTION_IMAGE_EXTENSIONS],
        },
      ],
    })
    if (canceled || filePaths.length === 0) return null

    const selectedAbsolute = path.resolve(filePaths[0])
    if (!isPathWithin(archiveFolderAbsolute, selectedAbsolute)) {
      throw new Error('Depiction image must be inside the archive folder.')
    }
    if (!hasAllowedDepictionExtension(selectedAbsolute)) {
      throw new Error('Depiction file must be an image.')
    }

    return path
      .relative(archiveFolderAbsolute, selectedAbsolute)
      .split(path.sep)
      .join('/')
  },
)

ipcMain.handle('pick-files', async (event, archiveFolderPath: string) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  win.focus()
  const archiveFolderAbsolute = path.resolve(archiveFolderPath)
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    properties: ['openFile', 'multiSelections'],
    defaultPath: archiveFolderAbsolute,
    title: 'Choose files to bulk add',
  })
  if (canceled || filePaths.length === 0) return null

  const relativePaths = filePaths.map((filePath) => {
    const selectedAbsolute = path.resolve(filePath)
    if (!isPathWithin(archiveFolderAbsolute, selectedAbsolute)) {
      throw new Error('All selected files must be inside the archive folder.')
    }
    return path
      .relative(archiveFolderAbsolute, selectedAbsolute)
      .split(path.sep)
      .join('/')
  })

  return relativePaths
})

ipcMain.handle(
  'pick-license-file',
  async (event, archiveFolderPath: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win.focus()
    const archiveFolderAbsolute = path.resolve(archiveFolderPath)
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      defaultPath: archiveFolderAbsolute,
      title: 'Choose license file',
    })
    if (canceled || filePaths.length === 0) return null

    const selectedAbsolute = path.resolve(filePaths[0])
    // Copied license files live in a subfolder of the Licenses crate. It is
    // deliberately NOT named "Licenses" (that's the parent) to avoid a
    // confusing Licenses/Licenses nesting. Spelt "License" (US) to match LDaCA.
    const licenseFolderName = 'License files'
    const licenseFolderAbsolute = path.join(
      archiveFolderAbsolute,
      licenseFolderName,
    )
    await fs.promises.mkdir(licenseFolderAbsolute, { recursive: true })

    // Choose a collision-safe destination filename inside the License files folder.
    const originalName = path.basename(selectedAbsolute)
    const ext = path.extname(originalName)
    const stem = path.basename(originalName, ext)
    let destName = originalName
    let counter = 1
    while (fs.existsSync(path.join(licenseFolderAbsolute, destName))) {
      const candidateAbsolute = path.join(licenseFolderAbsolute, destName)
      // If the existing file is the very one selected, reuse it as-is.
      if (path.resolve(candidateAbsolute) === selectedAbsolute) break
      destName = `${stem}-${counter}${ext}`
      counter += 1
    }

    const destAbsolute = path.join(licenseFolderAbsolute, destName)
    if (path.resolve(destAbsolute) !== selectedAbsolute) {
      await fs.promises.copyFile(selectedAbsolute, destAbsolute)
    }

    return path
      .relative(archiveFolderAbsolute, destAbsolute)
      .split(path.sep)
      .join('/')
  },
)

ipcMain.handle(
  'scan-folder-for-new-files',
  async (event, archiveFolderPath: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win.focus()
    const archiveFolderAbsolute = path.resolve(archiveFolderPath)
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      defaultPath: archiveFolderAbsolute,
      title: 'Choose folder to scan for new files',
    })
    if (canceled || filePaths.length === 0) return null

    const scanFolderAbsolute = path.resolve(filePaths[0])
    // The scanned folder may be the archive folder itself or any folder nested
    // within it, but not somewhere higher up or elsewhere in the tree.
    if (
      scanFolderAbsolute !== archiveFolderAbsolute &&
      !isPathWithin(archiveFolderAbsolute, scanFolderAbsolute)
    ) {
      throw new Error('The scanned folder must be inside the archive folder.')
    }

    const entries = await fs.promises.readdir(scanFolderAbsolute, {
      withFileTypes: true,
    })

    const relativePaths = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      // Skip hidden/system files and spreadsheets (e.g. metadata.xlsx).
      .filter((name) => !name.startsWith('.'))
      .filter((name) => !name.toLowerCase().endsWith('.xlsx'))
      .map((name) =>
        path
          .relative(archiveFolderAbsolute, path.join(scanFolderAbsolute, name))
          .split(path.sep)
          .join('/'),
      )

    return relativePaths
  },
)

ipcMain.handle(
  'pick-linked-files',
  async (event, archiveFolderPath: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win.focus()
    const archiveFolderAbsolute = path.resolve(archiveFolderPath)
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      properties: ['openFile', 'multiSelections'],
      defaultPath: archiveFolderAbsolute,
      title: 'Choose files for this item',
    })
    if (canceled || filePaths.length === 0) return null

    const relativePaths = filePaths.map((filePath) => {
      const selectedAbsolute = path.resolve(filePath)
      if (!isPathWithin(archiveFolderAbsolute, selectedAbsolute)) {
        throw new Error('All selected files must be inside the archive folder.')
      }
      return path
        .relative(archiveFolderAbsolute, selectedAbsolute)
        .split(path.sep)
        .join('/')
    })

    return relativePaths
  },
)

ipcMain.handle('get-video-preview-path', async (_event, filePath: string) => {
  if (!resolvedFfmpegPath) {
    return { previewPath: filePath, isProxy: false }
  }

  const absolutePath = path.resolve(String(filePath ?? '').trim())
  if (!absolutePath) {
    throw new Error('Video path is required.')
  }

  let videoStat: fs.Stats
  try {
    videoStat = await fs.promises.stat(absolutePath)
  } catch {
    throw new Error('Video file was not found.')
  }

  if (!videoStat.isFile()) {
    throw new Error('Video path must point to a file.')
  }

  const extension = path.extname(absolutePath).slice(1).toLowerCase()
  if (!isVideoPreviewExtension(extension)) {
    return { previewPath: absolutePath, isProxy: false }
  }

  if (!VIDEO_PREVIEW_PROXY_EXTENSIONS.has(extension)) {
    return { previewPath: absolutePath, isProxy: false }
  }

  const cacheDir = path.join(app.getPath('userData'), 'video-preview-cache')
  await fs.promises.mkdir(cacheDir, { recursive: true })

  const cacheKey = toCacheKey(absolutePath, videoStat.mtimeMs)
  const outputPath = path.join(cacheDir, `${cacheKey}.mp4`)

  try {
    const cachedStat = await fs.promises.stat(outputPath)
    if (cachedStat.isFile()) {
      return { previewPath: outputPath, isProxy: true }
    }
  } catch {
    // Cache miss; continue to generate.
  }

  await new Promise<void>((resolve, reject) => {
    ffmpeg(absolutePath)
      .outputOptions([
        '-movflags +faststart',
        '-pix_fmt yuv420p',
        '-c:v libx264',
        '-preset veryfast',
        '-crf 28',
        '-an',
      ])
      .output(outputPath)
      .on('end', () => resolve())
      .on('error', (error) => reject(error))
      .run()
  })

  return { previewPath: outputPath, isProxy: true }
})

ipcMain.handle(
  'generate-video-depiction',
  async (_event, archiveFolderPath: string, videoRelativePath: string) => {
    if (!resolvedFfmpegPath) {
      throw new Error(
        'Video depiction generation is unavailable (ffmpeg missing).',
      )
    }

    const archiveFolderAbsolute = path.resolve(archiveFolderPath)
    const normalizedRelativePath = String(videoRelativePath ?? '').trim()
    if (!normalizedRelativePath) {
      throw new Error('Video path is required.')
    }

    const videoAbsolutePath = path.resolve(
      archiveFolderAbsolute,
      normalizedRelativePath,
    )
    if (!isPathWithin(archiveFolderAbsolute, videoAbsolutePath)) {
      throw new Error('Video file must be inside the archive folder.')
    }

    const extension = path.extname(videoAbsolutePath).slice(1).toLowerCase()
    if (!isVideoPreviewExtension(extension)) {
      throw new Error(
        `Unsupported video extension. Supported: ${Array.from(PREVIEWABLE_VIDEO_EXTENSIONS).join(', ')}`,
      )
    }

    let videoStat: fs.Stats
    try {
      videoStat = await fs.promises.stat(videoAbsolutePath)
    } catch {
      throw new Error('Video file was not found.')
    }
    if (!videoStat.isFile()) {
      throw new Error('Video path must point to a file.')
    }

    const depictionsFolderAbsolute = path.join(
      archiveFolderAbsolute,
      GENERATED_DEPICTIONS_FOLDER_NAME,
    )
    await fs.promises.mkdir(depictionsFolderAbsolute, { recursive: true })

    const parsed = path.parse(normalizedRelativePath)
    const stem =
      parsed.name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'video'

    let fileName = `${stem}-depiction.jpg`
    let outputRelativePath = path.posix.join(
      GENERATED_DEPICTIONS_FOLDER_NAME,
      fileName,
    )
    let outputAbsolutePath = path.join(
      archiveFolderAbsolute,
      outputRelativePath,
    )

    let counter = 1
    while (true) {
      try {
        await fs.promises.access(outputAbsolutePath)
        fileName = `${stem}-depiction-${counter}.jpg`
        outputRelativePath = path.posix.join(
          GENERATED_DEPICTIONS_FOLDER_NAME,
          fileName,
        )
        outputAbsolutePath = path.join(
          archiveFolderAbsolute,
          outputRelativePath,
        )
        counter += 1
      } catch {
        break
      }
    }

    await new Promise<void>((resolve, reject) => {
      ffmpeg(videoAbsolutePath)
        .seekInput(1)
        .outputOptions(['-frames:v 1', '-q:v 2'])
        .output(outputAbsolutePath)
        .on('end', () => resolve())
        .on('error', (error) => reject(error))
        .run()
    })

    await writeDepictionThumbnail(archiveFolderAbsolute, outputRelativePath)

    return {
      depictionPath: outputRelativePath.replace(/\\/g, '/'),
    }
  },
)

ipcMain.handle(
  'validate-depiction-path',
  async (_event, archiveFolderPath: string, depictionPath: string) => {
    const trimmed = String(depictionPath ?? '').trim()
    if (!trimmed) {
      return { ok: true, normalizedPath: '' }
    }

    const archiveFolderAbsolute = path.resolve(archiveFolderPath)
    const candidateAbsolute = path.resolve(archiveFolderAbsolute, trimmed)

    if (!isPathWithin(archiveFolderAbsolute, candidateAbsolute)) {
      return {
        ok: false,
        error: 'Depiction image must be inside the archive folder.',
      }
    }

    if (!hasAllowedDepictionExtension(candidateAbsolute)) {
      return {
        ok: false,
        error: 'Depiction file must be one of: jpg, jpeg, png, gif, webp.',
      }
    }

    try {
      const stat = await fs.promises.stat(candidateAbsolute)
      if (!stat.isFile()) {
        return { ok: false, error: 'Depiction path must point to a file.' }
      }
    } catch {
      return { ok: false, error: 'Depiction file was not found.' }
    }

    return {
      ok: true,
      normalizedPath: path
        .relative(archiveFolderAbsolute, candidateAbsolute)
        .split(path.sep)
        .join('/'),
    }
  },
)

ipcMain.handle('create-places-folder', async (_event, rootFolder: string) => {
  const schema = spreadsheets.Places
  const folderPath = path.join(rootFolder, schema.folderName)
  await fs.promises.mkdir(folderPath, { recursive: true })
  const xlsxPath = path.join(folderPath, 'metadata.xlsx')
  const workbook = buildWorkbook('Places', {
    name: schema.folderName,
    description: '',
  })
  await fs.promises.writeFile(
    xlsxPath,
    XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }),
  )
  return { path: folderPath }
})

ipcMain.handle('create-people-folder', async (_event, rootFolder: string) => {
  const schema = spreadsheets.People
  const folderPath = path.join(rootFolder, schema.folderName)
  await fs.promises.mkdir(folderPath, { recursive: true })
  const xlsxPath = path.join(folderPath, 'metadata.xlsx')
  const workbook = buildWorkbook('People', {
    name: schema.folderName,
    description: '',
  })
  await fs.promises.writeFile(
    xlsxPath,
    XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }),
  )
  return { path: folderPath }
})

ipcMain.handle(
  'create-organisations-folder',
  async (_event, rootFolder: string) => {
    const schema = spreadsheets.Organisations
    const folderPath = path.join(rootFolder, schema.folderName)
    await fs.promises.mkdir(folderPath, { recursive: true })
    const xlsxPath = path.join(folderPath, 'metadata.xlsx')
    const workbook = buildWorkbook('Organisations', {
      name: schema.folderName,
      description: '',
    })
    await fs.promises.writeFile(
      xlsxPath,
      XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }),
    )
    return { path: folderPath }
  },
)

ipcMain.handle(
  'create-languages-folder',
  async (_event, rootFolder: string) => {
    const schema = spreadsheets.Language
    const folderPath = path.join(rootFolder, schema.folderName)
    await fs.promises.mkdir(folderPath, { recursive: true })
    const xlsxPath = path.join(folderPath, 'metadata.xlsx')
    const workbook = buildWorkbook('Language', {
      name: schema.folderName,
      description: '',
    })
    await fs.promises.writeFile(
      xlsxPath,
      XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }),
    )
    return { path: folderPath }
  },
)

ipcMain.handle('open-file', async (_event, filePath: string) => {
  return shell.openPath(filePath)
})

ipcMain.handle('show-in-finder', (_event, filePath: string) => {
  shell.showItemInFolder(filePath)
})

ipcMain.handle('delete-file', async (_event, filePath: string) => {
  await fs.promises.unlink(filePath)
})

ipcMain.handle('create-licenses-folder', async (_event, rootFolder: string) => {
  const schema = spreadsheets['ldac:DataReuseLicense']
  const folderPath = path.join(rootFolder, schema.folderName)
  await fs.promises.mkdir(folderPath, { recursive: true })
  const xlsxPath = path.join(folderPath, 'metadata.xlsx')
  const workbook = buildWorkbook('ldac:DataReuseLicense', {
    name: schema.folderName,
    description: '',
  })
  await fs.promises.writeFile(
    xlsxPath,
    XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }),
  )
  return { path: folderPath }
})
