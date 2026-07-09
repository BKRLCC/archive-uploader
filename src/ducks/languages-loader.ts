import type { SheetData } from '../api'
import type { Language } from '../types/types'

const LANGUAGE_WORKBOOK_RELATIVE_PATHS = [
  'Languages/languages.xlsx',
  'Languages/metadata.xlsx',
] as const

const LANGUAGE_TAB_CANDIDATES = ['Languages', 'Language'] as const
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

const looksLikeLanguageType = (rawType: string): boolean => {
  if (!rawType) return false
  if (rawType === 'Language') return true
  return rawType.includes('Language')
}

const mapRowsToLanguages = (sheet: SheetData): Language[] => {
  const indexMap = buildHeaderIndexMap(sheet.headers)
  const missingColumns = REQUIRED_COLUMNS.filter(
    (column) => indexMap[column] === undefined,
  )

  if (missingColumns.length > 0) {
    console.warn(
      `[languages-loader] Missing required columns: ${missingColumns.join(', ')}`,
    )
    return []
  }

  const languages: Language[] = []
  let droppedRows = 0

  sheet.rows.forEach((row) => {
    if (row.every((cell) => !cell || !String(cell).trim())) return

    const id = getCell(row, indexMap, '@id')
    const rawType = getCell(row, indexMap, '@type')
    const name = getCell(row, indexMap, 'name')

    if (!id || !name || !looksLikeLanguageType(rawType)) {
      droppedRows += 1
      return
    }

    const language: Language = {
      '@id': id,
      '@type': 'Language',
      name,
    }

    const description = getCell(row, indexMap, 'description')
    const depiction = getCell(row, indexMap, 'depiction')
    const languageCode = getCell(row, indexMap, 'languageCode')
    const sameAs = getCell(row, indexMap, 'sameAs')
    if (description) language.description = description
    if (depiction) language.depiction = depiction
    if (languageCode) language.languageCode = languageCode
    if (sameAs) language.sameAs = sameAs

    languages.push(language)
  })

  if (droppedRows > 0) {
    console.warn(
      `[languages-loader] Dropped ${droppedRows} invalid Language row(s)`,
    )
  }

  return languages
}

const loadFromWorkbookPath = async (
  rootFolder: string,
  relativePath: string,
): Promise<Language[] | null> => {
  const workbookPath = `${rootFolder}/${relativePath}`

  for (const tabName of LANGUAGE_TAB_CANDIDATES) {
    const sheet = await window.api.readSheet(workbookPath, tabName)
    if (sheet) return mapRowsToLanguages(sheet)
  }

  return null
}

export const loadLanguagesFromSpreadsheet = async (): Promise<Language[]> => {
  const rootFolder = await window.api.getRootFolder()
  if (!rootFolder) {
    console.warn(
      '[languages-loader] No root folder set, skipping Language load',
    )
    return []
  }

  const trimmedRoot = rootFolder.replace(/[\\/]+$/, '')

  for (const relativePath of LANGUAGE_WORKBOOK_RELATIVE_PATHS) {
    try {
      const result = await loadFromWorkbookPath(trimmedRoot, relativePath)
      if (result) return result
    } catch (error) {
      console.warn(
        `[languages-loader] Failed to load from ${relativePath}`,
        error,
      )
    }
  }

  console.warn('[languages-loader] No Language workbook/tab found')
  return []
}
