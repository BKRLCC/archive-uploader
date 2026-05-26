import type { SheetData } from '../api'
import type { Place } from '../types/types'

const PLACE_WORKBOOK_RELATIVE_PATHS = [
  'Places/places.xlsx',
  'Places/metadata.xlsx',
] as const

const PLACE_TAB_CANDIDATES = ['Places', 'Place'] as const
const REQUIRED_COLUMNS = ['@id', '@type', 'name'] as const

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

const looksLikePlaceType = (rawType: string): boolean => {
  if (!rawType) return false
  if (rawType === 'Place') return true
  return rawType.includes('Place')
}

const mapRowsToPlaces = (sheet: SheetData): Place[] => {
  const indexMap = buildHeaderIndexMap(sheet.headers)
  const missingColumns = REQUIRED_COLUMNS.filter(
    (column) => indexMap[column] === undefined,
  )

  if (missingColumns.length > 0) {
    console.warn(
      `[places-loader] Missing required columns: ${missingColumns.join(', ')}`,
    )
    return []
  }

  const places: Place[] = []
  let droppedRows = 0

  sheet.rows.forEach((row) => {
    if (row.every((cell) => !cell || !String(cell).trim())) return

    const id = getCell(row, indexMap, '@id')
    const rawType = getCell(row, indexMap, '@type')
    const name = getCell(row, indexMap, 'name')

    if (!id || !name || !looksLikePlaceType(rawType)) {
      droppedRows += 1
      return
    }

    const place: Place = {
      '@id': id,
      '@type': 'Place',
      name,
    }

    const description = getCell(row, indexMap, 'description')
    const depiction = getCell(row, indexMap, 'depiction')
    const isRefGeo = getCell(row, indexMap, 'isRef_geo')

    if (description) place.description = description
    if (depiction) place.depiction = depiction
    if (isRefGeo) place.isRef_geo = isRefGeo

    places.push(place)
  })

  if (droppedRows > 0) {
    console.warn(`[places-loader] Dropped ${droppedRows} invalid Place row(s)`)
  }

  return places
}

const loadFromWorkbookPath = async (
  rootFolder: string,
  relativePath: string,
): Promise<Place[] | null> => {
  const workbookPath = `${rootFolder}/${relativePath}`

  for (const tabName of PLACE_TAB_CANDIDATES) {
    const sheet = await window.api.readSheet(workbookPath, tabName)
    if (sheet) return mapRowsToPlaces(sheet)
  }

  return null
}

export const loadPlacesFromSpreadsheet = async (): Promise<Place[]> => {
  const rootFolder = await window.api.getRootFolder()
  if (!rootFolder) {
    console.warn('[places-loader] No root folder set, skipping Places load')
    return []
  }

  const trimmedRoot = rootFolder.replace(/[\\/]+$/, '')

  for (const relativePath of PLACE_WORKBOOK_RELATIVE_PATHS) {
    try {
      const result = await loadFromWorkbookPath(trimmedRoot, relativePath)
      if (result) return result
    } catch (error) {
      console.warn(`[places-loader] Failed to load from ${relativePath}`, error)
    }
  }

  console.warn('[places-loader] No Places workbook/tab found')
  return []
}
