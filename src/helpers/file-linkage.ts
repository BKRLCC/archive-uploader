export type DerivedFileRow = {
  '@id': string
  '@type': 'File'
  '.folder': string
  '.filename': string
  isRef_isPartOf: string
}

function normalizeRelativePath(pathValue: string): string {
  return String(pathValue ?? '')
    .trim()
    .replace(/\\+/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '')
}

export function parseHasPartPaths(rawValue: string): string[] {
  const unique = new Set<string>()

  for (const token of String(rawValue ?? '').split(',')) {
    const normalized = normalizeRelativePath(token)
    if (!normalized) continue
    unique.add(normalized)
  }

  return Array.from(unique)
}

function buildBaseFileId(relativePath: string): string {
  const normalized = normalizeRelativePath(relativePath)
  const slug = normalized
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return `#File_${slug || 'path'}`
}

export function deriveFileRowsFromItems(
  rows: Array<{ itemId: string; hasPart: string }>,
): DerivedFileRow[] {
  const derived: DerivedFileRow[] = []
  const idCounts = new Map<string, number>()

  for (const row of rows) {
    const itemId = String(row.itemId ?? '').trim()
    if (!itemId) continue

    const paths = parseHasPartPaths(row.hasPart)
    for (const relativePath of paths) {
      const parts = relativePath.split('/').filter(Boolean)
      if (parts.length === 0) continue

      const filename = parts[parts.length - 1]
      if (!filename) continue
      const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : '.'

      const baseId = buildBaseFileId(relativePath)
      const seen = idCounts.get(baseId) ?? 0
      idCounts.set(baseId, seen + 1)
      const fileId = seen === 0 ? baseId : `${baseId}_${seen + 1}`

      derived.push({
        '@id': fileId,
        '@type': 'File',
        '.folder': folder,
        '.filename': filename,
        isRef_isPartOf: itemId,
      })
    }
  }

  return derived
}
