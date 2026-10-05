import { TAG_FIELD_PREFIX } from './field-vocabularies'
import type { EditableEntityType } from '../types/types'

// Vocabulary sourcing per field. ro-crate-excel treats a bare term as schema.org
// by default; prefixed terms resolve through the workbook @context sheet. Tags:
//   schema.org  — default; bare term (see URL)
//   LDaCA       — ldac: prefix → https://w3id.org/ldac/terms#  (mapped in @context)
//   PCDM        — pcdm: prefix → https://pcdm.org/models#       (NOT yet in @context)
//   Dublin Core — dcterms: → http://purl.org/dc/terms/          (NOT yet in @context)
//   custom      — our own term; would resolve via the custom: prefix in @context
// @id/@type are JSON-LD keywords (RO-Crate core), not vocabulary terms. The
// isRef_ prefix is an app-side marker for a reference field, not part of the term.
const FIELD_LABELS: Record<string, string> = {
  '@id': '🆔 Identifier', // JSON-LD keyword
  '@type': '🧩 Type', // JSON-LD keyword
  // SCHEMA.ORG FIELDS
  name: '📝 Name', // schema.org — https://schema.org/name
  description: '📄 Description', // schema.org — https://schema.org/description
  dateCreated: '📅 Date Created', // schema.org — https://schema.org/dateCreated
  latitude: '📐 Latitude', // schema.org — https://schema.org/latitude
  longitude: '📐 Longitude', // schema.org — https://schema.org/longitude
  sameAs: '🔗 Identifying URL', // schema.org — https://schema.org/sameAs
  url: '🌐 Website', // schema.org — https://schema.org/url
  isRef_creator: '👤 Creators', // schema.org — https://schema.org/creator
  isRef_contributor: '👥 Contributors', // schema.org — https://schema.org/contributor
  isRef_mentions: '🧑‍🧑‍🧒‍🧒 Depicted / Mentioned', // schema.org — https://schema.org/mentions
  isRef_contentLocation: '📍 Content Location', // schema.org — https://schema.org/contentLocation
  isRef_locationCreated: '🖌️ Created At', // schema.org — https://schema.org/locationCreated
  isRef_location: '📍 Location', // schema.org — https://schema.org/location
  isRef_inLanguage: '🗣️ In Languages', // schema.org — https://schema.org/inLanguage
  isRef_hasPart: '📎 Files', // schema.org — https://schema.org/hasPart
  isRef_sameAs: '🔗 Alternative license location', // schema.org — https://schema.org/sameAs
  isRef_license: '📜 License', // schema.org — https://schema.org/license
  isRef_author: '👤 Author', // schema.org — https://schema.org/author
  isRef_publisher: '🏛️ Publisher', // schema.org — https://schema.org/publisher
  width: '📏 Width (cm)', // schema.org — https://schema.org/width
  height: '📏 Height (cm)', // schema.org — https://schema.org/height
  depth: '📏 Depth (cm)', // schema.org — https://schema.org/depth
  material: '🧵 Material', // schema.org — https://schema.org/material
  datePublished: '📅 Date Published', // schema.org — https://schema.org/datePublished
  identifier: '🔢 External ID', // schema.org — https://schema.org/identifier
  // LDaCA FIELDS
  'isRef_ldac:subjectLanguage': '🗣️ Subject Languages', // LDaCA — https://w3id.org/ldac/terms#subjectLanguage
  'ldac:metadataIsPublic': '🌐 Public Metadata', // LDaCA — https://w3id.org/ldac/terms#metadataIsPublic
  // CUSTOM FIELDS
  dateCreatedApproximate: '📅 Approximate Date', // custom — human-readable approximate date; no standard term
  dateAdded: '🗓️ Date Added', // custom — no schema.org equivalent (cf. https://schema.org/dateCreated)
  isRef_enteredBy: '✍️ Entered By', // custom — data-entry attribution; no schema.org equivalent
  isPublishable: '🌐 Publish', // custom — app publishing flag
  isRef_image: '🖼️ Img', // schema.org — https://schema.org/image (isRef_ → reference to an ImageObject/File)
  languageCode: '🔤 Language Code', // custom — no schema.org equivalent (cf. https://schema.org/Language)
  isRef_holdingOrganisation: '🏛️ Holding Organisation', // custom — no schema.org equivalent
  // PCDM FIELDS
  'isRef_pcdm:memberOf': '🗂️ Part of Collection', // PCDM — https://pcdm.org/models#memberOf (prefix not yet in @context)
  // DUBLIN CORE FIELDS
  'dcterms:provenance': '📜 Provenance', // Dublin Core — http://purl.org/dc/terms/provenance
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
  'dcterms:provenance':
    'The history of ownership and custody of this item — how it came to be in this archive. ',
  latitude:
    "The latitude of the item's location, in decimal degrees. The range of valid values is -90 to 90. ",
  longitude:
    "The longitude of the item's location, in decimal degrees. The range of valid values is -180 to 180.",
  isRef_image:
    'A single image that represents this item in the archive. This is additional to any files attached to the item, and is used as a thumbnail in lists and search results.',
  isRef_license:
    'The license that governs how this collection may be reused. Choose one from the licenses defined in your archive.',
  isRef_author:
    'The person who authored this collection. Choose one from the people defined in your archive.',
  isRef_publisher:
    'The organization that published this collection. Choose one from the organisations defined in your archive.',
  datePublished:
    'The date this collection was published, as a full date (YYYY-MM-DD).',
  'isRef_ldac:subjectLanguage':
    'The language(s) this collection is about — its subject matter — as opposed to the language(s) it is written or spoken in. Choose from the languages defined in your archive.',
  'ldac:metadataIsPublic':
    'Whether this collection’s metadata (its catalogue description — not the data files themselves) may be shown publicly. Off by default; tick it only if the descriptive metadata is cleared for public view.',
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
