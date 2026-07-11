import type { SheetData } from '../api'
import type { Organization } from '../types/types'

const ORGANIZATIONS_WORKBOOK_RELATIVE_PATHS = [
  'Organisations/organisations.xlsx',
  'Organisations/metadata.xlsx',
] as const
const ORGANIZATIONS_TAB_NAME = 'Organisations'

const REQUIRED_COLUMNS = ['@id', '@type', 'name'] as const

type HeaderIndexMap = Record<string, number>

const normaliseCell = (value: string | undefined) => String(value ?? '').trim()

const buildHeaderIndexMap = (headers: string[]): HeaderIndexMap => {
  const map: HeaderIndexMap = {}
  headers.forEach((header, index) => {
    map[normaliseCell(header)] = index
  })
  return map
}

const getCell = (
  row: string[],
  indexMap: HeaderIndexMap,
  key: string,
): string => {
  const index = indexMap[key]
  return normaliseCell(index === undefined ? '' : row[index])
}

const looksLikeOrganizationType = (rawType: string): boolean => {
  if (!rawType) return false
  if (rawType === 'Organization') return true
  return rawType.includes('Organization')
}

const mapRowsToOrganizations = (sheet: SheetData): Organization[] => {
  const indexMap = buildHeaderIndexMap(sheet.headers)
  const missingColumns = REQUIRED_COLUMNS.filter(
    (column) => indexMap[column] === undefined,
  )

  if (missingColumns.length > 0) {
    console.warn(
      `[organizations-loader] Missing required columns in ${ORGANIZATIONS_TAB_NAME}: ${missingColumns.join(', ')}`,
    )
    return []
  }

  const organizations: Organization[] = []
  let droppedRows = 0

  sheet.rows.forEach((row) => {
    // Skip entirely empty rows (Excel trailing rows)
    if (row.every((cell) => !cell || !String(cell).trim())) return

    const id = getCell(row, indexMap, '@id')
    const rawType = getCell(row, indexMap, '@type')
    const name = getCell(row, indexMap, 'name')

    if (!id || !name || !looksLikeOrganizationType(rawType)) {
      droppedRows += 1
      return
    }

    const organization: Organization = {
      '@id': id,
      '@type': 'Organization',
      name,
    }

    const description = getCell(row, indexMap, 'description')
    const depiction = getCell(row, indexMap, 'depiction')
    const url = getCell(row, indexMap, 'url')
    const sameAs = getCell(row, indexMap, 'sameAs')

    if (description) organization.description = description
    if (depiction) organization.depiction = depiction
    if (url) organization.url = url
    if (sameAs) organization.sameAs = sameAs

    organizations.push(organization)
  })

  if (droppedRows > 0) {
    console.warn(
      `[organizations-loader] Dropped ${droppedRows} invalid Organisation row(s)`,
    )
  }

  return organizations
}

export const loadOrganizationsFromSpreadsheet = async (): Promise<
  Organization[]
> => {
  const rootFolder = await window.api.getRootFolder()
  if (!rootFolder) {
    console.warn(
      '[organizations-loader] No root folder set, skipping Organisations load',
    )
    return []
  }

  const trimmedRoot = rootFolder.replace(/[\\/]+$/, '')
  for (const relativePath of ORGANIZATIONS_WORKBOOK_RELATIVE_PATHS) {
    const workbookPath = `${trimmedRoot}/${relativePath}`
    try {
      const sheet = await window.api.readSheet(
        workbookPath,
        ORGANIZATIONS_TAB_NAME,
      )
      if (sheet) return mapRowsToOrganizations(sheet)
    } catch (error) {
      console.warn(
        `[organizations-loader] Failed to load workbook at ${relativePath}`,
        error,
      )
    }
  }

  console.warn(
    `[organizations-loader] Could not find workbook/tab for ${ORGANIZATIONS_TAB_NAME} in: ${ORGANIZATIONS_WORKBOOK_RELATIVE_PATHS.join(', ')}`,
  )
  return []
}
