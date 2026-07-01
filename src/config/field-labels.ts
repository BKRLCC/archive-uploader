import { TAG_FIELD_PREFIX } from './field-vocabularies'

const FIELD_LABELS: Record<string, string> = {
  '@id': '🆔 Identifier',
  '@type': '🧩 Type',
  name: '📝 Name',
  description: '📄 Description',
  dateCreated: '📅 Date Created',
  dateAdded: '🗓️ Date Added',
  isRef_enteredBy: '✍️ Entered By',
  isPublishable: '🌐 Publish',
  depiction: '🖼️ Img',
  '.latitude': '📐 Latitude',
  '.longitude': '📐 Longitude',
  latitude: '📐 Latitude',
  longitude: '📐 Longitude',
  isRef_creator: '👤 Creators',
  isRef_contributor: '👥 Contributors',
  isRef_mentions: '🧑‍🧑‍🧒‍🧒 Depicted',
  isRef_contentLocation: '📍 Content Location',
  isRef_inLanguage: '🗣️ In Languages',
  isRef_hasPart: '📎 Files',
  isRef_geo: '🧭 Localities',
  isRef_sameAs: '🔗 License Link',
  isRef_isPartOf: '🗂️ Collection',
}

function normalizeFieldName(fieldName: string): string {
  return String(fieldName ?? '').trim()
}

function toTitleCase(text: string): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

function getTagFieldDisplayLabel(fieldName: string): string | null {
  const normalized = normalizeFieldName(fieldName)
  if (!normalized.startsWith(TAG_FIELD_PREFIX)) return null

  const rawSuffix = normalized.slice(TAG_FIELD_PREFIX.length)
  if (!rawSuffix) return '🏷️ Tag'

  const humanizedSuffix = toTitleCase(rawSuffix.replace(/[_-]+/g, ' ').trim())
  if (!humanizedSuffix) return '🏷️ Tag'
  return `🏷️ Tag: ${humanizedSuffix}`
}

export function getFieldDisplayLabel(fieldName: string): string {
  const normalized = normalizeFieldName(fieldName)
  if (!normalized) return ''

  const explicit = FIELD_LABELS[normalized]
  if (explicit) return explicit

  const tagLabel = getTagFieldDisplayLabel(normalized)
  if (tagLabel) return tagLabel

  return normalized
}
