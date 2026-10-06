// Builds the public RO-Crate document that would be deposited. Starting from the
// hashed publication view, each published image File node is pointed at its
// derivative (contentUrl/url = derivative key, encodingFormat image/webp, and the
// derivative's size + sha512); every other File node keeps its metadata but has
// no url/contentUrl, which is the standards-native "described but not retrievable
// here" state. Pure over its inputs (clones the view). Without a deposit URL the
// derivative key is used as-is so the document can be previewed offline.
import type { Crate, CrateNode } from './publication-view'
import type { DerivativeFormat } from './image-derivatives'
import { derivativeKey } from './publish-derivatives'
import type { ManifestEntry } from './publish-manifest'

const DERIVATIVE_MIME: Record<DerivativeFormat, string> = {
  webp: 'image/webp',
  jpeg: 'image/jpeg',
}

export type BuildPublicCrateInput = {
  view: Crate
  derivatives: ManifestEntry[]
  depositBaseUrl?: string
  format?: DerivativeFormat
}

const asString = (value: unknown): string =>
  typeof value === 'string' ? value : ''

const typeArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : typeof value === 'string'
      ? [value]
      : []

const isFileNode = (node: CrateNode): boolean =>
  typeArray(node['@type']).includes('File')

function publishedUrl(depositBaseUrl: string | undefined, key: string): string {
  const trimmed = (depositBaseUrl ?? '').replace(/\/+$/, '')
  return trimmed ? `${trimmed}/${key}` : key
}

export function buildPublicCrate({
  view,
  derivatives,
  depositBaseUrl,
  format,
}: BuildPublicCrateInput): Crate {
  const crate = structuredClone(view)
  const fmt: DerivativeFormat = format ?? 'webp'
  const mime = DERIVATIVE_MIME[fmt]
  const derivativeByPath = new Map(
    derivatives.map((entry) => [entry.path, entry]),
  )

  const graph = crate['@graph']
  if (!Array.isArray(graph)) return crate

  for (const node of graph) {
    if (!isFileNode(node)) continue
    const id = asString(node['@id'])
    const entry = derivativeByPath.get(id)
    if (entry) {
      const url = publishedUrl(depositBaseUrl, derivativeKey(id, fmt))
      node['contentUrl'] = url
      node['url'] = url
      node['encodingFormat'] = mime
      node['contentSize'] = entry.derivativeContentSize
      node['sha512'] = entry.derivativeSha512
    } else {
      delete node['contentUrl']
      delete node['url']
    }
  }

  return crate
}
