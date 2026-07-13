/**
 * Generates the downloadable donation packs for the help site.
 *
 * Produces two zip files of pre-made spreadsheets and folders so donating
 * institutions can start cataloguing. The workbooks are built with the same
 * shared `buildWorkbook` the Electron app uses, so the packs are identical to
 * archives created inside the app.
 *
 * Output (relative to the help-site out/ directory):
 *   donations/index.html            (copied from help-site/donations.html)
 *   donations/downloads/archive-simple.zip
 *   donations/downloads/archive-full.zip
 */
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import JSZip from 'jszip'
import * as XLSX from 'xlsx'

import { buildWorkbook } from '../src/helpers/workbook-builder'
import { spreadsheets, type SpreadsheetType } from '../src/types/types'

const HELP_SITE_URL_HINT =
  'For full instructions, see the Archive Spreadsheet Guide (the page you downloaded this from).'

// A folder to include in a pack: its schema key plus the workbook filename the
// app uses for that folder (Localities is the only one that differs).
interface PackFolder {
  schemaKey: SpreadsheetType
  workbookFileName: string
}

function packFolder(schemaKey: SpreadsheetType): PackFolder {
  return {
    schemaKey,
    workbookFileName:
      schemaKey === 'Localities' ? 'localities.xlsx' : 'metadata.xlsx',
  }
}

// The root Resources workbook (no dedicated folder — sits at the pack root).
const ROOT_FOLDER = packFolder('RepositoryObject')

// Sub-folders included in the full pack, in a sensible reading order.
const FULL_SUBFOLDERS: PackFolder[] = [
  packFolder('People'),
  packFolder('Organisations'),
  packFolder('Places'),
  packFolder('Localities'),
  packFolder('Language'),
  packFolder('ldac:DataReuseLicense'),
]

function workbookBuffer(schemaKey: SpreadsheetType): Buffer {
  // Donation packs include every supported column so institutions can see the
  // full range of information they can record.
  const workbook = buildWorkbook(schemaKey, { name: '', description: '' }, true)
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

function addFolderToZip(zip: JSZip, folder: PackFolder): void {
  const schema = spreadsheets[folder.schemaKey]
  const prefix = schema.folderName ? `${schema.folderName}/` : ''
  zip.file(
    `${prefix}${folder.workbookFileName}`,
    workbookBuffer(folder.schemaKey),
  )
}

function buildReadme(kind: 'simple' | 'full'): string {
  const lines: string[] = []
  lines.push('ARCHIVE STARTER PACK')
  lines.push('====================')
  lines.push('')
  if (kind === 'simple') {
    lines.push('This is the simple pack. It contains:')
    lines.push('')
    lines.push('  metadata.xlsx   The main spreadsheet describing your items.')
    lines.push('  files/          Put the files you are donating in here.')
    lines.push('')
    lines.push(
      'Open metadata.xlsx and fill in one row per item on the "Items" tab.',
    )
  } else {
    lines.push('This is the full pack. It contains:')
    lines.push('')
    lines.push('  metadata.xlsx   The main spreadsheet describing your items.')
    lines.push('  files/          Put the files you are donating in here.')
    lines.push('  People/         People referred to by your items.')
    lines.push('  Organisations/  Organisations referred to by your items.')
    lines.push('  Places/         Places referred to by your items.')
    lines.push('  Localities/     Map localities (geographic areas).')
    lines.push('  Languages/      Languages spoken in your items.')
    lines.push('  Licenses/       Reuse licenses for your items.')
    lines.push('')
    lines.push(
      'Start with metadata.xlsx. Fill in the other spreadsheets only if you',
    )
    lines.push('need them — you do not have to use every folder.')
  }
  lines.push('')
  lines.push(HELP_SITE_URL_HINT)
  lines.push('')
  return lines.join('\n')
}

async function buildPack(
  folders: PackFolder[],
  kind: 'simple' | 'full',
): Promise<Buffer> {
  const zip = new JSZip()

  // Root Resources workbook.
  addFolderToZip(zip, ROOT_FOLDER)

  // Any sub-folders (full pack).
  for (const folder of folders) {
    addFolderToZip(zip, folder)
  }

  // A placeholder so the (otherwise empty) files folder survives zipping.
  zip.file(
    'files/PUT-YOUR-FILES-HERE.txt',
    'Put the files you are donating into this folder.\n',
  )

  zip.file('README.txt', buildReadme(kind))

  return zip.generateAsync({ type: 'nodebuffer' })
}

/**
 * Builds the donation packs and page into the given help-site out/ directory.
 * `helpDir` is the help-site source directory (where donations.html lives).
 */
export async function buildDonations(
  outDir: string,
  helpDir: string,
): Promise<void> {
  const donationsDir = join(outDir, 'donations')
  const downloadsDir = join(donationsDir, 'downloads')
  mkdirSync(downloadsDir, { recursive: true })

  const simpleZip = await buildPack([], 'simple')
  const fullZip = await buildPack(FULL_SUBFOLDERS, 'full')

  writeFileSync(join(downloadsDir, 'archive-simple.zip'), simpleZip)
  writeFileSync(join(downloadsDir, 'archive-full.zip'), fullZip)

  copyFileSync(
    join(helpDir, 'donations.html'),
    join(donationsDir, 'index.html'),
  )

  console.log(
    `Donation packs built: archive-simple.zip, archive-full.zip -> ${downloadsDir}`,
  )
}
