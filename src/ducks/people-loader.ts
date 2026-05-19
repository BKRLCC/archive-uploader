import type { SheetData } from '../api'
import type { Person } from '../types/types'

const PEOPLE_WORKBOOK_RELATIVE_PATH = 'People/people.xlsx'
const PEOPLE_TAB_NAME = 'People'

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

const looksLikePersonType = (rawType: string): boolean => {
  if (!rawType) return false
  if (rawType === 'Person') return true
  return rawType.includes('Person')
}

const mapRowsToPeople = (sheet: SheetData): Person[] => {
  const indexMap = buildHeaderIndexMap(sheet.headers)
  const missingColumns = REQUIRED_COLUMNS.filter(
    (column) => indexMap[column] === undefined,
  )

  if (missingColumns.length > 0) {
    console.warn(
      `[people-loader] Missing required columns in ${PEOPLE_TAB_NAME}: ${missingColumns.join(', ')}`,
    )
    return []
  }

  const people: Person[] = []
  let droppedRows = 0

  sheet.rows.forEach((row) => {
    const id = getCell(row, indexMap, '@id')
    const rawType = getCell(row, indexMap, '@type')
    const name = getCell(row, indexMap, 'name')

    if (!id || !name || !looksLikePersonType(rawType)) {
      droppedRows += 1
      return
    }

    const person: Person = {
      '@id': id,
      '@type': 'Person',
      name,
    }

    const description = getCell(row, indexMap, 'description')
    const gender = getCell(row, indexMap, 'gender')
    const birthDate = getCell(row, indexMap, 'birthDate')

    if (description) person.description = description
    if (gender) person.gender = gender
    if (birthDate) person.birthDate = birthDate

    people.push(person)
  })

  if (droppedRows > 0) {
    console.warn(`[people-loader] Dropped ${droppedRows} invalid People row(s)`)
  }

  return people
}

export const loadPeopleFromSpreadsheet = async (): Promise<Person[]> => {
  const rootFolder = await window.api.getRootFolder()
  if (!rootFolder) {
    console.warn('[people-loader] No root folder set, skipping People load')
    return []
  }

  const trimmedRoot = rootFolder.replace(/[\\/]+$/, '')
  const workbookPath = `${trimmedRoot}/${PEOPLE_WORKBOOK_RELATIVE_PATH}`

  try {
    const sheet = await window.api.readSheet(workbookPath, PEOPLE_TAB_NAME)
    if (!sheet) {
      console.warn(
        `[people-loader] Could not find workbook/tab at ${workbookPath} (${PEOPLE_TAB_NAME})`,
      )
      return []
    }

    return mapRowsToPeople(sheet)
  } catch (error) {
    console.warn('[people-loader] Failed to load People spreadsheet', error)
    return []
  }
}
