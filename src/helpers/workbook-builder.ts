import * as XLSX from 'xlsx'

import { groupRenderedFields } from '../config/field-groups'
import { getSampleEntitiesForType } from '../samples/sample-data'
import {
  getEntityFieldModel,
  resolveEditableEntityType,
  spreadsheets,
  type SpreadsheetTab,
  type SpreadsheetType,
} from '../types/types'

// Converts a typed entity into a sheet row aligned to `headers`, looking each
// column up by field name. Booleans serialise as TRUE/FALSE; missing fields
// become empty cells.
function entityToRow(
  entity: Record<string, unknown>,
  headers: string[],
): string[] {
  return headers.map((header) => {
    const value = entity[header]
    if (value === undefined || value === null) return ''
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
    return String(value)
  })
}

// Resolves the header set for a tab. By default this is the tab's curated
// header list. When `fullHeaders` is true, every field the entity supports
// (from ENTITY_FIELD_REGISTRY) is unioned in — the tab's own order is kept and
// any additional registry fields are appended. Used to give the downloadable
// contribution packs a complete set of columns while keeping in-app archives lean.
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

  const ordered = [...pinned, ...grouped, ...leftovers]

  // Keep the human-readable approximate date beside its exact date. It is not in
  // any field group (the edit form shows it inline under Date created), so it
  // would otherwise land among the ungrouped leftovers at the end of the sheet.
  return moveAfter(ordered, 'dateCreatedApproximate', 'dateCreated')
}

// Moves `field` to sit immediately after `anchor` in the list, if both are
// present. Returns the list unchanged otherwise.
function moveAfter(fields: string[], field: string, anchor: string): string[] {
  const fieldIndex = fields.indexOf(field)
  const anchorIndex = fields.indexOf(anchor)
  if (fieldIndex < 0 || anchorIndex < 0) return fields

  const without = fields.filter((_, index) => index !== fieldIndex)
  const insertAt = without.indexOf(anchor) + 1
  without.splice(insertAt, 0, field)
  return without
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
// Electron app (folder creation) and the help-site contribution-pack generator so
// both produce identical archives. Pass `fullHeaders` to include every
// supported column for each entity (used by the contribution starter packs).
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
  includeSamples = false,
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
    const sampleRows = includeSamples
      ? getSampleEntitiesForType(tab.type).map((entity) =>
          entityToRow(entity, orderedHeaders),
        )
      : []
    const rows: string[][] = [orderedHeaders, ...seedRows, ...sampleRows]
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
