// Generates one web-sized derivative of a source image using sharp: EXIF
// orientation baked into the pixels, resized to fit within a max dimension
// (never enlarged), re-encoded, and metadata stripped (sharp's default).
// A leaf capability — callers choose the destination path and options, so extra
// sizes (e.g. small thumbnails) are just additional calls.
import path from 'node:path'
import { mkdir } from 'node:fs/promises'

import sharp from 'sharp'

export type DerivativeFormat = 'webp' | 'jpeg'

export type DerivativeOptions = {
  maxDimension?: number
  format?: DerivativeFormat
  quality?: number
}

export type DerivativeResult = {
  path: string
  encodingFormat: string
  width: number
  height: number
  contentSize: string
}

export const DEFAULT_DERIVATIVE_OPTIONS: Required<DerivativeOptions> = {
  maxDimension: 1600,
  format: 'webp',
  quality: 80,
}

const FORMAT_MIME: Record<DerivativeFormat, string> = {
  webp: 'image/webp',
  jpeg: 'image/jpeg',
}

export async function createImageDerivative(
  sourceAbsolute: string,
  destAbsolute: string,
  options: DerivativeOptions = {},
): Promise<DerivativeResult> {
  const { maxDimension, format, quality } = {
    ...DEFAULT_DERIVATIVE_OPTIONS,
    ...options,
  }

  await mkdir(path.dirname(destAbsolute), { recursive: true })

  const resized = sharp(sourceAbsolute)
    .rotate()
    .resize(maxDimension, maxDimension, {
      fit: 'inside',
      withoutEnlargement: true,
    })

  const encoded =
    format === 'webp'
      ? resized.webp({ quality })
      : resized.jpeg({ quality, mozjpeg: true })

  const info = await encoded.toFile(destAbsolute)

  return {
    path: destAbsolute,
    encodingFormat: FORMAT_MIME[format],
    width: info.width,
    height: info.height,
    contentSize: String(info.size),
  }
}
