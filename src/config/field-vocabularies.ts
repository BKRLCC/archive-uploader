export type ControlledVocabularySource =
  | 'People'
  | 'Places'
  | 'Licenses'
  | 'RepositoryCollection'

// Display labels are for humans; persisted cell values remain the target entity @id.
export const FIELD_VOCABULARIES: Record<string, ControlledVocabularySource> = {
  isRef_creator: 'People',
  isRef_contributor: 'People',
  isRef_geo: 'Places',
  isRef_sameAs: 'Licenses',
  isRef_isPartOf: 'RepositoryCollection',
}

export const getControlledVocabularyForField = (
  fieldName: string,
): ControlledVocabularySource | null => {
  return FIELD_VOCABULARIES[fieldName] ?? null
}

export const isControlledVocabularyField = (fieldName: string): boolean => {
  return getControlledVocabularyForField(fieldName) !== null
}
