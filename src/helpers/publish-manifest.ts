// Tracks what has already been published so a re-publish only touches what
// changed. The manifest lives at <root>/.publish/upload-state.json and is
// tenant-scoped: each archiveId gets its own record of published derivatives
// (path, original + derivative sha512, derivative size). The diff is a flat
// path+hash comparison of the current file set against that record — not a
// semantic graph diff. A missing file or absent archiveId behaves as an empty
// prior manifest (everything is new). Load/save do disk I/O; the diff is pure.
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export const PUBLISH_DIR_NAME = '.publish'
export const DERIVATIVES_DIR_NAME = 'derivatives'
export const UPLOAD_STATE_FILENAME = 'upload-state.json'
export const MANIFEST_VERSION = 1

// One previously-published derivative. `path` is the archive-relative path of
// the original file (== its File @id); the sha512s let us detect source edits
// and verify the uploaded derivative.
export type ManifestEntry = {
  path: string
  originalSha512: string
  derivativeSha512: string
  derivativeContentSize: string
}

export type ArchiveManifest = {
  files: Record<string, ManifestEntry>
}

export type UploadState = {
  version: number
  archives: Record<string, ArchiveManifest>
}

// A current file to diff: its archive-relative path and the source file's hash.
export type CurrentFile = { path: string; sha512: string }

export type DiffEntry = { path: string; sha512: string }

export type PublishDiff = {
  added: DiffEntry[]
  changed: DiffEntry[]
  removed: ManifestEntry[]
  unchanged: DiffEntry[]
}

export function emptyUploadState(): UploadState {
  return { version: MANIFEST_VERSION, archives: {} }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function normalizeEntry(
  value: unknown,
  fallbackPath: string,
): ManifestEntry | null {
  if (!isRecord(value)) return null
  const entryPath = typeof value.path === 'string' ? value.path : fallbackPath
  if (!entryPath) return null
  return {
    path: entryPath,
    originalSha512:
      typeof value.originalSha512 === 'string' ? value.originalSha512 : '',
    derivativeSha512:
      typeof value.derivativeSha512 === 'string' ? value.derivativeSha512 : '',
    derivativeContentSize:
      typeof value.derivativeContentSize === 'string'
        ? value.derivativeContentSize
        : '',
  }
}

function normalizeUploadState(value: unknown): UploadState {
  if (!isRecord(value) || !isRecord(value.archives)) return emptyUploadState()
  const archives: Record<string, ArchiveManifest> = {}
  for (const [archiveId, archive] of Object.entries(value.archives)) {
    if (!isRecord(archive) || !isRecord(archive.files)) continue
    const files: Record<string, ManifestEntry> = {}
    for (const [entryPath, entry] of Object.entries(archive.files)) {
      const normalized = normalizeEntry(entry, entryPath)
      if (normalized) files[entryPath] = normalized
    }
    archives[archiveId] = { files }
  }
  return { version: MANIFEST_VERSION, archives }
}

// Reads the upload state from <root>/.publish/upload-state.json. A missing or
// unreadable/invalid file yields a fresh empty state rather than throwing.
export async function loadUploadState(
  rootFolder: string,
): Promise<UploadState> {
  const file = path.join(rootFolder, PUBLISH_DIR_NAME, UPLOAD_STATE_FILENAME)
  try {
    const raw = await readFile(file, 'utf8')
    return normalizeUploadState(JSON.parse(raw) as unknown)
  } catch {
    return emptyUploadState()
  }
}

// Writes the upload state, creating <root>/.publish/ if needed.
export async function saveUploadState(
  rootFolder: string,
  state: UploadState,
): Promise<void> {
  const dir = path.join(rootFolder, PUBLISH_DIR_NAME)
  await mkdir(dir, { recursive: true })
  const file = path.join(dir, UPLOAD_STATE_FILENAME)
  await writeFile(file, JSON.stringify(state, null, 2) + '\n', 'utf8')
}

// The published-file record for one archiveId (empty if never published).
export function getArchiveManifest(
  state: UploadState,
  archiveId: string,
): Record<string, ManifestEntry> {
  return state.archives[archiveId]?.files ?? {}
}

// Returns a new state with this archiveId's record replaced by `entries`.
// Pure: the input state is not mutated.
export function setArchiveManifest(
  state: UploadState,
  archiveId: string,
  entries: ManifestEntry[],
): UploadState {
  const files: Record<string, ManifestEntry> = {}
  for (const entry of entries) files[entry.path] = entry
  return {
    ...state,
    archives: { ...state.archives, [archiveId]: { files } },
  }
}

// Compares the current file set against a prior manifest record, splitting into
// added (new path), changed (same path, different source hash), removed (in
// manifest, no longer present) and unchanged (same path and hash).
export function diffFiles(
  current: CurrentFile[],
  prior: Record<string, ManifestEntry>,
): PublishDiff {
  const added: DiffEntry[] = []
  const changed: DiffEntry[] = []
  const unchanged: DiffEntry[] = []
  const currentPaths = new Set<string>()

  for (const file of current) {
    currentPaths.add(file.path)
    const priorEntry = prior[file.path]
    if (!priorEntry) {
      added.push({ path: file.path, sha512: file.sha512 })
    } else if (priorEntry.originalSha512 !== file.sha512) {
      changed.push({ path: file.path, sha512: file.sha512 })
    } else {
      unchanged.push({ path: file.path, sha512: file.sha512 })
    }
  }

  const removed: ManifestEntry[] = []
  for (const [entryPath, entry] of Object.entries(prior)) {
    if (!currentPaths.has(entryPath)) removed.push(entry)
  }

  return { added, changed, removed, unchanged }
}
