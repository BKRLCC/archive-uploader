// Computes per-file integrity data (sha512 + byte size) for a crate's File data
// entities by streaming each file from disk, writing schema.org/contentSize and
// a sha512 property into the File node. Pure over its input crate (clones first);
// files that cannot be read are reported in `missing` rather than throwing.
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import path from 'node:path'

import type { Crate, CrateNode } from './publication-view'

export type FileHash = { sha512: string; contentSize: string }

export type CrateHashResult = {
  crate: Crate
  hashed: number
  missing: string[]
}

const typeArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : typeof value === 'string'
      ? [value]
      : []

const isFileNode = (node: CrateNode): boolean =>
  typeArray(node['@type']).includes('File')

const isPathWithin = (parentPath: string, targetPath: string): boolean => {
  const rel = path.relative(parentPath, targetPath)
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel)
}

// Streams a file and resolves to its sha512 (lowercase hex) and byte size.
// Rejects if the file cannot be opened or read.
export function hashFile(absolutePath: string): Promise<FileHash> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha512')
    let size = 0
    const stream = createReadStream(absolutePath)
    stream.on('data', (chunk) => {
      size += chunk.length
      hash.update(chunk)
    })
    stream.on('error', reject)
    stream.on('end', () =>
      resolve({ sha512: hash.digest('hex'), contentSize: String(size) }),
    )
  })
}

// Hashes every File entity in the crate whose @id resolves to a file inside
// `rootFolder`, writing sha512 + contentSize into each node. Returns a new crate;
// the input is not mutated. File @ids that escape the root or cannot be read are
// collected in `missing` and left unhashed.
export async function hashCrateFiles(
  input: Crate,
  rootFolder: string,
): Promise<CrateHashResult> {
  const crate = structuredClone(input)
  const missing: string[] = []
  let hashed = 0

  const graph = crate['@graph']
  if (!Array.isArray(graph)) return { crate, hashed, missing }

  for (const node of graph) {
    if (!isFileNode(node)) continue
    const id = node['@id']
    if (typeof id !== 'string') continue

    const absolutePath = path.resolve(rootFolder, id.replace(/^\.\//, ''))
    if (!isPathWithin(rootFolder, absolutePath)) {
      missing.push(id)
      continue
    }

    try {
      const { sha512, contentSize } = await hashFile(absolutePath)
      node['sha512'] = sha512
      node['contentSize'] = contentSize
      hashed += 1
    } catch {
      missing.push(id)
    }
  }

  return { crate, hashed, missing }
}
