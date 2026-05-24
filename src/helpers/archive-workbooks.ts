import protectedWorkbooksConfig from '../config/protected-workbooks.json'

type ProtectedWorkbooksConfig = {
  names: string[]
  labels: Record<string, string>
}

const { names, labels } = protectedWorkbooksConfig as ProtectedWorkbooksConfig
const ARCHIVE_WORKBOOK_NAMES = new Set(names.map((name) => name.toLowerCase()))

function normalizePathForCompare(pathValue: string): string {
  return pathValue.replace(/\\/g, '/').replace(/\/+$/, '')
}

export function isArchiveWorkbookName(fileName: string): boolean {
  return ARCHIVE_WORKBOOK_NAMES.has(fileName.toLowerCase())
}

export function isArchiveWorkbookPath(filePath: string): boolean {
  const fileName = filePath.split(/[/\\]/).pop() ?? filePath
  return isArchiveWorkbookName(fileName)
}

export function isTagsWorkbookPath(
  filePath: string,
  rootFolder: string | null | undefined,
): boolean {
  if (!rootFolder) return false

  const normalizedFilePath = normalizePathForCompare(filePath)
  const normalizedRootFolder = normalizePathForCompare(rootFolder)

  const fileName = normalizedFilePath.split('/').pop() ?? ''
  if (!/\.xlsx$/i.test(fileName)) return false

  const lastSlash = normalizedFilePath.lastIndexOf('/')
  if (lastSlash < 0) return false

  const parentFolder = normalizedFilePath.slice(0, lastSlash)
  const tagsFolder = `${normalizedRootFolder}/Tags`

  return parentFolder.toLowerCase() === tagsFolder.toLowerCase()
}

export function isArchiveEditableWorkbookPath(
  filePath: string,
  rootFolder: string | null | undefined,
): boolean {
  return (
    isArchiveWorkbookPath(filePath) || isTagsWorkbookPath(filePath, rootFolder)
  )
}

export function getArchiveWorkbookLabel(fileName: string): string {
  const lower = fileName.toLowerCase()
  return labels[lower] ?? fileName
}
