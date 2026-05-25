import type { ItemDataType } from '../types/types'

const SHEET_TYPE_MAP: Record<string, ItemDataType> = {
  People: 'Person',
  Languages: 'Language',
  Tags: 'DefinedTerm',
  Places: 'Place',
  Licenses: 'ldac:DataReuseLicense',
}

export function getItemTypeForSheetName(sheetName: string): ItemDataType {
  return SHEET_TYPE_MAP[String(sheetName ?? '').trim()] ?? 'RepositoryObject'
}
