// Materialises image derivatives for a publish: for each new/changed image it
// writes a compressed copy under <root>/.publish/derivatives/ (mirroring the
// original's relative path, re-extensioned to the derivative format) and hashes
// it, producing manifest entries ready for the upload step. This is purely local
// — no network, no deposit URL needed — so the .publish folder can be built and
// inspected offline. Images that fail (missing/unreadable/outside root) are
// collected rather than aborting the run.
import path from 'node:path'

import {
  createImageDerivative,
  DEFAULT_DERIVATIVE_OPTIONS,
  type DerivativeFormat,
  type DerivativeOptions,
} from './image-derivatives'
import { hashFile } from './file-hashing'
import {
  DERIVATIVES_DIR_NAME,
  PUBLISH_DIR_NAME,
  type ManifestEntry,
} from './publish-manifest'

export type MaterializeImage = { path: string; originalSha512: string }

export type MaterializeInput = {
  rootFolder: string
  images: MaterializeImage[]
  options?: DerivativeOptions
}

export type MaterializeFailure = { path: string; error: string }

export type MaterializeResult = {
  entries: ManifestEntry[]
  failures: MaterializeFailure[]
}

const isPathWithin = (parentPath: string, targetPath: string): boolean => {
  const rel = path.relative(parentPath, targetPath)
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel)
}

export function derivativeExtension(format: DerivativeFormat): string {
  return format === 'jpeg' ? 'jpg' : 'webp'
}

// Maps an original archive-relative path to its derivative's archive-relative
// path under .publish/derivatives/, swapping the extension for the format's.
export function derivativeRelativePath(
  originalRelativePath: string,
  format: DerivativeFormat,
): string {
  const withoutExtension = originalRelativePath.replace(/\.[^./\\]+$/, '')
  return `${PUBLISH_DIR_NAME}/${DERIVATIVES_DIR_NAME}/${withoutExtension}.${derivativeExtension(format)}`
}

// Compresses each image into .publish/derivatives/ and returns manifest entries
// (path + original hash + derivative hash/size). The input is never mutated.
export async function materializeDerivatives({
  rootFolder,
  images,
  options,
}: MaterializeInput): Promise<MaterializeResult> {
  const format = options?.format ?? DEFAULT_DERIVATIVE_OPTIONS.format
  const entries: ManifestEntry[] = []
  const failures: MaterializeFailure[] = []

  for (const image of images) {
    const relative = image.path.replace(/^\.\//, '')
    const sourceAbsolute = path.resolve(rootFolder, relative)
    if (!isPathWithin(rootFolder, sourceAbsolute)) {
      failures.push({ path: image.path, error: 'Source path escapes archive root' })
      continue
    }
    const destAbsolute = path.resolve(
      rootFolder,
      derivativeRelativePath(image.path, format),
    )
    try {
      await createImageDerivative(sourceAbsolute, destAbsolute, options)
      const { sha512, contentSize } = await hashFile(destAbsolute)
      entries.push({
        path: image.path,
        originalSha512: image.originalSha512,
        derivativeSha512: sha512,
        derivativeContentSize: contentSize,
      })
    } catch (error) {
      failures.push({
        path: image.path,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return { entries, failures }
}
