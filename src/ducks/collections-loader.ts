import type { SheetData } from '../api'
import type { CollectionSummary } from '../types/types'

const ROOT_WORKBOOK_RELATIVE_PATH = 'metadata.xlsx'
const ROOT_DATASET_TAB_NAME = 'RootDataset'

const normaliseCell = (value: string | undefined) => String(value ?? '').trim()

// Reads the archive's top-level RootDataset (Name/Value rows) and returns it as
// a single-entry collection list, keyed by its stable identifier.
const mapRootDatasetToCollection = (sheet: SheetData): CollectionSummary[] => {
  const valueIndex = sheet.headers.indexOf('Value')
  const lookupIndex = valueIndex === -1 ? 1 : valueIndex
  const byName: Record<string, string> = {}
  sheet.rows.forEach((row) => {
    const key = normaliseCell(row[0])
    if (key) byName[key] = normaliseCell(row[lookupIndex])
  })

  const identifier = byName['identifier']
  if (!identifier) return []
  return [{ identifier, name: byName['name'] ?? '' }]
}

export const loadRootCollectionFromSpreadsheet = async (): Promise<
  CollectionSummary[]
> => {
  const rootFolder = await window.api.getRootFolder()
  if (!rootFolder) {
    console.warn(
      '[collections-loader] No root folder set, skipping root collection load',
    )
    return []
  }

  const trimmedRoot = rootFolder.replace(/[\\/]+$/, '')
  const workbookPath = `${trimmedRoot}/${ROOT_WORKBOOK_RELATIVE_PATH}`
  try {
    const sheet = await window.api.readSheet(
      workbookPath,
      ROOT_DATASET_TAB_NAME,
    )
    if (sheet) return mapRootDatasetToCollection(sheet)
  } catch (error) {
    console.warn(
      `[collections-loader] Failed to load root collection at ${ROOT_WORKBOOK_RELATIVE_PATH}`,
      error,
    )
  }

  return []
}
