// Builds the public projection of an RO-Crate: keeps only entities explicitly
// marked publishable (default is to withhold), then strips references pointing at
// the entities that were removed so the result stays internally valid.

type CrateNode = Record<string, unknown> & { '@id'?: string }

export type { CrateNode }

export type Crate = {
  '@context'?: unknown
  '@graph'?: CrateNode[]
  [key: string]: unknown
}

const CRATE_DESCRIPTOR_ID = 'ro-crate-metadata.json'
const ROOT_DATASET_ID = './'

function toTypeArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string')
  }
  return typeof value === 'string' ? [value] : []
}

function flagIsTrue(value: unknown): boolean {
  return typeof value === 'string' && value.trim().toUpperCase() === 'TRUE'
}

function isReference(value: unknown): value is { '@id': string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { '@id'?: unknown })['@id'] === 'string'
  )
}

function ownerIds(node: CrateNode): string[] {
  const isPartOf = node['isPartOf']
  const refs = Array.isArray(isPartOf) ? isPartOf : [isPartOf]
  return refs.filter(isReference).map((ref) => ref['@id'])
}

export function buildPublicationView(input: Crate): Crate {
  const crate = structuredClone(input)
  const graph = crate['@graph']
  if (!Array.isArray(graph)) return crate

  const isStructural = (node: CrateNode): boolean =>
    node['@id'] === CRATE_DESCRIPTOR_ID || node['@id'] === ROOT_DATASET_ID

  // Pass 1: decide structural and flag-bearing nodes; File nodes follow their owner.
  const kept = new Map<CrateNode, boolean>()
  const keptIds = new Set<string>()
  const deferredFiles: CrateNode[] = []

  const markKept = (node: CrateNode): void => {
    kept.set(node, true)
    if (typeof node['@id'] === 'string') keptIds.add(node['@id'])
  }

  for (const node of graph) {
    if (isStructural(node)) {
      markKept(node)
    } else if ('custom:isPublishable' in node) {
      if (flagIsTrue(node['custom:isPublishable'])) markKept(node)
      else kept.set(node, false)
    } else if (toTypeArray(node['@type']).includes('File')) {
      deferredFiles.push(node)
    } else {
      kept.set(node, false)
    }
  }

  // Pass 2: a File is published only when one of its owning entities survived.
  for (const file of deferredFiles) {
    if (ownerIds(file).some((id) => keptIds.has(id))) markKept(file)
    else kept.set(file, false)
  }

  const droppedIds = new Set<string>()
  for (const node of graph) {
    const id = node['@id']
    if (typeof id === 'string' && !keptIds.has(id)) droppedIds.add(id)
  }

  // Pass 3: keep survivors and strip only references to entities we removed
  // (pre-existing dangling and external references are left untouched).
  const keptGraph: CrateNode[] = []
  for (const node of graph) {
    if (!kept.get(node)) continue
    for (const key of Object.keys(node)) {
      const value = node[key]
      if (isReference(value) && droppedIds.has(value['@id'])) {
        delete node[key]
      } else if (Array.isArray(value)) {
        const filtered = value.filter(
          (entry) => !(isReference(entry) && droppedIds.has(entry['@id'])),
        )
        if (filtered.length === 0) delete node[key]
        else node[key] = filtered
      }
    }
    keptGraph.push(node)
  }

  crate['@graph'] = keptGraph
  return crate
}
