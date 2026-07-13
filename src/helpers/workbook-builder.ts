import * as XLSX from 'xlsx'

import {
  getEntityFieldModel,
  resolveEditableEntityType,
  spreadsheets,
  type SpreadsheetTab,
  type SpreadsheetType,
} from '../types/types'

// Resolves the header set for a tab. By default this is the tab's curated
// header list. When `fullHeaders` is true, every field the entity supports
// (from ENTITY_FIELD_REGISTRY) is unioned in — the tab's own order is kept and
// any additional registry fields are appended. Used to give the downloadable
// donation packs a complete set of columns while keeping in-app archives lean.
function headersForTab(tab: SpreadsheetTab, fullHeaders: boolean): string[] {
  if (!fullHeaders) return tab.headers

  const entityType = resolveEditableEntityType(tab.type)
  if (!entityType) return tab.headers

  const headers = [...tab.headers]
  for (const field of getEntityFieldModel(entityType)) {
    if (!headers.includes(field)) headers.push(field)
  }
  return headers
}

// Builds a metadata workbook for a given spreadsheet schema. Shared by the
// Electron app (folder creation) and the help-site donation-pack generator so
// both produce identical archives. Pass `fullHeaders` to include every
// supported column for each entity (used by the donation starter packs).
export function buildWorkbook(
  schemaKey: SpreadsheetType,
  meta: { name: string; description: string },
  fullHeaders = false,
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
    const rows: string[][] = [
      headersForTab(tab, fullHeaders),
      ...(tab.seedRows ?? []),
    ]
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
