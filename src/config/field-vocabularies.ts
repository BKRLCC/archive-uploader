export type ControlledVocabularySource =
  | 'People'
  | 'Languages'
  | 'Places'
  | 'Localities'
  | 'Licenses'
  | 'RepositoryCollection'
  | 'Tags'
  | 'Organization'

export const TAG_FIELD_PREFIX = 'isRef_tag_'

export const normalizeTagVocabularyKey = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '')

export const getTagVocabularyKeyFromField = (
  fieldName: string,
): string | null => {
  const normalizedFieldName = String(fieldName ?? '').trim()
  if (!normalizedFieldName) return null

  const prefixLower = TAG_FIELD_PREFIX.toLowerCase()
  if (!normalizedFieldName.toLowerCase().startsWith(prefixLower)) return null

  const rawSuffix = normalizedFieldName.slice(TAG_FIELD_PREFIX.length)
  const normalized = normalizeTagVocabularyKey(rawSuffix)
  return normalized || null
}

// Display labels are for humans; persisted cell values remain the target entity @id.
export const FIELD_VOCABULARIES: Record<string, ControlledVocabularySource> = {
  isRef_inLanguage: 'Languages',
  isRef_creator: 'People',
  isRef_contributor: 'People',
  isRef_enteredBy: 'People',
  isRef_mentions: 'People', // People referenced or depicted (schema:mentions)
  isRef_contentLocation: 'Places',
  isRef_locationCreated: 'Places',
  isRef_location: 'Places',
  isRef_geo: 'Localities',
  isRef_sameAs: 'Licenses',
  isRef_license: 'Licenses',
  isRef_isPartOf: 'RepositoryCollection',
  isRef_holdingOrganisation: 'Organization',
}

// Multi-select fields (comma-separated @ids)
export const MULTI_SELECT_FIELDS = new Set<string>([
  'isRef_inLanguage',
  'isRef_creator',
  'isRef_contributor',
  'isRef_mentions',
  'isRef_contentLocation',
  'isRef_locationCreated',
  'isRef_location',
  'isRef_geo',
])

export const isMultiSelectField = (fieldName: string): boolean =>
  MULTI_SELECT_FIELDS.has(fieldName) ||
  getTagVocabularyKeyFromField(fieldName) !== null

export const getControlledVocabularyForField = (
  fieldName: string,
): ControlledVocabularySource | null => {
  if (getTagVocabularyKeyFromField(fieldName)) return 'Tags'
  return FIELD_VOCABULARIES[fieldName] ?? null
}

export const isControlledVocabularyField = (fieldName: string): boolean => {
  return getControlledVocabularyForField(fieldName) !== null
}
