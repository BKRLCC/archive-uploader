import type { DirEntry, SheetData } from '../api'
import {
  workbookNameToTagFieldName,
  workbookNameToTagVocabularyKey,
  type TagVocabulary,
  type TagVocabularyOption,
} from './tags'

const TAGS_FOLDER_NAME = 'Tags'
const IGNORED_SHEET_NAMES = new Set(['rootdataset', 'files'])
const REQUIRED_COLUMNS = ['@id', 'name'] as const

type HeaderIndexMap = Record<string, number>

const normaliseCell = (value: string | undefined): string =>
  String(value ?? '').trim()

const buildHeaderIndexMap = (headers: string[]): HeaderIndexMap => {
  const map: HeaderIndexMap = {}
  headers.forEach((header, index) => {
    map[normaliseCell(header)] = index
  })
  return map
}

const getCell = (row: string[], indexMap: HeaderIndexMap, key: string): string => {
  const index = indexMap[key]
  return normaliseCell(index === undefined ? '' : row[index])
}

const mapRowsToOptions = (
  workbookName: string,
  sheet: SheetData,
): TagVocabularyOption[] => {
  const indexMap = buildHeaderIndexMap(sheet.headers)
  const missingColumns = REQUIRED_COLUMNS.filter(
    (column) => indexMap[column] === undefined,
  )

  if (missingColumns.length > 0) {
    console.warn(
      `[tags-loader] Missing required columns in ${workbookName}: ${missingColumns.join(', ')}`,
    )
    return []
  }

  const optionsById = new Map<string, TagVocabularyOption>()

  sheet.rows.forEach((row) => {
    if (row.every((cell) => !cell || !String(cell).trim())) return

    const id = getCell(row, indexMap, '@id')
    const name = getCell(row, indexMap, 'name')

    if (!id || !name) return

    if (!optionsById.has(id)) {
      optionsById.set(id, {
        value: id,
        label: `${name} (${id})`,
        searchText: `${name} ${id}`.toLowerCase(),
      })
    }
  })

  return Array.from(optionsById.values())
}

const getTagsFolderPath = (rootFolder: string): string => {
  const trimmedRoot = rootFolder.replace(/[\\/]+$/, '')
  return `${trimmedRoot}/${TAGS_FOLDER_NAME}`
}

const isTagWorkbookEntry = (entry: DirEntry): boolean => {
  return !entry.isDirectory && entry.ext.toLowerCase() === 'xlsx'
}

const pickSourceSheetName = (sheetNames: string[]): string | null => {
  for (const name of sheetNames) {
    if (!IGNORED_SHEET_NAMES.has(name.toLowerCase())) return name
  }
  return null
}

export const loadTagVocabulariesFromFolder = async (): Promise<TagVocabulary[]> => {
  const rootFolder = await window.api.getRootFolder()
  if (!rootFolder) {
    console.warn('[tags-loader] No root folder set, skipping Tags load')
    return []
  }

  const tagsFolderPath = getTagsFolderPath(rootFolder)

  let entries: DirEntry[] = []
  try {
    entries = await window.api.listFolder(tagsFolderPath)
  } catch (error) {
    console.warn('[tags-loader] Tags folder missing or inaccessible', error)
    return []
  }

  const workbookEntries = entries.filter(isTagWorkbookEntry)
  const vocabularies: TagVocabulary[] = []

  for (const entry of workbookEntries) {
    const workbookPath = `${tagsFolderPath}/${entry.name}`
    const workbookName = entry.name.replace(/\.xlsx$/i, '')

    if (!workbookName) continue

    try {
      const sheetNames = await window.api.getSheetNames(workbookPath)
      const sourceSheetName = pickSourceSheetName(sheetNames)
      if (!sourceSheetName) {
        console.warn(
          `[tags-loader] No editable sheet found in ${entry.name}; expected a sheet other than RootDataset/Files`,
        )
        continue
      }

      const sheet = await window.api.readSheet(workbookPath, sourceSheetName)
      if (!sheet) {
        console.warn(
          `[tags-loader] Could not read sheet ${sourceSheetName} from ${entry.name}`,
        )
        continue
      }

      const options = mapRowsToOptions(workbookName, sheet)
      const key = workbookNameToTagVocabularyKey(workbookName)

      if (!key) {
        console.warn(
          `[tags-loader] Skipping ${entry.name}; workbook name cannot be mapped to a tag key`,
        )
        continue
      }

      vocabularies.push({
        key,
        workbookName,
        workbookPath,
        sourceSheetName,
        fieldName: workbookNameToTagFieldName(workbookName),
        options,
      })
    } catch (error) {
      console.warn(`[tags-loader] Failed to parse ${entry.name}`, error)
    }
  }

  vocabularies.sort((a, b) => a.workbookName.localeCompare(b.workbookName))
  return vocabularies
}
