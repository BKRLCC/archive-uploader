import { TAG_FIELD_PREFIX } from './field-vocabularies'
import type { EditableEntityType } from '../types/types'

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
  isRef_sameAs: '🔗 Alternative license location',
  isRef_isPartOf: '🗂️ Collection',
  isRef_license: '📜 License',
  width: '📏 Width (cm)',
  height: '📏 Height (cm)',
  depth: '📏 Depth (cm)',
  material: '🧵 Material',
  isRef_holdingOrganisation: '🏛️ Holding Organisation',
  identifier: '🔢 External ID',
  provenance: '📜 Provenance',
}

// Per-type overrides for field labels. A field can mean something different for
// a specific entity type (as LDaCA's conventions require), so list the type
// here and only the fields whose label differs — everything else falls back to
// the base FIELD_LABELS above.
const FIELD_LABEL_OVERRIDES: Partial<
  Record<EditableEntityType, Record<string, string>>
> = {
  'ldac:DataReuseLicense': {
    '@id': '📜 License (URL or file)',
  },
  RepositoryCollection: {
    identifier: '🔗 Persistent ID (DOI / URL)',
  },
}

// Optional per-field help text shown via an info tooltip in the edit form.
// Only fields listed here get an info icon.
const FIELD_DESCRIPTIONS: Record<string, string> = {
  '@id':
    'The unique identifier for this item in the archive. This is automatically generated and cannot be changed.',
  '@type':
    'The type of this item in the archive. This is automatically generated and cannot be changed.',
  name: 'The title of the item. This is the main label that will be displayed in the archive.',
  description:
    'A short description of the item. This is the main text that will be displayed in the archive.',
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
  dateCreatedApproximate:
    'A human-readable label for the date created, e.g. "Before 1957". This is optional, but can be useful if you do not know the exact date.',
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
    'A catalogue or accession number assigned to this item by the external institution above, e.g. a museum collection number.',
  // Corresponds to Dublin Core's dcterms:provenance.
  provenance:
    'The history of ownership and custody of this item — how it came to be in this archive. ',
  latitude:
    "The latitude of the item's location, in decimal degrees. The range of valid values is -90 to 90. ",
  longitude:
    "The longitude of the item's location, in decimal degrees. The range of valid values is -180 to 180.",
  depiction:
    'A single image that represents this item in the archive. This is additional to any files attached to the item, and is used as a thumbnail in lists and search results.',
  isRef_license:
    'The license that governs how this collection may be reused. Choose one from the licenses defined in your archive.',
}

// Per-type overrides for field descriptions. When a field means something
// different for a specific entity type (as LDaCA's conventions increasingly
// require), list the type here and only the fields that differ — everything
// else falls back to the base FIELD_DESCRIPTIONS above.
const FIELD_DESCRIPTION_OVERRIDES: Partial<
  Record<EditableEntityType, Record<string, string>>
> = {
  'ldac:DataReuseLicense': {
    '@id':
      'For a standard license, use its URL (e.g. https://creativecommons.org/licenses/by/4.0/). For a custom license, choose a file and the app will copy it into the License files folder and use its path here. This field becomes the @id of the license entity in the archive.',
    '@type':
      'The type of this license. This is set automatically based on whether the license is a URL or a file, and does not need to be edited manually.',
    description: 'A description of the license.',
  },
  RepositoryCollection: {
    identifier:
      'A persistent, managed unique ID in URL format for this collection, if you have one — for example a DOI. This is separate from the collection\u2019s location on disk, so it stays stable even if the folder moves.',
  },
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

export function getFieldDisplayLabel(
  fieldName: string,
  entityType?: EditableEntityType | null,
): string {
  const normalized = normalizeFieldName(fieldName)
  if (!normalized) return ''

  if (entityType) {
    const override = FIELD_LABEL_OVERRIDES[entityType]?.[normalized]
    if (override) return override
  }

  const explicit = FIELD_LABELS[normalized]
  if (explicit) return explicit

  const tagLabel = getTagFieldDisplayLabel(normalized)
  if (tagLabel) return tagLabel

  return normalized
}

export function getFieldDescription(
  fieldName: string,
  entityType?: EditableEntityType | null,
): string | null {
  const normalized = normalizeFieldName(fieldName)
  if (!normalized) return null
  if (entityType) {
    const override = FIELD_DESCRIPTION_OVERRIDES[entityType]?.[normalized]
    if (override) return override
  }
  return FIELD_DESCRIPTIONS[normalized] ?? null
}
