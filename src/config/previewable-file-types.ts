export type PreviewKind = 'image' | 'audio' | 'video'

export const PREVIEWABLE_IMAGE_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
])

export const PREVIEWABLE_AUDIO_EXTENSIONS = new Set([
  'mp3',
  'wav',
  'flac',
  'aac',
  'ogg',
  'm4a',
])

export const PREVIEWABLE_VIDEO_EXTENSIONS = new Set([
  'mp4',
  'mov',
  'webm',
  'mkv',
  'avi',
])

const normalizeExtension = (extension: string): string =>
  String(extension ?? '')
    .trim()
    .toLowerCase()
    .replace(/^\./, '')

export const isImagePreviewExtension = (extension: string): boolean =>
  PREVIEWABLE_IMAGE_EXTENSIONS.has(normalizeExtension(extension))

export const isAudioPreviewExtension = (extension: string): boolean =>
  PREVIEWABLE_AUDIO_EXTENSIONS.has(normalizeExtension(extension))

export const isVideoPreviewExtension = (extension: string): boolean =>
  PREVIEWABLE_VIDEO_EXTENSIONS.has(normalizeExtension(extension))

export const isPreviewableExtension = (extension: string): boolean =>
  isImagePreviewExtension(extension) ||
  isAudioPreviewExtension(extension) ||
  isVideoPreviewExtension(extension)

export const getPreviewKindByExtension = (
  extension: string,
): PreviewKind | null => {
  if (isImagePreviewExtension(extension)) return 'image'
  if (isAudioPreviewExtension(extension)) return 'audio'
  if (isVideoPreviewExtension(extension)) return 'video'
  return null
}
