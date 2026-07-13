import { TAG_FIELD_PREFIX } from './field-vocabularies'

const FIELD_LABELS: Record<string, string> = {
  '@id': '🆔 Identifier',
  '@type': '🧩 Type',
  name: '📝 Name',
  description: '📄 Description',
  dateCreated: '📅 Date Created',
  dateCreatedApproximate: '📅 Approximate Date',
  dateAdded: '🗓️ Date Added',
  isRef_enteredBy: '✍️ Entered By',
  isPublishable: '🌐 Publish',
  depiction: '🖼️ Img',
  latitude: '📐 Latitude',
  longitude: '📐 Longitude',
  languageCode: '🔤 Language Code',
  sameAs: '🔗 Identifying URL',
  url: '🌐 Website',
  isRef_creator: '👤 Creators',
  isRef_contributor: '👥 Contributors',
  isRef_mentions: '🧑‍🧑‍🧒‍🧒 Depicted / Mentioned',
  isRef_contentLocation: '📍 Content Location',
  isRef_locationCreated: '🖌️ Created At',
  isRef_location: '📍 Location',
  isRef_inLanguage: '🗣️ In Languages',
  isRef_hasPart: '📎 Files',
  isRef_geo: '🧭 Localities',
  isRef_sameAs: '🔗 License Link',
  isRef_isPartOf: '🗂️ Collection',
  width: '📏 Width (cm)',
  height: '📏 Height (cm)',
  depth: '📏 Depth (cm)',
  material: '🧵 Material',
  isRef_holdingOrganisation: '🏛️ Holding Organisation',
  identifier: '🔢 External ID',
}

// Optional per-field help text shown via an info tooltip in the edit form.
// Only fields listed here get an info icon.
const FIELD_DESCRIPTIONS: Record<string, string> = {
  isRef_contentLocation:
    'The location depicted in the item, e.g. the setting of a video or the country depicted in a painting.',
  isRef_locationCreated:
    'The location where the item was created. You only need to fill this in if it is different from the content location.',
  isPublishable:
    'If checked, the item will be included in the public-facing website. If unchecked, it will be hidden from public view.',
  isRef_inLanguage:
    'The language(s) spoken in the item, e.g. the language of a video or audio recording.',
  dateAdded:
    'The date the item was added to this archive. This is automatically set when you create a new item, it cannot be changed manually.',
  dateCreated:
    'The date the original item was created (not the date added to the archive). If you do not know the exact date, add a date here anyway for the system, then tick the "Approximate?" checkbox to add a human-readable label (e.g. "Before 1957").',
  isRef_enteredBy:
    'The person who entered the item into this archive. Add yourself to the people list if you are not already listed.',
  isRef_hasPart:
    'All the files associated with this item. Often there is only one, but there could be multiple, e.g. a video and its transcript, or multiple images of the same artwork.',
  sameAs:
    'A URL that identifies this item in another system. For example, a link to the item in a museum collection or a link to a Wikipedia page about the item.',
  languageCode:
    "For Aboriginal languages, use the AIATSIS code. For other languages, use the ISO 639-3 code (two letters, e.g. 'en'). If you do not know the code, leave this field blank.",
  isRef_mentions:
    'People who are "in" the item, e.g. people depicted in a photo or mentioned in a text.',
  width: 'The width of the physical object, in centimetres.',
  height: 'The height of the physical object, in centimetres.',
  depth: 'The depth of the physical object, in centimetres.',
  material:
    'The primary material(s) the object is made from, e.g. "oil on canvas" or "bark, ochre".',
  isRef_holdingOrganisation:
    'The organisation that currently holds this object or record. Add it to the Organisations list first if it is not already there.',
  identifier:
    'A catalogue or accession number assigned to this item by an external institution, e.g. a museum collection number.',
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

export function getFieldDescription(fieldName: string): string | null {
  const normalized = normalizeFieldName(fieldName)
  if (!normalized) return null
  return FIELD_DESCRIPTIONS[normalized] ?? null
}
