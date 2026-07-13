import * as XLSX from 'xlsx'

import { spreadsheets, type SpreadsheetType } from '../types/types'

// Builds a metadata workbook for a given spreadsheet schema. Shared by the
// Electron app (folder creation) and the help-site donation-pack generator so
// both produce identical archives.
export function buildWorkbook(
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
