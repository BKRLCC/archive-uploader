import protectedWorkbooksConfig from '../config/protected-workbooks.json'

type ProtectedWorkbooksConfig = {
  names: string[]
  labels: Record<string, string>
}

const { names, labels } = protectedWorkbooksConfig as ProtectedWorkbooksConfig
const ARCHIVE_WORKBOOK_NAMES = new Set(names.map((name) => name.toLowerCase()))

export function isArchiveWorkbookName(fileName: string): boolean {
  return ARCHIVE_WORKBOOK_NAMES.has(fileName.toLowerCase())
}

export function isArchiveWorkbookPath(filePath: string): boolean {
  const fileName = filePath.split(/[/\\]/).pop() ?? filePath
  return isArchiveWorkbookName(fileName)
}

export function getArchiveWorkbookLabel(fileName: string): string {
  const lower = fileName.toLowerCase()
  return labels[lower] ?? fileName
}
