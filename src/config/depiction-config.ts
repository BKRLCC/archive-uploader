export const DEPICTION_FIELD_NAME = 'depiction'
export const THUMBNAILS_FOLDER_NAME = '.thumbs'
export const GENERATED_DEPICTIONS_FOLDER_NAME = '.depictions'
export const THUMBNAIL_SIZE_PX = 150

export const DEPICTION_IMAGE_EXTENSIONS = [
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
] as const

const DEPICTION_EXTENSION_SET = new Set<string>(DEPICTION_IMAGE_EXTENSIONS)

export const DEPICTION_FOLDER_HINT = 'images/'

export function hasAllowedDepictionExtension(filePath: string): boolean {
  const fileName = filePath.split(/[/\\]/).pop() ?? ''
  const dot = fileName.lastIndexOf('.')
  if (dot < 0) return false
  const ext = fileName.slice(dot + 1).toLowerCase()
  return DEPICTION_EXTENSION_SET.has(ext)
}

export function normalizeDepictionRelativePath(depictionPath: string): string {
  return String(depictionPath ?? '')
    .trim()
    .replace(/\\+/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '')
}

export function getDepictionThumbnailRelativePath(
  depictionPath: string,
): string | null {
  const normalized = normalizeDepictionRelativePath(depictionPath)
  if (!normalized) return null
  if (!hasAllowedDepictionExtension(normalized)) return null

  const withoutExt = normalized.replace(/\.[^.]+$/, '')
  if (!withoutExt) return null
  return `${THUMBNAILS_FOLDER_NAME}/${withoutExt}.jpg`
}
