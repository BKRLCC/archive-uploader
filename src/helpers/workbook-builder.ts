import * as XLSX from 'xlsx'

import { groupRenderedFields } from '../config/field-groups'
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

// Orders a tab's headers to match the edit-form field grouping (FIELD_GROUPS)
// so related columns sit together and the sheets are easier to fill in. `@id`
// and `@type` are pinned first; grouped fields follow in config order; any
// fields not in a group keep their original order at the end. The result is a
// permutation of the input — no column is added or removed.
function orderHeaders(headers: string[]): string[] {
  const pinned = ['@id', '@type'].filter((h) => headers.includes(h))
  const rest = headers.filter((h) => !pinned.includes(h))

  const grouped = groupRenderedFields(rest).flatMap((group) => group.fields)
  const claimed = new Set(grouped)
  const leftovers = rest.filter((h) => !claimed.has(h))

  return [...pinned, ...grouped, ...leftovers]
}

// Computes sensible column widths (in characters) for a sheet by auto-fitting
// each column to its longest cell, clamped to a readable min/max. Applied to
// every generated sheet so downloaded workbooks aren't cramped.
function columnWidths(rows: string[][]): { wch: number }[] {
  const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0)
  const MIN_WIDTH = 12
  const MAX_WIDTH = 45
  const PADDING = 2

  const widths: { wch: number }[] = []
  for (let col = 0; col < columnCount; col++) {
    let longest = 0
    for (const row of rows) {
      const cell = row[col]
      if (cell != null) longest = Math.max(longest, String(cell).length)
    }
    const wch = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, longest + PADDING))
    widths.push({ wch })
  }
  return widths
}

// Builds a metadata workbook for a given spreadsheet schema. Shared by the
// Electron app (folder creation) and the help-site donation-pack generator so
// both produce identical archives. Pass `fullHeaders` to include every
// supported column for each entity (used by the donation starter packs).
export function buildWorkbook(
  schemaKey: SpreadsheetType,
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
  },
  fullHeaders = false,
): XLSX.WorkBook {
  const schema = spreadsheets[schemaKey]
  const workbook = XLSX.utils.book_new()

  const rootDatasetRows: string[][] = [
    ['Name', 'Value'],
    ['@id', './'],
    ['@type', '[Dataset, RepositoryCollection]'],
    ['name', meta.name],
    ['description', meta.description],
    ['identifier', meta.identifier ?? ''],
    ['isRef_license', meta.isRef_license ?? ''],
    ['isRef_author', meta.isRef_author ?? ''],
    ['isRef_publisher', meta.isRef_publisher ?? ''],
    ['datePublished', meta.datePublished ?? ''],
    ['isRef_inLanguage', meta.isRef_inLanguage ?? ''],
    ['isRef_ldac:subjectLanguage', meta['isRef_ldac:subjectLanguage'] ?? ''],
    ['ldac:metadataIsPublic', meta['ldac:metadataIsPublic'] ?? 'FALSE'],
  ]
  const rootDataset = XLSX.utils.aoa_to_sheet(rootDatasetRows)
  rootDataset['!cols'] = columnWidths(rootDatasetRows)
  XLSX.utils.book_append_sheet(workbook, rootDataset, 'RootDataset')

  for (const tab of schema.tabs) {
    const baseHeaders = headersForTab(tab, fullHeaders)
    const orderedHeaders = orderHeaders(baseHeaders)
    // Reorder each seed row to match the reordered headers so the seed data
    // stays aligned with its columns.
    const permutation = orderedHeaders.map((h) => baseHeaders.indexOf(h))
    const seedRows = (tab.seedRows ?? []).map((row) =>
      permutation.map((sourceIndex) => row[sourceIndex] ?? ''),
    )
    const rows: string[][] = [orderedHeaders, ...seedRows]
    const sheet = XLSX.utils.aoa_to_sheet(rows)
    sheet['!cols'] = columnWidths(rows)
    XLSX.utils.book_append_sheet(workbook, sheet, tab.name)
  }

  for (const extra of schema.extraSheets ?? []) {
    const sheet = XLSX.utils.aoa_to_sheet(extra.rows)
    sheet['!cols'] = columnWidths(extra.rows)
    XLSX.utils.book_append_sheet(workbook, sheet, extra.name)
  }

  return workbook
}
