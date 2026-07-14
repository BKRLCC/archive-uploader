import type { SheetData } from '../api'
import type { License } from '../types/types'

const LICENSES_WORKBOOK_RELATIVE_PATHS = [
  'Licenses/licenses.xlsx',
  'Licenses/metadata.xlsx',
] as const
const LICENSES_TAB_NAME = 'Licenses'

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

const looksLikeLicenseType = (rawType: string): boolean => {
  if (!rawType) return false
  return rawType.includes('DataReuseLicense')
}

const mapRowsToLicenses = (sheet: SheetData): License[] => {
  const indexMap = buildHeaderIndexMap(sheet.headers)
  const missingColumns = REQUIRED_COLUMNS.filter(
    (column) => indexMap[column] === undefined,
  )

  if (missingColumns.length > 0) {
    console.warn(
      `[licenses-loader] Missing required columns in ${LICENSES_TAB_NAME}: ${missingColumns.join(', ')}`,
    )
    return []
  }

  const licenses: License[] = []
  let droppedRows = 0

  sheet.rows.forEach((row) => {
    // Skip entirely empty rows (Excel trailing rows)
    if (row.every((cell) => !cell || !String(cell).trim())) return

    const id = getCell(row, indexMap, '@id')
    const rawType = getCell(row, indexMap, '@type')
    const name = getCell(row, indexMap, 'name')

    if (!id || !name || !looksLikeLicenseType(rawType)) {
      droppedRows += 1
      return
    }

    const license: License = {
      '@id': id,
      '@type': 'ldac:DataReuseLicense',
      name,
      'ldac:allowTextIndex':
        getCell(row, indexMap, 'ldac:allowTextIndex').toUpperCase() === 'TRUE',
    }

    const description = getCell(row, indexMap, 'description')
    if (description) license.description = description

    licenses.push(license)
  })

  if (droppedRows > 0) {
    console.warn(
      `[licenses-loader] Dropped ${droppedRows} invalid Licenses row(s)`,
    )
  }

  return licenses
}

export const loadLicensesFromSpreadsheet = async (): Promise<License[]> => {
  const rootFolder = await window.api.getRootFolder()
  if (!rootFolder) {
    console.warn('[licenses-loader] No root folder set, skipping Licenses load')
    return []
  }

  const trimmedRoot = rootFolder.replace(/[\\/]+$/, '')
  for (const relativePath of LICENSES_WORKBOOK_RELATIVE_PATHS) {
    const workbookPath = `${trimmedRoot}/${relativePath}`
    try {
      const sheet = await window.api.readSheet(workbookPath, LICENSES_TAB_NAME)
      if (sheet) return mapRowsToLicenses(sheet)
    } catch (error) {
      console.warn(
        `[licenses-loader] Failed to load workbook at ${relativePath}`,
        error,
      )
    }
  }

  console.warn(
    `[licenses-loader] Could not find workbook/tab for ${LICENSES_TAB_NAME} in: ${LICENSES_WORKBOOK_RELATIVE_PATHS.join(', ')}`,
  )
  return []
}
