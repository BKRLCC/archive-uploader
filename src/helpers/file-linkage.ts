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

// The File @id is the collection-relative path, matching the value objects carry
// in isRef_hasPart, so ro-crate-excel can resolve object → file links.
export function deriveFileRowsFromItems(
  rows: Array<{ itemId: string; hasPart: string }>,
): DerivedFileRow[] {
  const byPath = new Map<string, DerivedFileRow>()
  const order: string[] = []

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

      const existing = byPath.get(relativePath)
      if (existing) {
        // A file shared by several objects keeps one row with all owners listed.
        const owners = new Set(
          existing.isRef_isPartOf
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean),
        )
        owners.add(itemId)
        existing.isRef_isPartOf = Array.from(owners).join(', ')
        continue
      }

      byPath.set(relativePath, {
        '@id': relativePath,
        '@type': 'File',
        '.folder': folder,
        '.filename': filename,
        isRef_isPartOf: itemId,
      })
      order.push(relativePath)
    }
  }

  return order.map((path) => byPath.get(path) as DerivedFileRow)
}
