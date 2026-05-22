export type ControlledVocabularySource =
  | 'People'
  | 'Places'
  | 'Licenses'
  | 'RepositoryCollection'
  | 'Tags'

export const TAG_FIELD_PREFIX = 'isRef_tag_'

export const normalizeTagVocabularyKey = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '')

export const getTagVocabularyKeyFromField = (
  fieldName: string,
): string | null => {
  if (!fieldName.startsWith(TAG_FIELD_PREFIX)) return null
  const rawSuffix = fieldName.slice(TAG_FIELD_PREFIX.length)
  const normalized = normalizeTagVocabularyKey(rawSuffix)
  return normalized || null
}

// Display labels are for humans; persisted cell values remain the target entity @id.
export const FIELD_VOCABULARIES: Record<string, ControlledVocabularySource> = {
  isRef_creator: 'People',
  isRef_contributor: 'People',
  isRef_mentions: 'People', // People referenced or depicted (schema:mentions)
  isRef_geo: 'Places',
  isRef_sameAs: 'Licenses',
  isRef_isPartOf: 'RepositoryCollection',
}

// Multi-select fields (comma-separated @ids)
export const MULTI_SELECT_FIELDS = new Set<string>([
  'isRef_creator',
  'isRef_contributor',
  'isRef_mentions',
])

export const isMultiSelectField = (fieldName: string): boolean =>
  MULTI_SELECT_FIELDS.has(fieldName) || getTagVocabularyKeyFromField(fieldName) !== null

export const getControlledVocabularyForField = (
  fieldName: string,
): ControlledVocabularySource | null => {
  if (getTagVocabularyKeyFromField(fieldName)) return 'Tags'
  return FIELD_VOCABULARIES[fieldName] ?? null
}

export const isControlledVocabularyField = (fieldName: string): boolean => {
  return getControlledVocabularyForField(fieldName) !== null
}
