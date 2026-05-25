import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  net,
  protocol,
  shell,
} from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { createHash } from 'node:crypto'
import * as XLSX from 'xlsx'
import started from 'electron-squirrel-startup'
import { spreadsheets, type SpreadsheetType } from './types/types'
import { deriveFileRowsFromItems } from './helpers/file-linkage'
import {
  DEPICTION_IMAGE_EXTENSIONS,
  hasAllowedDepictionExtension,
} from './config/depiction-config'
import {
  isVideoPreviewExtension,
  PREVIEWABLE_VIDEO_EXTENSIONS,
} from './config/previewable-file-types'
import { updateElectronApp } from 'update-electron-app'
import contextMenu from 'electron-context-menu'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from 'ffmpeg-static'

// Must be called before app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'localfile', privileges: { secure: true, supportFetchAPI: true } },
])
import Store from 'electron-store'

const store = new Store()

const isDev = !app.isPackaged

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

// Auto-update from GitHub Releases (only in production)
if (!isDev) {
  updateElectronApp({ repo: 'BKRLCC/archive-uploader' })
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit()
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
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

function buildWorkbook(
  schemaKey: SpreadsheetType,
  meta: { name: string; description: string },
): XLSX.WorkBook {
  const schema = spreadsheets[schemaKey]
  const workbook = XLSX.utils.book_new()

  const rootDataset = XLSX.utils.aoa_to_sheet([
    ['Name', 'Value'],
    ['@id', './'],
    ['@type', '[Dataset, RepositoryCollection]'],
    ['name', meta.name],
    ['description', meta.description],
  ])
  XLSX.utils.book_append_sheet(workbook, rootDataset, 'RootDataset')

  for (const tab of schema.tabs) {
    const rows: string[][] = [tab.headers, ...(tab.seedRows ?? [])]
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet(rows),
      tab.name,
    )
  }

  for (const extra of schema.extraSheets ?? []) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet(extra.rows),
      extra.name,
    )
  }

  return workbook
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
      console.error('read-sheet error:', err)
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
    const newSheet = XLSX.utils.aoa_to_sheet(rows)
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

    workbook.Sheets[actualName] = XLSX.utils.aoa_to_sheet(rows)
    await fs.promises.writeFile(
      xlsxPath,
      XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }),
    )
    return { deletedCount }
  },
)

ipcMain.handle(
  'populate-files-tab',
  async (_event, folder: string, rootFolder: string) => {
    const dirents = await fs.promises.readdir(folder, { withFileTypes: true })
    const files = dirents.filter(
      (d) =>
        !d.isDirectory() && !d.name.startsWith('.') && !d.name.startsWith('~$'),
    )
    const fileRows = await Promise.all(
      files.map(async (d) => {
        const filePath = path.join(folder, d.name)
        const stat = await fs.promises.stat(filePath)
        const rel = filePath.slice(rootFolder.length).replace(/^[\\/]/, '')
        return [d.name, rel, stat.size, stat.mtime.toISOString()]
      }),
    )
    const sheetData = [['Filename', 'Path', 'Size', 'Modified'], ...fileRows]
    let workbook: XLSX.WorkBook
    try {
      const buf = await fs.promises.readFile(folder + '/metadata.xlsx')
      workbook = XLSX.read(buf)
    } catch {
      workbook = XLSX.utils.book_new()
    }
    const sheet = XLSX.utils.aoa_to_sheet(sheetData)
    if (workbook.SheetNames.includes('Files')) {
      workbook.Sheets['Files'] = sheet
    } else {
      XLSX.utils.book_append_sheet(workbook, sheet, 'Files')
    }
    await fs.promises.writeFile(
      folder + '/metadata.xlsx',
      XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }),
    )
    return { count: files.length }
  },
)

ipcMain.handle(
  'create-archive',
  async (
    _event,
    folderPath: string,
    meta: { name: string; description: string },
  ) => {
    const xlsxPath = folderPath + '/metadata.xlsx'
    const workbook = buildWorkbook('RepositoryObject', meta)
    await fs.promises.writeFile(
      xlsxPath,
      XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }),
    )
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
    rows.push(newRow)
    workbook.Sheets[actualName] = XLSX.utils.aoa_to_sheet(rows)
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
    const rows: string[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: '',
    })
    for (const row of rows) {
      const key = String(row[0] ?? '')
      if (Object.prototype.hasOwnProperty.call(updates, key)) {
        row[1] = updates[key]
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
    const hasPartIndex = headers.findIndex((header) => header === 'isRef_hasPart')

    if (idIndex < 0 || hasPartIndex < 0) {
      return {
        headers: ['@id', '@type', '.folder', '.filename', 'isRef_isPartOf'],
        rows: [] as string[][],
      }
    }

    const derivedRows = deriveFileRowsFromItems(
      rows.slice(1).map((row) => ({
        itemId: String(row[idIndex] ?? ''),
        hasPart: String(row[hasPartIndex] ?? ''),
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

ipcMain.handle('get-root-folder', () => {
  return store.get('rootFolder', null)
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
  return filePaths[0]
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
      'depictions',
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
    let outputRelativePath = path.posix.join('depictions', fileName)
    let outputAbsolutePath = path.join(
      archiveFolderAbsolute,
      outputRelativePath,
    )

    let counter = 1
    while (true) {
      try {
        await fs.promises.access(outputAbsolutePath)
        fileName = `${stem}-depiction-${counter}.jpg`
        outputRelativePath = path.posix.join('depictions', fileName)
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
