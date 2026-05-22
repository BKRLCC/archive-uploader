export const DEPICTION_FIELD_NAME = 'depiction'

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
