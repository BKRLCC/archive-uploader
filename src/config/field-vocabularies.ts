export type ControlledVocabularySource =
  | 'People'
  | 'Places'
  | 'Licenses'
  | 'RepositoryCollection'

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
  MULTI_SELECT_FIELDS.has(fieldName)

export const getControlledVocabularyForField = (
  fieldName: string,
): ControlledVocabularySource | null => {
  return FIELD_VOCABULARIES[fieldName] ?? null
}

export const isControlledVocabularyField = (fieldName: string): boolean => {
  return getControlledVocabularyForField(fieldName) !== null
}
