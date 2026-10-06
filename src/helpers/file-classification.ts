// Splits a crate's File data entities into images (whose bytes we publish) and
// non-images (kept as metadata only). Prefers each node's schema.org/encodingFormat
// and falls back to the file extension from its @id path.
import { isImagePreviewExtension } from '../config/previewable-file-types'
import { fileExtension } from '../config/mime-types'
import type { Crate, CrateNode } from './publication-view'

export type FileClassification = {
  images: CrateNode[]
  nonImages: CrateNode[]
}

const typeArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : typeof value === 'string'
      ? [value]
      : []

const isFileNode = (node: CrateNode): boolean =>
  typeArray(node['@type']).includes('File')

const isImageEncodingFormat = (value: unknown): boolean => {
  // encodingFormat may be a MIME string or an array [mime, {@id: pronom}].
  const entries = Array.isArray(value) ? value : [value]
  return entries.some(
    (entry) =>
      typeof entry === 'string' &&
      entry.trim().toLowerCase().startsWith('image/'),
  )
}

const isImageNode = (node: CrateNode): boolean => {
  if (isImageEncodingFormat(node['encodingFormat'])) return true
  const id = node['@id']
  return typeof id === 'string' && isImagePreviewExtension(fileExtension(id))
}

export function classifyFiles(crate: Crate): FileClassification {
  const images: CrateNode[] = []
  const nonImages: CrateNode[] = []

  const graph = crate['@graph']
  if (!Array.isArray(graph)) return { images, nonImages }

  for (const node of graph) {
    if (!isFileNode(node)) continue
    if (isImageNode(node)) images.push(node)
    else nonImages.push(node)
  }

  return { images, nonImages }
}
