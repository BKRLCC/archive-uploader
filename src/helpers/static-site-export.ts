// Builds a standalone, Bowerbird-ready static site tree under
// <rootFolder>/.static-site/ straight from the archive's main assets — no
// dependence on the .publish/ deposit flow. The folder is wiped and rebuilt
// every run: each published image is compressed to webp and the RO-Crate's image
// File @ids are rewritten to point at those webp files (Bowerbird resolves media
// by the path the crate states, relative to the crate folder), with every
// reference to a rewritten @id updated to match. Non-image files are kept as
// metadata only (no bytes published). Images that fail are dropped from the crate
// and reported rather than aborting the run.
import path from 'node:path'
import { rm, mkdir, writeFile } from 'node:fs/promises'

import {
  buildPublicationView,
  type Crate,
  type CrateNode,
} from './publication-view'
import { hashCrateFiles, hashFile } from './file-hashing'
import { classifyFiles } from './file-classification'
import {
  createImageDerivative,
  DEFAULT_DERIVATIVE_OPTIONS,
  type DerivativeFormat,
  type DerivativeOptions,
} from './image-derivatives'
import { derivativeExtension } from './publish-derivatives'

export const STATIC_SITE_DIR_NAME = '.static-site'

const DERIVATIVE_MIME: Record<DerivativeFormat, string> = {
  webp: 'image/webp',
  jpeg: 'image/jpeg',
}

export type StaticExportInput = {
  crate: Crate
  rootFolder: string
  collectionId: string
  options?: DerivativeOptions
}

export type StaticExportFailure = { path: string; error: string }

export type StaticExportResult = {
  outputDir: string
  dataDir: string
  cratePath: string
  imagesWritten: number
  nonImageCount: number
  failures: StaticExportFailure[]
}

const asString = (value: unknown): string =>
  typeof value === 'string' ? value : ''

const isReference = (value: unknown): value is { '@id': string } =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { '@id'?: unknown })['@id'] === 'string'

const isPathWithin = (parentPath: string, targetPath: string): boolean => {
  const rel = path.relative(parentPath, targetPath)
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel)
}

// Filesystem-safe collection folder name: no separators or traversal.
const safeCollectionId = (id: string): string => {
  const cleaned = id
    .replace(/[\\/]+/g, '-')
    .replace(/\.+/g, '.')
    .trim()
  return cleaned.replace(/^[.-]+|[.-]+$/g, '') || 'collection'
}

// The crate-relative @id a compressed image takes, mirroring the original's
// relative path with the derivative extension (no cache-folder prefix).
const webpRelativeId = (
  originalId: string,
  format: DerivativeFormat,
): string => {
  const relative = originalId.replace(/^\.\//, '')
  const withoutExtension = relative.replace(/\.[^./\\]+$/, '')
  return `./${withoutExtension}.${derivativeExtension(format)}`
}

export async function exportStaticSite({
  crate,
  rootFolder,
  collectionId,
  options,
}: StaticExportInput): Promise<StaticExportResult> {
  const format = options?.format ?? DEFAULT_DERIVATIVE_OPTIONS.format
  const outputDir = path.join(rootFolder, STATIC_SITE_DIR_NAME)
  const dataDir = path.join(outputDir, 'data', safeCollectionId(collectionId))

  // Wipe-clean-and-rebuild: the static site never carries over prior state.
  await rm(outputDir, { recursive: true, force: true })
  await mkdir(dataDir, { recursive: true })

  const view = buildPublicationView(crate)
  const { crate: hashedView } = await hashCrateFiles(view, rootFolder)
  const outCrate = structuredClone(hashedView)
  const { images, nonImages } = classifyFiles(outCrate)

  const failures: StaticExportFailure[] = []
  const idMap = new Map<string, string>()
  const removeIds = new Set<string>()
  let imagesWritten = 0

  for (const node of images) {
    const originalId = asString(node['@id'])
    if (!originalId) continue

    const sourceRelative = originalId.replace(/^\.\//, '')
    const sourceAbsolute = path.resolve(rootFolder, sourceRelative)
    const newId = webpRelativeId(originalId, format)
    const destAbsolute = path.resolve(dataDir, newId.replace(/^\.\//, ''))

    if (!isPathWithin(rootFolder, sourceAbsolute)) {
      failures.push({
        path: originalId,
        error: 'Source path escapes archive root',
      })
      removeIds.add(originalId)
      continue
    }

    try {
      await createImageDerivative(sourceAbsolute, destAbsolute, options)
      const { sha512, contentSize } = await hashFile(destAbsolute)
      node['@id'] = newId
      node['encodingFormat'] = DERIVATIVE_MIME[format]
      node['contentSize'] = contentSize
      node['sha512'] = sha512
      delete node['url']
      delete node['contentUrl']
      idMap.set(originalId, newId)
      imagesWritten += 1
    } catch (error) {
      failures.push({
        path: originalId,
        error: error instanceof Error ? error.message : String(error),
      })
      removeIds.add(originalId)
    }
  }

  const graph = outCrate['@graph']
  if (Array.isArray(graph)) {
    // Repoint references at rewritten @ids and drop references to failed images.
    for (const node of graph) {
      for (const key of Object.keys(node)) {
        const value = node[key]
        if (isReference(value)) {
          const id = value['@id']
          if (removeIds.has(id)) {
            delete node[key]
          } else {
            const mapped = idMap.get(id)
            if (mapped) value['@id'] = mapped
          }
        } else if (Array.isArray(value)) {
          const next = value.filter(
            (entry) => !(isReference(entry) && removeIds.has(entry['@id'])),
          )
          for (const entry of next) {
            if (isReference(entry)) {
              const mapped = idMap.get(entry['@id'])
              if (mapped) entry['@id'] = mapped
            }
          }
          if (next.length === 0) delete node[key]
          else node[key] = next
        }
      }
    }
    outCrate['@graph'] = graph.filter(
      (node: CrateNode) => !removeIds.has(asString(node['@id'])),
    )
  }

  const cratePath = path.join(dataDir, 'ro-crate-metadata.json')
  await writeFile(cratePath, JSON.stringify(outCrate, null, 2) + '\n')

  return {
    outputDir,
    dataDir,
    cratePath,
    imagesWritten,
    nonImageCount: nonImages.length,
    failures,
  }
}
