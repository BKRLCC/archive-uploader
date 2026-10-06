// Dry-run orchestration for publishing. Given a crate, its archive root and the
// target archiveId, this filters to the public projection, classifies files into
// images (bytes published) and non-images (metadata only), hashes the originals
// and diffs them against the last-published manifest. It produces a plan of what
// would change — nothing is derived, uploaded or written to disk here. Hashing
// reads file bytes; the manifest load is the only other I/O.
import {
  buildPublicationView,
  type Crate,
  type CrateNode,
} from './publication-view'
import { classifyFiles } from './file-classification'
import { hashCrateFiles } from './file-hashing'
import {
  diffFiles,
  getArchiveManifest,
  loadUploadState,
  type CurrentFile,
  type ManifestEntry,
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

// The shared result of inspecting a crate against its last-published manifest:
// the hashed public view plus the image/non-image split, the diff and the prior
// manifest. Both the preview (summarizePlan) and the local build reuse this so
// the pipeline runs once.
export type PublishAnalysis = {
  hashedView: Crate
  images: CrateNode[]
  nonImages: CrateNode[]
  diff: PublishDiff
  prior: Record<string, ManifestEntry>
  missing: string[]
  sizeByPath: Map<string, number>
}

const asString = (value: unknown): string =>
  typeof value === 'string' ? value : ''

// Runs the full local inspection pipeline (view → hash → classify → diff) once.
export async function analyzePublish({
  crate,
  rootFolder,
  archiveId,
}: PlanPublishInput): Promise<PublishAnalysis> {
  const view = buildPublicationView(crate)
  const { crate: hashedView } = await hashCrateFiles(view, rootFolder)
  const { images, nonImages } = classifyFiles(hashedView)

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

  return { hashedView, images, nonImages, diff, prior, missing, sizeByPath }
}

// Projects an analysis into the preview-friendly plan (counts + summaries).
export function summarizePlan(
  analysis: PublishAnalysis,
  archiveId: string,
): PublishPlan {
  const { diff, nonImages, missing, sizeByPath } = analysis

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

// Computes what a publish would do without performing it.
export async function planPublish(
  input: PlanPublishInput,
): Promise<PublishPlan> {
  const analysis = await analyzePublish(input)
  return summarizePlan(analysis, input.archiveId)
}
