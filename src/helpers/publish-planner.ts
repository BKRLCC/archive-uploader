// Dry-run orchestration for publishing. Given a crate, its archive root and the
// target archiveId, this filters to the public projection, classifies files into
// images (bytes published) and non-images (metadata only), hashes the originals
// and diffs them against the last-published manifest. It produces a plan of what
// would change — nothing is derived, uploaded or written to disk here. Hashing
// reads file bytes; the manifest load is the only other I/O.
import { buildPublicationView, type Crate } from './publication-view'
import { classifyFiles } from './file-classification'
import { hashCrateFiles } from './file-hashing'
import {
  diffFiles,
  getArchiveManifest,
  loadUploadState,
  type CurrentFile,
  type PublishDiff,
} from './publish-manifest'

// A non-image file that is published as metadata only (no bytes uploaded).
export type NonImageSummary = {
  path: string
  name: string
  encodingFormat: string
  contentSize: string
}

export type PublishPlanTotals = {
  imagesAdded: number
  imagesChanged: number
  imagesRemoved: number
  imagesUnchanged: number
  nonImageCount: number
  missingCount: number
  bytesToProcess: number
}

export type PublishPlan = {
  archiveId: string
  diff: PublishDiff
  nonImages: NonImageSummary[]
  missing: string[]
  totals: PublishPlanTotals
}

export type PlanPublishInput = {
  crate: Crate
  rootFolder: string
  archiveId: string
}

const asString = (value: unknown): string =>
  typeof value === 'string' ? value : ''

// Computes what a publish would do without performing it.
export async function planPublish({
  crate,
  rootFolder,
  archiveId,
}: PlanPublishInput): Promise<PublishPlan> {
  const view = buildPublicationView(crate)
  const { crate: hashedCrate } = await hashCrateFiles(view, rootFolder)
  const { images, nonImages } = classifyFiles(hashedCrate)

  const state = await loadUploadState(rootFolder)
  const prior = getArchiveManifest(state, archiveId)

  const current: CurrentFile[] = []
  const missing: string[] = []
  const sizeByPath = new Map<string, number>()
  for (const node of images) {
    const id = asString(node['@id'])
    if (!id) continue
    const sha512 = asString(node['sha512'])
    if (sha512) current.push({ path: id, sha512 })
    else missing.push(id)
    const size = Number(asString(node['contentSize']))
    if (Number.isFinite(size)) sizeByPath.set(id, size)
  }

  const diff = diffFiles(current, prior)

  const nonImageSummaries: NonImageSummary[] = nonImages.map((node) => ({
    path: asString(node['@id']),
    name: asString(node['name']),
    encodingFormat: asString(node['encodingFormat']),
    contentSize: asString(node['contentSize']),
  }))

  const bytesToProcess = [...diff.added, ...diff.changed].reduce(
    (sum, entry) => sum + (sizeByPath.get(entry.path) ?? 0),
    0,
  )

  return {
    archiveId,
    diff,
    nonImages: nonImageSummaries,
    missing,
    totals: {
      imagesAdded: diff.added.length,
      imagesChanged: diff.changed.length,
      imagesRemoved: diff.removed.length,
      imagesUnchanged: diff.unchanged.length,
      nonImageCount: nonImageSummaries.length,
      missingCount: missing.length,
      bytesToProcess,
    },
  }
}
