import type { SheetData } from '../api'
import type { Geometry } from '../types/types'

const LOCALITIES_WORKBOOK_RELATIVE_PATHS = [
  'Localities/localities.xlsx',
  'Localities/metadata.xlsx',
] as const

const LEGACY_WORKBOOK_RELATIVE_PATHS = [
  'Places/places.xlsx',
  'Places/metadata.xlsx',
] as const

const LOCALITIES_TAB_CANDIDATES = [
  'Localities',
  'Geometries',
  'Geometry',
] as const
const REQUIRED_COLUMNS = ['@id', '@type'] as const

type HeaderIndexMap = Record<string, number>

const normalizeCell = (value: string | undefined): string =>
  String(value ?? '').trim()

const buildHeaderIndexMap = (headers: string[]): HeaderIndexMap => {
  const map: HeaderIndexMap = {}
  headers.forEach((header, index) => {
    map[normalizeCell(header)] = index
  })
  return map
}

const getCell = (
  row: string[],
  indexMap: HeaderIndexMap,
  key: string,
): string => {
  const index = indexMap[key]
  return normalizeCell(index === undefined ? '' : row[index])
}

const looksLikeGeometryType = (rawType: string): boolean => {
  if (!rawType) return false
  if (rawType === 'Geometry') return true
  return rawType.includes('Geometry')
}

const mapRowsToLocalities = (sheet: SheetData): Geometry[] => {
  const indexMap = buildHeaderIndexMap(sheet.headers)
  const missingColumns = REQUIRED_COLUMNS.filter(
    (column) => indexMap[column] === undefined,
  )

  if (missingColumns.length > 0) {
    console.warn(
      `[localities-loader] Missing required columns: ${missingColumns.join(', ')}`,
    )
    return []
  }

  const localities: Geometry[] = []
  let droppedRows = 0

  sheet.rows.forEach((row) => {
    if (row.every((cell) => !cell || !String(cell).trim())) return

    const id = getCell(row, indexMap, '@id')
    const rawType = getCell(row, indexMap, '@type')

    if (!id || !looksLikeGeometryType(rawType)) {
      droppedRows += 1
      return
    }

    localities.push({
      '@id': id,
      '@type': 'Geometry',
      '.latitude': getCell(row, indexMap, '.latitude'),
      '.longitude': getCell(row, indexMap, '.longitude'),
      asWKT: getCell(row, indexMap, 'asWKT'),
    })
  })

  if (droppedRows > 0) {
    console.warn(
      `[localities-loader] Dropped ${droppedRows} invalid locality row(s)`,
    )
  }

  return localities
}

const loadFromWorkbookPath = async (
  rootFolder: string,
  relativePath: string,
): Promise<Geometry[] | null> => {
  const workbookPath = `${rootFolder}/${relativePath}`

  for (const tabName of LOCALITIES_TAB_CANDIDATES) {
    const sheet = await window.api.readSheet(workbookPath, tabName)
    if (sheet) return mapRowsToLocalities(sheet)
  }

  return null
}

export const loadLocalitiesFromSpreadsheet = async (): Promise<Geometry[]> => {
  const rootFolder = await window.api.getRootFolder()
  if (!rootFolder) {
    console.warn(
      '[localities-loader] No root folder set, skipping Localities load',
    )
    return []
  }

  const trimmedRoot = rootFolder.replace(/[\\/]+$/, '')

  for (const relativePath of LOCALITIES_WORKBOOK_RELATIVE_PATHS) {
    try {
      const result = await loadFromWorkbookPath(trimmedRoot, relativePath)
      if (result) return result
    } catch (error) {
      console.warn(
        `[localities-loader] Failed to load from ${relativePath}`,
        error,
      )
    }
  }

  for (const relativePath of LEGACY_WORKBOOK_RELATIVE_PATHS) {
    try {
      const result = await loadFromWorkbookPath(trimmedRoot, relativePath)
      if (result) return result
    } catch (error) {
      console.warn(
        `[localities-loader] Failed legacy fallback from ${relativePath}`,
        error,
      )
    }
  }

  console.warn('[localities-loader] No Localities workbook/tab found')
  return []
}
