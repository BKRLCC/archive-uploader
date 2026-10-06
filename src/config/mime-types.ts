// Maps common file extensions to their IANA media type, used for the
// schema.org/encodingFormat of File entities. Not exhaustive; unknown
// extensions fall back to application/octet-stream.
const MIME_TYPES_BY_EXTENSION: Record<string, string> = {
  // Images
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  bmp: 'image/bmp',
  svg: 'image/svg+xml',
  heic: 'image/heic',
  heif: 'image/heif',
  // Audio
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  flac: 'audio/flac',
  aac: 'audio/aac',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
  // Video
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  mkv: 'video/x-matroska',
  avi: 'video/x-msvideo',
  // Documents
  pdf: 'application/pdf',
  txt: 'text/plain',
  csv: 'text/csv',
  tsv: 'text/tab-separated-values',
  json: 'application/json',
  xml: 'application/xml',
  md: 'text/markdown',
  rtf: 'application/rtf',
  html: 'text/html',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  odt: 'application/vnd.oasis.opendocument.text',
  // Archives
  zip: 'application/zip',
}

export const DEFAULT_ENCODING_FORMAT = 'application/octet-stream'

// Extracts the lowercase extension (without the dot) from a path or filename.
// Returns '' when there is no extension or the name is a dotfile (e.g. ".keep").
export const fileExtension = (pathOrName: string): string => {
  const name = String(pathOrName ?? '')
    .split('?')[0]
    .split('#')[0]
    .replace(/\/+$/, '')
  const base = name.slice(name.lastIndexOf('/') + 1)
  const dot = base.lastIndexOf('.')
  return dot > 0 ? base.slice(dot + 1).toLowerCase() : ''
}

// Returns the schema.org/encodingFormat (IANA media type) for a file path or
// name, based on its extension. Unknown extensions fall back to octet-stream.
export const encodingFormatForPath = (pathOrName: string): string =>
  MIME_TYPES_BY_EXTENSION[fileExtension(pathOrName)] ?? DEFAULT_ENCODING_FORMAT
