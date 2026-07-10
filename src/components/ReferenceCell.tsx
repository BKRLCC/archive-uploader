import React, { useState } from 'react'
import './ReferenceCell.css'
import { getDepictionThumbnailRelativePath } from '../config/depiction-config'

export interface ReferenceEntity {
  id: string
  name: string
  depiction?: string
}

interface ReferenceCellProps {
  /** Referenced entity @ids (already parsed from the cell value). */
  ids: string[]
  /** Lookup of normalized-id -> entity for the target collection. */
  entities: Map<string, ReferenceEntity>
  /** Absolute archive folder path, used to resolve localfile:// thumbnails. */
  folder: string
}

/** Strip a single leading '#' and surrounding whitespace for lookup/matching. */
export function normalizeReferenceId(id: string): string {
  return String(id ?? '')
    .trim()
    .replace(/^#/, '')
}

/** Deterministic pleasant background colour derived from a string. */
function colorForString(value: string): string {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 45%, 45%)`
}

function initialFor(name: string, id: string): string {
  const source = name.trim() || id.replace(/^#/, '')
  const firstChar = source.trim().charAt(0)
  return firstChar ? firstChar.toUpperCase() : '?'
}

export function ReferenceChip({
  entity,
  folder,
}: {
  entity: ReferenceEntity
  folder: string
}) {
  const [imgFailed, setImgFailed] = useState(false)

  const displayName = entity.name.trim() || entity.id.replace(/^#/, '')
  const thumbnailPath = entity.depiction
    ? getDepictionThumbnailRelativePath(entity.depiction)
    : null

  const showThumb = Boolean(thumbnailPath) && !imgFailed

  return (
    <span className="ref-chip" title={`${displayName} (${entity.id})`}>
      {showThumb ? (
        <img
          className="ref-chip-thumb"
          src={`localfile://${folder.replace(/\\/g, '/')}/${thumbnailPath}`}
          alt=""
          loading="lazy"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span
          className="ref-chip-fallback"
          style={{ backgroundColor: colorForString(entity.id) }}
          aria-hidden="true"
        >
          {initialFor(entity.name, entity.id)}
        </span>
      )}
      <span className="ref-chip-name">{displayName}</span>
    </span>
  )
}

export default function ReferenceCell({
  ids,
  entities,
  folder,
}: ReferenceCellProps) {
  return (
    <span className="reference-cell">
      {ids.map((rawId, index) => {
        const entity = entities.get(normalizeReferenceId(rawId))
        if (!entity) {
          return (
            <span className="ref-chip-missing" key={`${rawId}-${index}`}>
              ❗️{rawId.trim()}
            </span>
          )
        }
        return (
          <ReferenceChip
            key={`${entity.id}-${index}`}
            entity={entity}
            folder={folder}
          />
        )
      })}
    </span>
  )
}
