/**
 * Generates the downloadable contribution packs for the help site.
 *
 * Produces two zip files of pre-made spreadsheets and folders so donating
 * institutions can start cataloguing. The workbooks are built with the same
 * shared `buildWorkbook` the Electron app uses, so the packs are identical to
 * archives created inside the app.
 *
 * Output (relative to the help-site out/ directory):
 *   contributions/index.html            (copied from help-site/contributions.html)
 *   contributions/downloads/archive-simple.zip
 *   contributions/downloads/archive-full.zip
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import JSZip from 'jszip'
import * as XLSX from 'xlsx'

import { buildWorkbook } from '../src/helpers/workbook-builder'
import {
  SAMPLE_IMAGE_FILENAME,
  SAMPLE_ROOT_DATASET,
} from '../src/samples/sample-data'
import { spreadsheets, type SpreadsheetType } from '../src/types/types'

const HELP_SITE_URL_HINT =
  'For full instructions, see the Archive Spreadsheet Guide (the page you downloaded this from).'

// A folder to include in a pack: its schema key plus the workbook filename the
// app uses for that folder.
interface PackFolder {
  schemaKey: SpreadsheetType
  workbookFileName: string
}

function packFolder(schemaKey: SpreadsheetType): PackFolder {
  return {
    schemaKey,
    workbookFileName: 'metadata.xlsx',
  }
}

// The root Resources workbook (no dedicated folder — sits at the pack root).
const ROOT_FOLDER = packFolder('RepositoryObject')

// Folder name the app uses for license records (single source of truth). Both
// packs get a license explainer here; the full pack also gets the spreadsheet.
const LICENSE_FOLDER = spreadsheets['ldac:DataReuseLicense'].folderName

// Sub-folders included in the full pack, in a sensible reading order.
const FULL_SUBFOLDERS: PackFolder[] = [
  packFolder('People'),
  packFolder('Organisations'),
  packFolder('Places'),
  packFolder('Language'),
  packFolder('ldac:DataReuseLicense'),
]

function workbookBuffer(
  schemaKey: SpreadsheetType,
  filePrefix: string,
): Buffer {
  // Contribution packs include every supported column so institutions can see the
  // full range of information they can record, plus a worked Mona Lisa example.
  // Only the root workbook carries the example collection's RootDataset metadata.
  const meta =
    schemaKey === 'RepositoryObject'
      ? SAMPLE_ROOT_DATASET
      : { name: '', description: '' }
  const workbook = buildWorkbook(schemaKey, meta, true, { filePrefix })
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

function addFolderToZip(
  zip: JSZip,
  folder: PackFolder,
  filePrefix: string,
): void {
  const schema = spreadsheets[folder.schemaKey]
  const prefix = schema.folderName ? `${schema.folderName}/` : ''
  zip.file(
    `${prefix}${folder.workbookFileName}`,
    workbookBuffer(folder.schemaKey, filePrefix),
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
    lines.push(
      '  Licenses/       Add a license describing how files may be used.',
    )
    lines.push('')
    lines.push(
      'Open metadata.xlsx and fill in one row per item on the "Items" tab.',
    )
    lines.push('')
    lines.push('Put the files you are donating in this same folder, alongside')
    lines.push(
      'metadata.xlsx. In the spreadsheet, just write the file name on its',
    )
    lines.push('own (for example: photo.jpg) — no folder needed.')
  } else {
    lines.push('This is the full pack. It contains:')
    lines.push('')
    lines.push('  metadata.xlsx   The main spreadsheet describing your items.')
    lines.push('  files/          Put the files you are donating in here.')
    lines.push('  People/         People referred to by your items.')
    lines.push('  Organisations/  Organisations referred to by your items.')
    lines.push('  Places/         Places referred to by your items.')
    lines.push('  Languages/      Languages spoken in your items.')
    lines.push('  Licenses/       A license describing how files may be used.')
    lines.push('')
    lines.push(
      'Start with metadata.xlsx. Fill in the other spreadsheets only if you',
    )
    lines.push('need them — you do not have to use every folder.')
    lines.push('')
    lines.push('Put the files you are donating in the files/ folder. In the')
    lines.push(
      'spreadsheet, write the path including that folder (for example:',
    )
    lines.push('files/photo.jpg).')
  }
  lines.push('')
  lines.push(HELP_SITE_URL_HINT)
  lines.push('')
  return lines.join('\n')
}

function buildLicenceNote(kind: 'simple' | 'full'): string {
  const lines: string[] = []
  lines.push('ABOUT LICENCES')
  lines.push('==============')
  lines.push('')
  lines.push(
    'A license is a short document that says what people are allowed to do',
  )
  lines.push(
    'with the files you are donating — for example whether they can be',
  )
  lines.push('shared, published, or used by community members and researchers.')
  lines.push('')
  lines.push('Please add a license to this folder describing those terms.')
  if (kind === 'full') {
    lines.push('')
    lines.push(
      'This folder also contains metadata.xlsx, where you can record the',
    )
    lines.push('license details in a spreadsheet if you prefer.')
  }
  lines.push('')
  lines.push('If you are not sure what license to use, we can help you choose.')
  lines.push('')
  return lines.join('\n')
}

async function buildPack(
  folders: PackFolder[],
  kind: 'simple' | 'full',
  imageSrc: string,
): Promise<Buffer> {
  const zip = new JSZip()

  // The full pack keeps files in a dedicated files/ folder; the simple pack is
  // flat, so its example image sits beside metadata.xlsx and is referenced by
  // bare filename.
  const filePrefix = kind === 'full' ? 'files/' : ''

  // Root Resources workbook.
  addFolderToZip(zip, ROOT_FOLDER, filePrefix)

  // Any sub-folders (full pack).
  for (const folder of folders) {
    addFolderToZip(zip, folder, filePrefix)
  }

  // Bundle the worked-example image the sample rows point at.
  zip.file(`${filePrefix}${SAMPLE_IMAGE_FILENAME}`, readFileSync(imageSrc))

  // The full pack keeps a dedicated files/ folder (alongside the example image,
  // with a note pointing donors here for their own files). The simple pack stays
  // flat: donors drop files beside metadata.xlsx and reference them by filename.
  if (kind === 'full') {
    zip.file(
      'files/PUT-YOUR-FILES-HERE.txt',
      'Put the files you are donating into this folder.\n',
    )
  }

  // Both packs include a Licences folder explaining that a license describing
  // what people may do with the files should be added. The full pack also
  // contains the license spreadsheet (added via FULL_SUBFOLDERS above).
  zip.file(`${LICENSE_FOLDER}/ABOUT-LICENCES.txt`, buildLicenceNote(kind))

  zip.file('README.txt', buildReadme(kind))

  return zip.generateAsync({ type: 'nodebuffer' })
}

/**
 * Builds the contribution packs and page into the given help-site out/ directory.
 * `helpDir` is the help-site source directory (where contributions.html lives).
 */
export async function buildContributions(
  outDir: string,
  helpDir: string,
): Promise<void> {
  const contributionsDir = join(outDir, 'contributions')
  const downloadsDir = join(contributionsDir, 'downloads')
  mkdirSync(downloadsDir, { recursive: true })

  // The bundled public-domain sample image lives in the app's samples folder.
  const imageSrc = join(
    helpDir,
    '..',
    'src',
    'samples',
    'files',
    SAMPLE_IMAGE_FILENAME,
  )

  const simpleZip = await buildPack([], 'simple', imageSrc)
  const fullZip = await buildPack(FULL_SUBFOLDERS, 'full', imageSrc)

  writeFileSync(join(downloadsDir, 'archive-simple.zip'), simpleZip)
  writeFileSync(join(downloadsDir, 'archive-full.zip'), fullZip)

  copyFileSync(
    join(helpDir, 'contributions.html'),
    join(contributionsDir, 'index.html'),
  )

  console.log(
    `Contribution packs built: archive-simple.zip, archive-full.zip -> ${downloadsDir}`,
  )
}
